import os

# Telegram — obrigatório: configure no Render como env vars
TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")
TELEGRAM_ENABLED: bool = os.getenv("TELEGRAM_ENABLED", "true").lower() == "true"

# CORS — domínio do frontend (ex: https://hyperliquid-frontend.onrender.com)
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Banco de dados PostgreSQL
DATABASE_URL: str = os.getenv("DATABASE_URL", "")
