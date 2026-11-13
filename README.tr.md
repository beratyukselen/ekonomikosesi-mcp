# ekonomikosesi-mcp

🇬🇧 English: [README.md](README.md)

**[Ekonomi Köşesi](https://ekonomikosesi.com)** için açık kaynaklı [Model Context Protocol (MCP)](https://modelcontextprotocol.io) sunucusu — Ekonomi Köşesi haberlerine, Borsa İstanbul (BIST) hisselerine ve KAP bildirimlerine, TEFAS yatırım fonlarına, ulusal gazete manşet arşivine ve resmî platform durum kayıtlarına kimlik doğrulamasız, salt okunur erişim sunar.

İki farklı şekilde kullanılabilir:
1. **Yerel `stdio` sunucusu** (sıfır dış bağımlılık, Node.js 18+) — Claude Desktop gibi yerel `stdio` tabanlı MCP istemcilerini Ekonomi Köşesi'ne bağlar.
2. **Uzak Streamable HTTP** — yerel kurulum gerektirmeden doğrudan `https://ekonomikosesi.com/api/mcp` uç noktasına bağlanılabilir.

---

## Hızlı Başlangıç

### Seçenek A — Yerel `stdio` (Claude Desktop, Cursor, MCP Inspector vb.)

**Node.js 18+** gerektirir. Herhangi bir API anahtarı olmadan `npx` ile doğrudan GitHub üzerinden çalıştırabilirsiniz:

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

Veya depoyu klonlayıp yerel olarak çalıştırabilirsiniz:

```bash
git clone https://github.com/beratyukselen/ekonomikosesi-mcp.git
cd ekonomikosesi-mcp
npm test
node bin/ekonomikosesi-mcp.js
```

### Seçenek B — Uzak Streamable HTTP (Yerel Süreç Olmadan)

Streamable HTTP destekleyen istemciler doğrudan `https://ekonomikosesi.com/api/mcp` adresine bağlanabilir:

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

## Sunulan Araçlar (26 Araç)

### Finans & Piyasalar (BIST & TEFAS)
| Araç | Açıklama |
| --- | --- |
| `search_financial_assets` | Aktif BIST hisselerini ve TEFAS fonlarını kod veya ad ile arar. |
| `get_market_overview` | BIST endeksleri ve öne çıkan hisse hareketleri özeti. |
| `get_stock_quote` | Kayıtlı son hisse fiyatı, günlük değişim ve temel şirket bilgileri. |
| `get_stock_history` | BIST hissesi için kayıtlı geçmiş günlük kapanışlar (`30`, `90`, `180`, `365`, `730` gün). |
| `get_stock_financials` | Dönem ve birim bilgileriyle kayıtlı şirket finansal tabloları. |
| `list_company_disclosures` | Şirketin kayıtlı güncel KAP bildirimleri. |
| `get_fund_details` | TEFAS fon künyesi, birim fiyat, kategori, yönetim ücreti, risk değeri ve varlık dağılımı. |
| `get_fund_history` | TEFAS fonu için günlük gerçek birim fiyat geçmişi. |
| `get_fund_returns` | Dönemsel fon getirileri (`1g`, `1h`, `1a`, `3a`, `6a`, `yb`, `1y`, `3y`, `5y`). |
| `compare_funds` | 2–5 farklı TEFAS fonunu aynı dönemle yan yana karşılaştırır. |
| `list_fund_leaders` | Dönem ve kategori bazında en çok kazandıran/kaybettiren fonlar. |
| `get_fund_holdings` | Fonun açıklanan en büyük hisse senedi pozisyonları. |

### Haber & Gündem
| Araç | Açıklama |
| --- | --- |
| `get_site_front_page` | Ekonomi Köşesi'nin güncel manşet ve ön sayfa haber dizilimi. |
| `get_latest_news` | En yeniden eskiye yayımlanmış son haberler. |
| `search_news` | Haber arşivinde anahtar kelime araması. |
| `get_category_news` | Belirli bir kategorideki güncel haberler (`ekonomi`, `finans`, `piyasa`, `teknoloji` vb.). |
| `list_categories` | Aktif üst seviye haber kategorileri. |
| `get_article` | Haber ID'sine göre tam Markdown metni, yazar, kategori ve kanonik bağlantı. |
| `search` | `fetch` ile uyumlu özet arama sonuçları. |
| `fetch` | `search` sonucundaki ID için tam haber metni ve üst veri. |

### Ulusal Gazete Manşet Arşivi
| Araç | Açıklama |
| --- | --- |
| `list_newspapers` | Arşivdeki gazeteler, slug değerleri ve ilk/son mevcut arşiv tarihleri. |
| `get_newspaper_headlines` | Seçilen tarihin (`YYYY-MM-DD`) kayıtlı gazete ön sayfaları ve bağlantıları. |
| `get_newspaper_front_page` | İstenen gazete ve tarihin tam ön sayfa görseli (MCP `image` ve kanonik bağlantı olarak). |

### Platform Durumu & Kesinti Kayıtları
| Araç | Açıklama |
| --- | --- |
| `list_platform_statuses` | Sosyal medya, yapay zekâ ve bulut servislerinin resmî durum kaynaklarındaki son kontrolü. |
| `get_platform_status` | Tek bir platformun son kontrol durumu, aktif olayları ve zaman çizelgesi. |
| `list_service_incidents` | Resmî kaynaklarca bildirilen kesinti ve olayların tarih/platform bazlı listesi. |

---

## Ajan Becerileri (Agent Skills) & Keşif

Herkese açık ajan becerileri ve kullanım kuralları:
- Beceri indeksi: `https://ekonomikosesi.com/.well-known/agent-skills/index.json`
- Geliştirici dokümantasyonu: `https://ekonomikosesi.com/api/mcp`
- Ajan kuralları: `https://ekonomikosesi.com/AGENTS.md`

## Kotalar & Veri Politikası

- Kimlik doğrulama veya API anahtarı gerektirmez; salt okunurdur.
- Genel kota: IP başına **120 istek/dakika** (haber arama: 60/dk, finans: 30/dk, gazete: 60/dk, ön sayfa görseli: 10/dk).
- Finansal araçlar anlık borsa akışı yerine `data_date` ve `record_updated_at` alanlarıyla açıkça tarihlenen kayıtlı verileri sunar.

## Lisans

[MIT](LICENSE)
