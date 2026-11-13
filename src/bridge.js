'use strict';

const readline = require('node:readline');
const pkg = require('../package.json');

const DEFAULT_ENDPOINT = 'https://ekonomikosesi.com/api/mcp';
const DEFAULT_TIMEOUT_MS = 30_000;

function validateEndpointUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid MCP endpoint URL: ${rawUrl}`);
  }
  const isLocalhost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '[::1]';

  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocalhost)) {
    throw new Error(`MCP endpoint must use https:// (got ${parsed.protocol}//${parsed.host})`);
  }
  return parsed.toString();
}

function parseSseMessages(sseText) {
  const normalized = sseText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split('\n\n');
  const messages = [];

  for (const block of blocks) {
    if (!block.trim()) continue;
    const dataLines = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).replace(/^ /, ''));
      }
    }
    if (dataLines.length === 0) continue;
    const payload = dataLines.join('\n').trim();
    if (!payload) continue;
    messages.push(JSON.parse(payload));
  }

  return messages;
}

function normalizeServerInfo(message) {
  if (
    message &&
    typeof message === 'object' &&
    message.result &&
    typeof message.result === 'object' &&
    message.result.serverInfo &&
    typeof message.result.serverInfo === 'object'
  ) {
    return {
      ...message,
      result: {
        ...message.result,
        serverInfo: {
          ...message.result.serverInfo,
          name: 'ekonomikosesi-mcp'
        }
      }
    };
  }
  return message;
}

function attachRequestId(message, requestId) {
  if (
    message &&
    typeof message === 'object' &&
    !Array.isArray(message) &&
    (message.id === null || message.id === undefined) &&
    requestId !== undefined
  ) {
    return { ...message, id: requestId };
  }
  return message;
}

function jsonRpcError(id, code, message, data) {
  const err = { code, message };
  if (data !== undefined) err.data = data;
  return {
    jsonrpc: '2.0',
    id: id === undefined ? null : id,
    error: err
  };
}

async function forwardJsonRpc(message, options = {}) {
  const endpoint = validateEndpointUrl(options.endpoint || DEFAULT_ENDPOINT);
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const isNotification =
    message &&
    typeof message === 'object' &&
    !Array.isArray(message) &&
    !Object.prototype.hasOwnProperty.call(message, 'id');

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'User-Agent': `ekonomikosesi-mcp/${pkg.version}`
      },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err) {
    if (isNotification) return [];
    const reason = err && err.name === 'TimeoutError'
      ? `Upstream MCP request timed out after ${timeoutMs}ms.`
      : `Failed to reach upstream MCP endpoint: ${err && err.message ? err.message : String(err)}`;
    return [jsonRpcError(message.id, -32000, reason)];
  }

  if (isNotification || response.status === 202 || response.status === 204) {
    return [];
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const retryAfter = response.headers.get('retry-after');
  const rawBody = await response.text();

  if (contentType.includes('text/event-stream')) {
    try {
      const parsedMessages = parseSseMessages(rawBody);
      if (parsedMessages.length > 0) {
        return parsedMessages.map((msg) =>
          normalizeServerInfo(attachRequestId(msg, message.id))
        );
      }
    } catch {
      return [
        jsonRpcError(message.id, -32603, 'Invalid SSE payload received from upstream MCP server.')
      ];
    }
  }

  if (rawBody.trim()) {
    try {
      const parsed = JSON.parse(rawBody);
      const normalized = normalizeServerInfo(attachRequestId(parsed, message.id));
      if (
        !response.ok &&
        retryAfter &&
        normalized.error &&
        typeof normalized.error.message === 'string' &&
        !normalized.error.message.includes('Retry-After')
      ) {
        normalized.error = {
          ...normalized.error,
          message: `${normalized.error.message} (Retry-After: ${retryAfter}s)`
        };
      }
      return [normalized];
    } catch {
      // Fall through to generic HTTP status error below.
    }
  }

  const statusSuffix = retryAfter ? ` (Retry-After: ${retryAfter}s)` : '';
  return [
    jsonRpcError(
      message.id,
      -32000,
      `Upstream MCP server returned HTTP ${response.status}${statusSuffix}.`
    )
  ];
}

function startStdioBridge(options = {}) {
  const input = options.input || process.stdin;
  const output = options.output || process.stdout;
  const endpoint = validateEndpointUrl(
    options.endpoint || process.env.EKONOMIKOSESI_MCP_URL || DEFAULT_ENDPOINT
  );
  const timeoutMs =
    Number(options.timeoutMs || process.env.EKONOMIKOSESI_MCP_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

  const writeMessage = (msg) => {
    output.write(`${JSON.stringify(msg)}\n`);
  };

  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity,
    terminal: false
  });

  const inFlight = new Set();
  let inputClosed = false;

  const maybeFinish = () => {
    if (inputClosed && inFlight.size === 0 && typeof options.onFinish === 'function') {
      options.onFinish();
    }
  };

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      writeMessage(jsonRpcError(null, -32700, 'Parse error: invalid JSON on stdin.'));
      return;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      writeMessage(
        jsonRpcError(
          null,
          -32600,
          'Invalid Request: JSON-RPC batching or non-object payloads are not supported.'
        )
      );
      return;
    }

    const task = forwardJsonRpc(parsed, {
      endpoint,
      timeoutMs,
      fetchImpl: options.fetchImpl
    })
      .then((responses) => {
        for (const res of responses) {
          writeMessage(res);
        }
      })
      .catch((err) => {
        if (Object.prototype.hasOwnProperty.call(parsed, 'id')) {
          writeMessage(
            jsonRpcError(
              parsed.id,
              -32603,
              `Internal bridge error: ${err && err.message ? err.message : String(err)}`
            )
          );
        }
      })
      .finally(() => {
        inFlight.delete(task);
        maybeFinish();
      });

    inFlight.add(task);
  });

  rl.on('close', () => {
    inputClosed = true;
    maybeFinish();
  });

  return rl;
}

module.exports = {
  DEFAULT_ENDPOINT,
  DEFAULT_TIMEOUT_MS,
  validateEndpointUrl,
  parseSseMessages,
  forwardJsonRpc,
  startStdioBridge
};
