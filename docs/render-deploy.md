# Deploy no Render

## Pré-requisitos

- Conta no [Render.com](https://render.com)
- Novo Token do Telegram Bot (revogue o anterior se estava exposto)
- Repositório conectado ao Render

## ⚠️ IMPORTANTE: Revogar credenciais expostas

O token antigo do Telegram estava hardcoded em repositórios públicos.
**Antes de qualquer deploy:**

1. Acesse @BotFather no Telegram
2. Envie `/revoke` e selecione seu bot
3. Use o novo token no Render (nunca no código)

## Opção 1: Deploy via render.yaml (recomendado)

O arquivo `render.yaml` na raiz do repositório configura automaticamente:
- Backend (FastAPI)
- Frontend (React static)
- Banco de dados PostgreSQL

1. No Render dashboard: **New → Blueprint**
2. Conecte o repositório `hyperliquid-whale-tracker`
3. O Render detectará o `render.yaml` automaticamente
4. Configure as env vars marcadas como `sync: false`:

| Serviço | Variável | Valor |
|---------|----------|-------|
| Backend | `TELEGRAM_BOT_TOKEN` | novo token do BotFather |
| Backend | `TELEGRAM_CHAT_ID` | seu chat ID |
| Backend | `FRONTEND_URL` | URL do frontend (ex: https://hyperliquid-frontend.onrender.com) |
| Frontend | `REACT_APP_API_URL` | URL do backend (ex: https://hyperliquid-backend.onrender.com) |

O `DATABASE_URL` é injetado automaticamente pelo Render.

## Opção 2: Deploy manual (serviços separados)

### Backend

1. **New → Web Service**
2. Root Directory: `backend`
3. Environment: Python
4. Build: `pip install -r requirements.txt`
5. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Env vars: (veja tabela acima)

### Frontend

1. **New → Static Site**
2. Root Directory: `frontend`
3. Build: `npm install && npm run build`
4. Publish: `./build`
5. Env var: `REACT_APP_API_URL=https://hyperliquid-backend.onrender.com`

### Banco de dados

1. **New → PostgreSQL**
2. Nome: `hyperliquid-db`
3. Copie o Internal Connection String para `DATABASE_URL` do backend

## Verificação pós-deploy

```bash
# Substituir pela URL real do seu backend
BASE=https://hyperliquid-backend.onrender.com

curl $BASE/health
curl $BASE/whales
curl $BASE/telegram/status
```

## Keep-alive (evitar sleep no free tier)

Configure um cron job externo (ex: cron-job.org) para pingar a cada 10 minutos:
```
https://hyperliquid-backend.onrender.com/keep-alive
```

## Rollback

O deploy anterior (repositórios separados) continua funcionando em:
- `https://hyperliquid-whale-backend.onrender.com`

Para reverter: não mude as configurações do Render — o antigo serviço continua rodando.
