# ekonomikosesi-mcp

🇹🇷 Türkçesi: [README.tr.md](README.tr.md)

Open-source [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for **[Ekonomi Köşesi](https://ekonomikosesi.com)** — providing read-only, unauthenticated access to Turkish financial news, Borsa İstanbul (BIST) equities and KAP disclosures, TEFAS mutual funds, national newspaper front-page archives, and official platform status monitors.

Works in two ways:
1. **Local `stdio` server** (zero external dependencies, Node.js 18+) — bridges standard `stdio` MCP clients (such as Claude Desktop) to Ekonomi Köşesi.
2. **Direct Remote Streamable HTTP** — connect directly to `https://ekonomikosesi.com/api/mcp` with no local install required.

---

## Quick Start

### Option A — Local `stdio` (Claude Desktop, Cursor, MCP Inspector, etc.)

Requires **Node.js 18+**. Run directly from GitHub via `npx` (no API key required):

```json
{
  "mcpServers": {
    "ekonomikosesi": {
      "command": "npx",
      "args": ["-y", "github:beratyukselen/ekonomikosesi-mcp"]
    }
  }
}
```

Or clone and run locally:

```bash
git clone https://github.com/beratyukselen/ekonomikosesi-mcp.git
cd ekonomikosesi-mcp
npm test
node bin/ekonomikosesi-mcp.js
```

### Option B — Remote Streamable HTTP (No Local Process)

Clients that natively support Streamable HTTP can connect directly to `https://ekonomikosesi.com/api/mcp`:

**Claude Code (`.mcp.json`):**
```json
{
  "mcpServers": {
    "ekonomikosesi": {
      "type": "http",
      "url": "https://ekonomikosesi.com/api/mcp"
    }
  }
}
```

**Cursor (`.cursor/mcp.json`):**
```json
{
  "mcpServers": {
    "ekonomikosesi": {
      "url": "https://ekonomikosesi.com/api/mcp"
    }
  }
}
```

**Gemini CLI (`~/.gemini/settings.json`):**
```json
{
  "mcpServers": {
    "ekonomikosesi": {
      "httpUrl": "https://ekonomikosesi.com/api/mcp"
    }
  }
}
```

**Codex (`~/.codex/config.toml`):**
```toml
[mcp_servers.ekonomikosesi]
url = "https://ekonomikosesi.com/api/mcp"
```

---

## Available Tools (26)

### Finance & Markets (BIST & TEFAS)
| Tool | Description |
| --- | --- |
| `search_financial_assets` | Search active BIST equities and TEFAS mutual funds by ticker/code or name. |
| `get_market_overview` | Market overview of active BIST indices and top equity movers. |
| `get_stock_quote` | Stored latest price, daily change, and profile metadata for a BIST equity. |
| `get_stock_history` | Historical daily closing prices for a BIST symbol (`30`, `90`, `180`, `365`, `730` days). |
| `get_stock_financials` | Company financial statements with reporting periods and units. |
| `list_company_disclosures` | Recent KAP (Public Disclosure Platform) filings for a BIST symbol. |
| `get_fund_details` | TEFAS fund profile, unit price, category, management fee, risk score, and asset allocation. |
| `get_fund_history` | Historical daily unit prices for a TEFAS fund. |
| `get_fund_returns` | Periodic fund returns (`1g`, `1h`, `1a`, `3a`, `6a`, `yb`, `1y`, `3y`, `5y`). |
| `compare_funds` | Side-by-side comparison of 2–5 TEFAS funds over a matching period. |
| `list_fund_leaders` | Top gaining or losing TEFAS funds by period and category. |
| `get_fund_holdings` | Largest disclosed equity holdings of a fund. |

### News & Editorial
| Tool | Description |
| --- | --- |
| `get_site_front_page` | Ordered lead stories and headlines from Ekonomi Köşesi's live front page. |
| `get_latest_news` | Newest published articles ordered from newest to oldest. |
| `search_news` | Keyword search across published articles. |
| `get_category_news` | Recent articles in a specific category (`ekonomi`, `finans`, `piyasa`, `teknoloji`, etc.). |
| `list_categories` | Active top-level news categories. |
| `get_article` | Full Markdown content, author, category, and canonical URL by numeric article ID. |
| `search` | Discovery search returning concise snippets and stable IDs for `fetch`. |
| `fetch` | Full canonical article text and metadata for an ID returned by `search`. |

### Turkish Newspaper Front-Page Archives
| Tool | Description |
| --- | --- |
| `list_newspapers` | Available national newspapers, slugs, and earliest/latest archive dates. |
| `get_newspaper_headlines` | Recorded newspaper front pages and source links for a given date (`YYYY-MM-DD`). |
| `get_newspaper_front_page` | Full front-page image (returned inline as MCP `image` + canonical URL) for a newspaper and date. |

### Platform Status & Incidents
| Tool | Description |
| --- | --- |
| `list_platform_statuses` | Latest official status checks across major cloud, AI, and social platforms. |
| `get_platform_status` | Detailed status, active incidents, and recent timeline for a single platform. |
| `list_service_incidents` | Filter reported service incidents by date range, platform, or active state. |

---

## Agent Skills & Discovery

Public agent skills and usage policies are published at:
- Skill index: `https://ekonomikosesi.com/.well-known/agent-skills/index.json`
- Developer documentation: `https://ekonomikosesi.com/api/mcp`
- Agent guidelines: `https://ekonomikosesi.com/AGENTS.md`

## Rate Limits & Data Policy

- Read-only and free to use without authentication or API keys.
- General budget: **120 requests/min** per IP (search: 60/min, finance: 30/min, newspapers: 60/min, front-page image: 10/min).
- Financial tools serve stored database records with explicit `data_date` and `record_updated_at` timestamps rather than real-time exchange ticks.

## License

[MIT](LICENSE)
