"""
⚙️ CONFIGURAÇÕES DO SISTEMA
Edite aqui suas wallets e nomes personalizados
"""

# ===== SUAS CREDENCIAIS DO TELEGRAM =====
TELEGRAM_TOKEN = "7530029075:AAHnQtsx0G08J9ARzouaAdH4skimhCBdCUo"
CHAT_ID = "1411468886"

# ===== WALLETS PARA MONITORAR =====
# Formato: "endereço": "Nome personalizado"
# VOCÊ PODE EDITAR OS NOMES À VONTADE!

WALLETS = {
    # Suas wallets
    "0x8c5865689EABe45645fa034e53d0c9995DCcb9c9": "Whale Alpha",
    "0x939f95036D2e7b6d7419Ec072BF9d967352204d2": "Whale Beta",
    "0x3eca9823105034b0d580dd722c75c0c23829a3d9": "Whale Gamma",
    "0x579f4017263b88945d727a927bf1e3d061fee5ff": "Whale Delta",
    "0x9eec98D048D06D9CD75318FFfA3f3960e081daAb": "Whale Epsilon",
    "0x020ca66c30bec2c4fe3861a94e4db4a498a35872": "Whale Zeta",
    "0xbadbb1de95b5f333623ebece7026932fa5039ee6": "Whale Eta",
    "0x9e4f6D88f1e34d5F3E96451754a87Aad977Ceff3": "Whale Theta",
    "0x8d0E342E0524392d035Fb37461C6f5813ff59244": "Whale Iota",
    "0xC385D2cD1971ADfeD0E47813702765551cAe0372": "Whale Kappa",
    "0x5b5d51203a0f9079f8aeb098a6523a13F298C060": "Whale Lambda",
    
    # Whales famosas da Hyperliquid (adicionei para você)
    "0x010461C14e146ac35Fe42271BDC1134EE31C703a": "Sigma Whale 🐋",
    "0x00c6d7c0b3a5d6e8f3c4f1f6f3d3e5c7e9f1a3b5": "Diamond Hands 💎",
    "0x742d35Ade9F537685a8C1D64E456d4dEd35Ad234": "The Sniper 🎯",
}

# ===== CONFIGURAÇÕES DE ALERTAS =====
ALERT_SETTINGS = {
    "liquidation_threshold": 10,  # Alerta quando estiver a X% da liquidação
    "check_interval": 10,  # Verifica a cada X segundos
    "min_position_value": 1000,  # Só alerta posições acima de $1000
}

# ===== MENSAGENS PERSONALIZADAS =====
EMOJI_CONFIG = {
    "long": "📈",
    "short": "📉",
    "profit": "✅",
    "loss": "❌",
    "warning": "⚠️",
    "fire": "🔥",
    "whale": "🐋",
}
