# Hyperliquid Whale Tracker — Monorepo

Dashboard de monitoramento de grandes posições (whales) na exchange descentralizada Hyperliquid.

## Estrutura

```
hyperliquid-whale-tracker/
├── frontend/                   # React 18 + Tailwind + Recharts
├── backend/                    # FastAPI + PostgreSQL + APScheduler
│   ├── config/settings.py      # variáveis de ambiente centralizadas
│   ├── db/database.py          # pool asyncpg + tabelas
│   ├── models/schemas.py       # modelos Pydantic
│   ├── services/               # Hyperliquid API + Telegram Bot
│   ├── jobs/monitor.py         # job APScheduler (30s)
│   └── routes/                 # endpoints REST
├── docs/
│   ├── legacy/tracker-v1/      # código original do tracker Python simples
│   ├── local-dev.md
│   └── render-deploy.md
├── render.yaml                 # blueprint Render (backend + frontend + db)
└── .env.example                # template de variáveis de ambiente
```

## Deploy rápido

Veja [docs/render-deploy.md](docs/render-deploy.md) para deploy no Render.com.

Veja [docs/local-dev.md](docs/local-dev.md) para rodar localmente.

## Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | status do sistema |
| GET | `/keep-alive` | evita sleep no Render free tier |
| GET | `/whales` | lista de whales monitoradas |
| POST | `/whales` | adicionar whale |
| DELETE | `/whales/{address}` | remover whale |
| GET | `/whales/{address}` | dados de uma whale |
| GET | `/telegram/status` | status do bot Telegram |
| POST | `/telegram/send-resume` | enviar resumo via Telegram |
| GET | `/api/database/health` | saúde do banco de dados |
| GET | `/api/database/backup` | exportar backup JSON |
| GET | `/api/database/trades` | histórico de trades |
| GET | `/api/ai/whale-scores` | scores das whales |
| GET | `/api/ai/market-sentiment` | sentimento de mercado |
| GET | `/api/ai/whale-correlation` | correlação entre whales |
| GET | `/api/ai/predictive-signals` | sinais preditivos |

## Variáveis de ambiente

Copie `.env.example` e preencha com suas credenciais:

```bash
cp .env.example .env.local
```

Nunca commite credenciais reais. Veja `.env.example` para a lista completa.

## Checklist de migração

### Migrado
- Todos os 14 endpoints do backend
- Monitoramento automático (APScheduler, 30s) sem worker externo
- Integração Telegram
- PostgreSQL + 4 tabelas (trades, liquidations, wallet_snapshots, alert_state)
- Frontend React com auto-refresh e dashboard completo

### Corrigido
- CORS aberto `["*"]` → restrito a `FRONTEND_URL` (env var)
- Credenciais hardcoded → env vars obrigatórias (sem fallbacks de token real)
- URL hardcoded no frontend → `process.env.REACT_APP_API_URL`
- Endpoints quebrados `/monitoring/*` → removidos; substituído por `/health`
- Import path do frontend (`./api-service` → `../api-service`)
- Default export ausente em `api-service.js`
- Mismatch de campos backend/frontend → `normalizeWhale()` em `api-service.js`

### Legado (preservado)
- `docs/legacy/tracker-v1/` — tracker Python simples original (loop async, sem banco, sem FastAPI)

### Marcado como mock
- `liquidationData` no frontend (valores 1D/7D/1M fixos) — marcado como `[MOCK DATA]`, TODO: conectar a `/api/database/trades`

### Configurar no Render após deploy
- `TELEGRAM_BOT_TOKEN` — novo token (revogar o anterior que estava exposto)
- `TELEGRAM_CHAT_ID`
- `FRONTEND_URL` — URL do frontend no Render
- `REACT_APP_API_URL` — URL do backend no Render
- `DATABASE_URL` — injetado automaticamente pelo Render se usar banco interno
