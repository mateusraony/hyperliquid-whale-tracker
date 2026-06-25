# Rodando Localmente

## Pré-requisitos

- Python 3.11+
- Node.js 18+
- PostgreSQL (opcional — o sistema funciona sem banco, mas sem métricas)

## 1. Clonar e configurar variáveis

```bash
git clone https://github.com/mateusraony/hyperliquid-whale-tracker.git
cd hyperliquid-whale-tracker
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais reais.

## 2. Rodar o backend

```bash
cd backend
pip install -r requirements.txt

# Exportar variáveis de ambiente
export TELEGRAM_BOT_TOKEN=seu_token
export TELEGRAM_CHAT_ID=seu_chat_id
export TELEGRAM_ENABLED=true
export FRONTEND_URL=http://localhost:3000
# export DATABASE_URL=postgresql://...   (opcional)

uvicorn main:app --reload --port 8000
```

Acesse: http://localhost:8000

Endpoints disponíveis:
- `GET /health` — status
- `GET /whales` — lista de whales
- `GET /` — documentação de todos os endpoints

## 3. Rodar o frontend

Em outro terminal:

```bash
cd frontend
npm install

# Variável de ambiente do frontend
export REACT_APP_API_URL=http://localhost:8000

npm start
```

Acesse: http://localhost:3000

## 4. Verificar funcionamento

```bash
# Backend health
curl http://localhost:8000/health

# Lista de whales (ao vivo)
curl http://localhost:8000/whales

# Status Telegram
curl http://localhost:8000/telegram/status
```

## Dicas de troubleshooting

- **CORS error**: Verifique que `FRONTEND_URL` no backend bate com a URL do frontend
- **Telegram não envia**: Verifique `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`
- **Sem métricas**: O banco (`DATABASE_URL`) não está configurado — funciona sem ele
- **Whales sem dados**: A API da Hyperliquid pode ter timeout — verifique conectividade
