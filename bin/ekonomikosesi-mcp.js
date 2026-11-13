#!/usr/bin/env node
'use strict';

const pkg = require('../package.json');
const { DEFAULT_ENDPOINT, validateEndpointUrl, startStdioBridge } = require('../src/bridge');

function printHelp() {
  process.stdout.write(
    [
      `ekonomikosesi-mcp v${pkg.version}`,
      '',
      'Local stdio Model Context Protocol (MCP) server bridging to Ekonomi Köşesi.',
      '',
      'Usage:',
      '  ekonomikosesi-mcp [--url <endpoint>] [--timeout <ms>]',
      '',
      'Options:',
      `  --url <endpoint>   Override remote Streamable HTTP endpoint (default: ${DEFAULT_ENDPOINT})`,
      '  --timeout <ms>     Per-request timeout in milliseconds (default: 30000)',
      '  -v, --version      Print package version and exit',
      '  -h, --help         Show this help message and exit',
      '',
      'Environment variables:',
      '  EKONOMIKOSESI_MCP_URL         Remote MCP endpoint URL',
      '  EKONOMIKOSESI_MCP_TIMEOUT_MS  Request timeout in milliseconds',
      ''
    ].join('\n')
  );
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg === '-v' || arg === '--version') {
      opts.version = true;
    } else if (arg === '--url') {
      opts.endpoint = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--url=')) {
      opts.endpoint = arg.slice('--url='.length);
    } else if (arg === '--timeout') {
      opts.timeoutMs = Number(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--timeout=')) {
      opts.timeoutMs = Number(arg.slice('--timeout='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (opts.version) {
    process.stdout.write(`${pkg.version}\n`);
    process.exit(0);
  }

  try {
    if (opts.endpoint) validateEndpointUrl(opts.endpoint);
    startStdioBridge(opts);
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }
}

main();
