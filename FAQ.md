# ❓ PERGUNTAS FREQUENTES (FAQ)

---

## 💰 CUSTOS

### Quanto custa rodar esse sistema?
**R: $0 (zero) por mês!** Tudo é 100% gratuito:
- GitHub: Grátis
- Render.com: Plano Free
- Telegram: Grátis
- Hyperliquid API: Grátis

### Tem algum custo oculto?
**R: NÃO!** É tudo gratuito mesmo. O Render.com tem um plano free que roda 24/7.

---

## 📱 TELEGRAM

### Os alertas são ilimitados?
**R: SIM!** Você pode receber quantos alertas quiser, sem limite.

### Posso receber alertas em vários Telegrams?
**R: SIM!** Você pode adicionar vários Chat IDs no config.py.

### Não recebi o alerta de "Sistema Online":
**R:** Envie `/start` para o bot @IAInstitucionalNotifier_bot e aguarde 1-2 minutos.

---

## 🔧 CONFIGURAÇÕES

### Como adicionar mais wallets?
**R:** Edite o arquivo `config.py` e adicione no dicionário `WALLETS`:
```python
WALLETS = {
    "0xSEU_ENDERECO_AQUI": "Nome da Wallet",
}
```

### Como mudar os nomes das wallets?
**R:** Edite o valor (entre aspas) no arquivo `config.py`:
```python
"0x8c58...": "MEU NOME NOVO",  # ← Mude aqui
```

### Como mudar o tempo de verificação?
**R:** Edite em `config.py`:
```python
ALERT_SETTINGS = {
    "check_interval": 10,  # ← Mude de 10 para outro valor (segundos)
}
```

### Como mudar o alerta de liquidação?
**R:** Edite em `config.py`:
```python
ALERT_SETTINGS = {
    "liquidation_threshold": 10,  # ← % de distância para alertar
}
```

---

## 🌐 DEPLOY

### Preciso saber programar?
**R: NÃO!** Só seguir o guia passo a passo. É só fazer upload e clicar em alguns botões.

### Demora quanto tempo para subir?
**R:** 2-3 minutos no total.

### Posso usar outro serviço no lugar do Render?
**R: SIM!** Pode usar:
- Render.com (recomendado)
- Railway.app
- Fly.io
- Heroku (tem plano free limitado)

### O Render vai desligar meu sistema?
**R:** O plano free do Render fica ativo o tempo todo, mas pode dormir depois de 15 minutos sem requests. Por isso adicionei um health check que mantém ele acordado.

---

## 📊 DADOS

### Os dados são em tempo real?
**R: SIM!** O sistema verifica as wallets a cada 10 segundos na API oficial da Hyperliquid.

### Posso ver dados históricos?
**R:** Nesta versão não, mas posso adicionar se você quiser. Me avise!

### Posso monitorar quantas wallets?
**R:** Quantas você quiser! Não tem limite.

---

## ⚡ ALERTAS

### Que tipos de alerta vou receber?

**1. Nova posição aberta:**
- Quando alguém abre LONG ou SHORT
- Mostra: tamanho, alavancagem, entry, liquidação

**2. Posição fechada:**
- Quando alguém fecha uma posição
- Mostra: lucro ou prejuízo (PnL)

**3. Risco de liquidação:**
- Quando está a menos de 10% da liquidação
- Mostra: preço atual, preço de liquidação, distância

### Posso adicionar mais tipos de alerta?
**R: SIM!** Me fale o que você quer e eu adiciono. Por exemplo:
- Alerta de take profit / stop loss
- Alerta de volume alto
- Alerta de mudança de alavancagem
- Alerta de funding rate
- etc.

---

## 🐛 PROBLEMAS

### O sistema parou de funcionar:
**R:** Verifique:
1. Entre no Render → Seu serviço → Logs
2. Veja se tem erro
3. Me mande o erro que eu te ajudo

### Não recebo mais alertas:
**R:** Verifique:
1. Bot do Telegram ainda funciona? Envie `/start`
2. Sistema está rodando no Render?
3. Olhe os logs no Render

### Está muito lento:
**R:** O sistema verifica a cada 10 segundos. Se quiser mais rápido, mude o `check_interval` no config.py para 5 segundos.

### Recebi alerta errado:
**R:** Pode ser que a API da Hyperliquid teve delay. É raro mas pode acontecer.

---

## 🔒 SEGURANÇA

### Minhas credenciais estão seguras?
**R: SIM!** O token do Telegram fica apenas no seu repositório privado do GitHub.

### Alguém pode acessar meus dados?
**R: NÃO!** Só você tem acesso ao repositório e ao Render.

### Preciso dar permissão para o bot?
**R:** Só para enviar mensagens. Ele NÃO tem acesso às suas wallets nem pode fazer trades.

---

## 💡 FUNCIONALIDADES FUTURAS

### O que posso adicionar depois?

Posso adicionar (me avise!):
- ✅ Dashboard web para visualizar tudo
- ✅ Histórico de trades
- ✅ Gráficos de performance
- ✅ Análise de padrões (AI)
- ✅ Copy trading automático
- ✅ Alertas por email
- ✅ Relatórios diários/semanais
- ✅ Simulador de estratégias

---

## 🆘 SUPORTE

### Como entro em contato?
**R:** É só me chamar aqui no Claude! Eu sou seu programador pessoal. 😊

### Você pode adicionar funcionalidades?
**R: SIM!** Me fale o que você quer e eu crio para você.

### Você pode consertar bugs?
**R: SIM!** Me mande o erro que eu resolvo.

---

## 🎓 APRENDIZADO

### Quero entender o código, por onde começar?
**R:** Os arquivos são bem comentados! Comece por:
1. `config.py` (mais simples - suas configurações)
2. `telegram_bot.py` (envia mensagens)
3. `hyperliquid_api.py` (busca dados)
4. `main.py` (lógica principal)

### Posso modificar o código?
**R: SIM!** É seu sistema, modifique como quiser. Se precisar de ajuda, me chame.

---

**Alguma outra dúvida? Me pergunte! 🚀**
