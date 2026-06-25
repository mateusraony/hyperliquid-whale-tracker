# Tracker v1 — Legado

Este diretório contém os arquivos originais do repositório `hyperliquid-whale-tracker`
antes da migração para o monorepo.

## Por que é legado?

O tracker v1 era um script Python simples (loop assíncrono) que:
- Monitorava wallets via Hyperliquid API
- Enviava alertas no Telegram
- Não tinha banco de dados
- Não tinha API REST

Toda essa lógica foi absorvida pelo **backend** (`backend/`) que usa:
- FastAPI + APScheduler (monitoramento a cada 30s)
- PostgreSQL para persistência
- Endpoints REST completos
- AI analytics

## Arquivos

- `main.py` — lógica principal do tracker
- `config.py` — configurações (continha credenciais hardcoded — REMOVIDAS no novo backend)
- `hyperliquid_api.py` — cliente da API Hyperliquid
- `telegram_bot.py` — integração Telegram
- `health_check.py` — health check simples para o Render
- `requirements.txt` — dependências Python
- `README.md` / `FAQ.md` / `GUIA-COMPLETO.md` — documentação original

## Rollback

Se precisar voltar ao tracker v1:
1. Copie os arquivos deste diretório para a raiz do repositório
2. No Render, configure o serviço com:
   - Build: `pip install -r requirements.txt`
   - Start: `python main.py`
   - Env vars: `TELEGRAM_TOKEN`, `CHAT_ID`
