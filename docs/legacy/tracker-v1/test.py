"""
🧪 TESTE DO SISTEMA
Execute este arquivo para testar se tudo está funcionando
"""

import asyncio
from telegram_bot import TelegramBot
from hyperliquid_api import HyperliquidAPI
from config import TELEGRAM_TOKEN, CHAT_ID, WALLETS

async def test_system():
    print("=" * 50)
    print("🧪 TESTANDO SISTEMA HYPERLIQUID WHALE TRACKER")
    print("=" * 50)
    
    # Teste 1: Bot do Telegram
    print("\n1️⃣ Testando Bot do Telegram...")
    bot = TelegramBot(TELEGRAM_TOKEN, CHAT_ID)
    bot_ok = await bot.test_connection()
    
    if bot_ok:
        print("✅ Bot funcionando!")
        await bot.send_message("🧪 Teste do sistema - Bot OK!")
    else:
        print("❌ Erro no bot do Telegram")
        return
    
    # Teste 2: API da Hyperliquid
    print("\n2️⃣ Testando API da Hyperliquid...")
    api = HyperliquidAPI()
    
    # Testa com a primeira wallet da lista
    first_wallet_address = list(WALLETS.keys())[0]
    first_wallet_name = WALLETS[first_wallet_address]
    
    print(f"   Buscando dados de: {first_wallet_name}")
    positions = await api.get_user_positions(first_wallet_address)
    
    if positions is not None:
        print(f"✅ API funcionando!")
        print(f"   Encontradas {len(positions)} posições abertas")
        
        if len(positions) > 0:
            message = f"""
🧪 <b>TESTE - API OK!</b>

📊 Wallet testada: {first_wallet_name}
📈 Posições abertas: {len(positions)}

Primeiras posições:
"""
            for i, pos in enumerate(positions[:3]):  # Mostra até 3 posições
                message += f"\n• {pos['coin']}: {pos['side'].upper()} (${float(pos['positionValue']):,.0f})"
            
            await bot.send_message(message)
    else:
        print("❌ Erro na API da Hyperliquid")
        return
    
    # Teste 3: Verificar todas as wallets
    print("\n3️⃣ Verificando todas as wallets cadastradas...")
    print(f"   Total: {len(WALLETS)} wallets\n")
    
    wallets_with_positions = 0
    total_positions = 0
    
    for address, name in list(WALLETS.items())[:5]:  # Testa primeiras 5
        positions = await api.get_user_positions(address)
        if positions and len(positions) > 0:
            wallets_with_positions += 1
            total_positions += len(positions)
            print(f"   ✅ {name}: {len(positions)} posições")
        else:
            print(f"   ⭕ {name}: sem posições")
        await asyncio.sleep(1)  # Pausa 1s entre requests
    
    # Resumo final
    print("\n" + "=" * 50)
    print("📊 RESUMO DO TESTE:")
    print("=" * 50)
    print(f"✅ Bot Telegram: OK")
    print(f"✅ API Hyperliquid: OK")
    print(f"📊 Wallets com posições: {wallets_with_positions}")
    print(f"📈 Total de posições: {total_positions}")
    print("=" * 50)
    
    await bot.send_message(f"""
🎉 <b>TESTE COMPLETO!</b>

✅ Todos os sistemas funcionando
📊 Wallets monitoradas: {len(WALLETS)}
📈 Posições ativas: {total_positions}

🚀 Sistema pronto para rodar 24/7!
    """)
    
    print("\n🎉 TUDO FUNCIONANDO! Sistema pronto para deploy no Render!")

if __name__ == "__main__":
    asyncio.run(test_system())
