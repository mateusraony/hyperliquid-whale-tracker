# 🚀 GUIA COMPLETO - PASSO A PASSO

## 📥 PASSO 1: BAIXAR OS ARQUIVOS (1 minuto)

1. Baixe TODOS os arquivos desta pasta para seu computador
2. Você terá estes arquivos:
   - `main.py` (código principal)
   - `hyperliquid_api.py` (conexão com Hyperliquid)
   - `telegram_bot.py` (bot do Telegram)
   - `config.py` (suas configurações)
   - `requirements.txt` (bibliotecas)
   - `test.py` (arquivo de teste)
   - `README.md` (documentação)

---

## 🌐 PASSO 2: CRIAR REPOSITÓRIO NO GITHUB (3 minutos)

### Se você NÃO tem conta no GitHub:
1. Entre em: https://github.com
2. Clique em "Sign up"
3. Crie sua conta (é grátis)

### Criar o repositório:
1. Clique no "+" no canto superior direito
2. Clique em "New repository"
3. Nome do repositório: `hyperliquid-whale-tracker`
4. Deixe como **Private** (privado)
5. Clique em "Create repository"

### Upload dos arquivos:
1. Clique em "uploading an existing file"
2. Arraste TODOS os arquivos que você baixou
3. Clique em "Commit changes"

**✅ Pronto! Seus arquivos estão no GitHub!**

---

## ☁️ PASSO 3: DEPLOY NO RENDER.COM (5 minutos)

### 3.1 - Conectar o GitHub ao Render:
1. Entre em: https://render.com
2. Faça login (use "Login with GitHub" - mais fácil)
3. Autorize o Render a acessar seu GitHub

### 3.2 - Criar o Web Service:
1. No dashboard do Render, clique em **"New +"**
2. Selecione **"Web Service"**
3. Clique em **"Connect a repository"**
4. Encontre o repositório `hyperliquid-whale-tracker`
5. Clique em **"Connect"**

### 3.3 - Configurar o serviço:

**Nome:** `hyperliquid-whale-tracker` (ou qualquer nome)

**Region:** `Oregon (US West)` (ou o mais próximo)

**Branch:** `main`

**Runtime:** `Python 3`

**Build Command:**
```
pip install -r requirements.txt
```

**Start Command:**
```
python main.py
```

**Instance Type:** 
- ⚠️ IMPORTANTE: Selecione **"Free"** (não custa nada!)

### 3.4 - Criar o serviço:
1. Role para baixo
2. Clique em **"Create Web Service"**
3. Aguarde 2-3 minutos enquanto faz o deploy

**✅ PRONTO! Seu sistema está ONLINE 24/7!**

---

## 📱 PASSO 4: VERIFICAR SE FUNCIONOU

Você deve receber uma mensagem no Telegram em até 1 minuto:

```
🎉 Sistema Online!
🐋 Monitorando wallets da Hyperliquid
⚡ Alertas automáticos ativados!
```

Se recebeu essa mensagem = **TUDO FUNCIONANDO!** 🎉

---

## ✏️ COMO EDITAR NOMES DAS WALLETS

### Opção 1 - Editar no GitHub (mais fácil):
1. Entre no seu repositório no GitHub
2. Clique no arquivo `config.py`
3. Clique no lápis (editar)
4. Mude os nomes das wallets:

```python
WALLETS = {
    "0x8c58...": "Nome que você quiser",  # ← Edite aqui
    "0x939f...": "Outro nome legal",      # ← Edite aqui
}
```

5. Clique em "Commit changes"
6. O Render vai atualizar automaticamente em 1 minuto!

### Opção 2 - Editar localmente:
1. Edite o arquivo `config.py` no seu computador
2. Faça upload no GitHub novamente
3. O Render atualiza sozinho

---

## 🔔 TIPOS DE ALERTAS QUE VOCÊ VAI RECEBER

### 🟢 Quando alguém ABRE uma posição:
```
🟢 NOVA POSIÇÃO ABERTA!

🐋 Wallet: Whale Alpha
📊 Token: BTC
📈 LONG

💰 Tamanho: $125,000
🎯 Alavancagem: 12x
📍 Entry: $67,234
💀 Liquidação: $61,450

⏰ 14:32:15 UTC
```

### 🔴 Quando alguém FECHA uma posição:
```
✅ POSIÇÃO FECHADA!

🐋 Wallet: Whale Alpha
📊 Token: BTC
📈 LONG

💵 PnL: +$20,482
🎯 Resultado: LUCRO

⏰ 16:45:22 UTC
```

### ⚠️ Quando está perto de ser LIQUIDADO:
```
⚠️⚠️ ALERTA DE LIQUIDAÇÃO! ⚠️⚠️

🐋 Wallet: Whale Alpha
📊 Token: BTC
📈 LONG

📉 Preço Atual: $66,890
💀 Liquidação: $61,450
🚨 Distância: 8.1%

⚡ RISCO ALTO!
⏰ 18:20:33 UTC
```

---

## 🆘 PROBLEMAS COMUNS

### Não recebi mensagem no Telegram:
- Verifique se iniciou conversa com o bot: @IAInstitucionalNotifier_bot
- Envie `/start` para o bot
- Aguarde 2 minutos

### Render deu erro no deploy:
- Verifique se todos os arquivos foram enviados
- Verifique se o `requirements.txt` está correto
- Entre nos logs do Render para ver o erro

### Quero adicionar mais wallets:
- Edite o arquivo `config.py`
- Adicione a nova wallet no dicionário `WALLETS`
- Faça commit no GitHub

---

## 📊 INFORMAÇÕES TÉCNICAS

- **Linguagem:** Python 3.11
- **Custo:** $0/mês (100% gratuito)
- **Uptime:** 24/7 (roda sempre)
- **Latência:** Verifica a cada 10 segundos
- **Alertas:** Ilimitados (sem limite)
- **Wallets:** Pode monitorar quantas quiser

---

## 🎉 TUDO PRONTO!

Seu sistema está rodando 24/7 monitorando as wallets!

Você vai receber alertas automáticos SEMPRE que:
- ✅ Alguém abrir uma posição
- ✅ Alguém fechar uma posição
- ✅ Alguém estiver perto de liquidação
- ✅ Qualquer mudança nas posições

**SEM CUSTO ALGUM! TOTALMENTE AUTOMÁTICO!**

---

## 💡 DICAS EXTRAS

1. **Para ver os logs:** Entre no Render → Seu serviço → Aba "Logs"
2. **Para pausar:** Entre no Render → Settings → Suspend
3. **Para retomar:** Entre no Render → Resume
4. **Para adicionar mais alertas:** Me fale que eu adiciono!

---

**Qualquer dúvida, é só me chamar!** 🚀
