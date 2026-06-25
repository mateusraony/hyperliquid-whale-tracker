# 🐋 HYPERLIQUID WHALE TRACKER - SISTEMA COMPLETO

Sistema de monitoramento 24/7 com alertas automáticos no Telegram.
**100% GRATUITO - 0 custos mensais**

---

## 🎯 O QUE FAZ

✅ Monitora wallets da Hyperliquid em tempo real  
✅ Detecta novas posições (LONG/SHORT)  
✅ Alerta quando posições são fechadas (lucro/prejuízo)  
✅ Avisa sobre risco de liquidação  
✅ Alertas ilimitados no Telegram  
✅ Roda 24/7 automaticamente  

---

## 🚀 COMO SUBIR NO RENDER.COM (5 MINUTOS)

### PASSO 1: Preparar arquivos

1. Baixe todos os arquivos desta pasta
2. Crie uma conta no GitHub (se não tiver)
3. Crie um repositório novo (pode ser privado)
4. Faça upload de todos os arquivos para o GitHub

### PASSO 2: Deploy no Render

1. Entre em: https://render.com
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu GitHub
4. Selecione o repositório que você criou
5. Configure assim:

**Build Command:**
```
pip install -r requirements.txt
```

**Start Command:**
```
python main.py
```

**Environment:** `Python 3`

**Instance Type:** `Free`

6. Clique em **"Create Web Service"**

### PASSO 3: Pronto! 🎉

O sistema vai começar a rodar automaticamente!
Você vai receber um alerta no Telegram confirmando que está online.

---

## ✏️ COMO EDITAR NOMES DAS WALLETS

Abra o arquivo `config.py` e edite a seção `WALLETS`:

```python
WALLETS = {
    "0x8c58...": "Minha Whale Favorita",  # ← Mude o nome aqui
    "0x939f...": "Trader Profissa",       # ← E aqui
    # ...
}
```

Depois faça commit no GitHub e o Render atualiza automaticamente!

---

## 🔔 TIPOS DE ALERTAS QUE VOCÊ RECEBERÁ

### 1️⃣ Nova Posição Aberta
```
🟢 NOVA POSIÇÃO ABERTA!
🐋 Wallet: Sigma Whale
📊 Token: BTC
📈 LONG
💰 Tamanho: $125,000
🎯 Alavancagem: 12x
📍 Entry: $67,234
```

### 2️⃣ Posição Fechada
```
✅ POSIÇÃO FECHADA!
🐋 Wallet: Sigma Whale
📊 Token: BTC
💵 PnL: +$20,482
🎯 Resultado: LUCRO
```

### 3️⃣ Alerta de Liquidação
```
⚠️⚠️ ALERTA DE LIQUIDAÇÃO!
🐋 Wallet: Sigma Whale
📉 Preço Atual: $66,890
💀 Liquidação: $61,450
🚨 Distância: 8.1%
```

---

## 📊 WALLETS MONITORADAS

Você está monitorando **14 wallets**:
- 11 suas wallets personalizadas
- 3 whales famosas da Hyperliquid

---

## ⚙️ CONFIGURAÇÕES

Edite em `config.py`:

- `liquidation_threshold`: Distância % para alertar liquidação
- `check_interval`: Intervalo de verificação (segundos)
- `min_position_value`: Valor mínimo de posição para alertar

---

## 🆘 SUPORTE

Se tiver algum problema, me chame que eu te ajudo!

---

## 🎉 PRONTO!

Seu sistema está rodando 24/7 gratuitamente!
Você vai receber TODOS os alertas automaticamente no Telegram.
