'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { PassThrough } = require('node:stream');
const { spawn } = require('node:child_process');
const path = require('node:path');

const {
  validateEndpointUrl,
  parseSseMessages,
  startStdioBridge
} = require('../src/bridge');

test('validateEndpointUrl enforces https except localhost', () => {
  assert.equal(
    validateEndpointUrl('https://ekonomikosesi.com/api/mcp'),
    'https://ekonomikosesi.com/api/mcp'
  );
  assert.equal(
    validateEndpointUrl('http://127.0.0.1:8080/api/mcp'),
    'http://127.0.0.1:8080/api/mcp'
  );
  assert.throws(() => validateEndpointUrl('http://ekonomikosesi.com/api/mcp'), /must use https/);
  assert.throws(() => validateEndpointUrl('not-a-url'), /Invalid MCP endpoint URL/);
});

test('parseSseMessages extracts JSON-RPC envelopes from SSE stream', () => {
  const sse = [
    'event: message',
    'data: {"jsonrpc":"2.0","id":1,"result":{"ok":true}}',
    '',
    'event: message',
    'data: {"jsonrpc":"2.0","id":2,',
    'data: "result":{"multi":true}}',
    '',
    ''
  ].join('\r\n');

  const msgs = parseSseMessages(sse);
  assert.equal(msgs.length, 2);
  assert.deepEqual(msgs[0], { jsonrpc: '2.0', id: 1, result: { ok: true } });
  assert.deepEqual(msgs[1], { jsonrpc: '2.0', id: 2, result: { multi: true } });
});

test('startStdioBridge handles initialize, notifications, 429 errors, and malformed JSON', async () => {
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));

    if (body.method === 'notifications/initialized') {
      res.writeHead(202);
      res.end();
      return;
    }

    if (body.method === 'initialize') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.end(
        `event: message\ndata: ${JSON.stringify({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            protocolVersion: '2025-03-26',
            capabilities: { tools: {} },
            serverInfo: { name: 'ekonomi_k_esi', version: '1.0.0' }
          }
        })}\n\n`
      );
      return;
    }

    if (body.method === 'rate_limited') {
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': '17'
      });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32000, message: 'MCP rate limit exceeded.' }
        })
      );
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { pong: true } }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const endpoint = `http://127.0.0.1:${port}/api/mcp`;

  try {
    const input = new PassThrough();
    const output = new PassThrough();
    let stdoutText = '';
    output.on('data', (chunk) => {
      stdoutText += chunk.toString('utf8');
    });

    const finished = new Promise((resolve) => {
      startStdioBridge({ input, output, endpoint, onFinish: resolve });
    });

    input.write('not-valid-json\n');
    input.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } }
      })}\n`
    );
    input.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'rate_limited' })}\n`);
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'ping' })}\n`);
    input.end();

    await finished;

    const lines = stdoutText
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));

    assert.equal(lines.length, 4);

    const parseErr = lines.find((m) => m.error && m.error.code === -32700);
    assert.ok(parseErr);

    const initRes = lines.find((m) => m.id === 1);
    assert.equal(initRes.result.serverInfo.name, 'ekonomikosesi-mcp');

    const rateErr = lines.find((m) => m.id === 2);
    assert.match(rateErr.error.message, /Retry-After: 17s/);

    const pingRes = lines.find((m) => m.id === 3);
    assert.deepEqual(pingRes.result, { pong: true });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('CLI stdio binary works end-to-end against live ekonomikosesi.com endpoint', async () => {
  const cliPath = path.resolve(__dirname, '../bin/ekonomikosesi-mcp.js');
  const child = spawn(process.execPath, [cliPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => {
    stdout += d.toString('utf8');
  });
  child.stderr.on('data', (d) => {
    stderr += d.toString('utf8');
  });

  child.stdin.write(
    `${JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'e2e-test', version: '1.0.0' }
      }
    })}\n`
  );
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })}\n`);
  child.stdin.end();

  const exitCode = await new Promise((resolve) => child.on('close', resolve));
  assert.equal(exitCode, 0, `Unexpected stderr: ${stderr}`);

  const responses = stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const initMsg = responses.find((r) => r.id === 1);
  assert.ok(initMsg && initMsg.result, 'Expected initialize result');
  assert.equal(initMsg.result.serverInfo.name, 'ekonomikosesi-mcp');

  const toolsMsg = responses.find((r) => r.id === 2);
  assert.ok(toolsMsg && Array.isArray(toolsMsg.result.tools), 'Expected tools list');
  assert.ok(toolsMsg.result.tools.length >= 20, `Expected >=20 tools, got ${toolsMsg.result.tools.length}`);
});
