"""
🐋 HYPERLIQUID WHALE TRACKER - SISTEMA PRINCIPAL
Sistema de monitoramento 24/7 com alertas no Telegram
Criado para Teteus - 100% GRATUITO
"""

import asyncio
import json
from datetime import datetime
from hyperliquid_api import HyperliquidAPI
from telegram_bot import TelegramBot
from config import WALLETS, TELEGRAM_TOKEN, CHAT_ID
from health_check import start_health_server

class WhaleTracker:
    def __init__(self):
        self.api = HyperliquidAPI()
        self.telegram = TelegramBot(TELEGRAM_TOKEN, CHAT_ID)
        self.previous_positions = {}  # Guarda estado anterior para detectar mudanças
        
    async def start(self):
        """Inicia o monitoramento contínuo"""
        print("🚀 Sistema iniciado!")
        print(f"📊 Monitorando {len(WALLETS)} wallets...")
        await self.telegram.send_message("🎉 Sistema Online!\n🐋 Monitorando wallets da Hyperliquid\n⚡ Alertas automáticos ativados!")
        
        while True:
            try:
                await self.check_all_wallets()
                await asyncio.sleep(10)  # Verifica a cada 10 segundos
            except Exception as e:
                print(f"❌ Erro: {e}")
                await asyncio.sleep(30)
    
    async def check_all_wallets(self):
        """Verifica todas as wallets cadastradas"""
        for wallet_address, wallet_name in WALLETS.items():
            try:
                # Busca dados atuais da wallet
                positions = await self.api.get_user_positions(wallet_address)
                
                # Verifica mudanças
                await self.detect_changes(wallet_address, wallet_name, positions)
                
            except Exception as e:
                print(f"⚠️ Erro ao verificar {wallet_name}: {e}")
    
    async def detect_changes(self, address, name, current_positions):
        """Detecta mudanças nas posições e envia alertas"""
        
        # Primeira verificação - salva estado inicial
        if address not in self.previous_positions:
            self.previous_positions[address] = current_positions
            return
        
        previous = self.previous_positions[address]
        
        # DETECTA NOVAS POSIÇÕES ABERTAS
        for pos in current_positions:
            if not self.position_exists(pos, previous):
                await self.alert_position_opened(name, pos)
        
        # DETECTA POSIÇÕES FECHADAS
        for pos in previous:
            if not self.position_exists(pos, current_positions):
                await self.alert_position_closed(name, pos)
        
        # DETECTA MUDANÇAS EM POSIÇÕES EXISTENTES
        for current_pos in current_positions:
            for prev_pos in previous:
                if current_pos['coin'] == prev_pos['coin']:
                    await self.check_position_changes(name, prev_pos, current_pos)
        
        # Atualiza estado anterior
        self.previous_positions[address] = current_positions
    
    def position_exists(self, position, position_list):
        """Verifica se uma posição existe na lista"""
        for p in position_list:
            if p['coin'] == position['coin']:
                return True
        return False
    
    async def alert_position_opened(self, wallet_name, position):
        """Alerta quando uma nova posição é aberta"""
        coin = position['coin']
        side = position['side']
        size = float(position['szi'])
        entry = float(position['entryPx'])
        leverage = int(position['leverage']['value'])
        liquidation_px = float(position['liquidationPx']) if position['liquidationPx'] else 0
        
        # Calcula valor em USD
        position_value = abs(size) * entry
        
        emoji = "🟢" if side == "long" else "🔴"
        
        message = f"""
{emoji} NOVA POSIÇÃO ABERTA!

🐋 Wallet: {wallet_name}
📊 Token: {coin}
{'📈 LONG' if side == 'long' else '📉 SHORT'}

💰 Tamanho: ${position_value:,.0f}
🎯 Alavancagem: {leverage}x
📍 Entry: ${entry:,.2f}
💀 Liquidação: ${liquidation_px:,.2f}

⏰ {datetime.now().strftime('%H:%M:%S')} UTC
        """
        
        await self.telegram.send_message(message)
        print(f"✅ Alerta enviado: {wallet_name} abriu {side.upper()} em {coin}")
    
    async def alert_position_closed(self, wallet_name, position):
        """Alerta quando uma posição é fechada"""
        coin = position['coin']
        side = position['side']
        unrealized_pnl = float(position['unrealizedPnl'])
        
        emoji = "✅" if unrealized_pnl > 0 else "❌"
        result = "LUCRO" if unrealized_pnl > 0 else "PREJUÍZO"
        
        message = f"""
{emoji} POSIÇÃO FECHADA!

🐋 Wallet: {wallet_name}
📊 Token: {coin}
{'📈 LONG' if side == 'long' else '📉 SHORT'}

💵 PnL: ${unrealized_pnl:,.2f}
🎯 Resultado: {result}

⏰ {datetime.now().strftime('%H:%M:%S')} UTC
        """
        
        await self.telegram.send_message(message)
        print(f"✅ Alerta enviado: {wallet_name} fechou {side.upper()} em {coin}")
    
    async def check_position_changes(self, wallet_name, prev_pos, current_pos):
        """Verifica mudanças em posições existentes"""
        
        # ALERTA DE RISCO DE LIQUIDAÇÃO
        current_px = float(current_pos['positionValue']) / float(current_pos['szi'])
        liquidation_px = float(current_pos['liquidationPx']) if current_pos['liquidationPx'] else 0
        
        if liquidation_px > 0:
            distance_to_liq = abs((current_px - liquidation_px) / current_px) * 100
            
            # Alerta se estiver a menos de 10% da liquidação
            if distance_to_liq < 10:
                message = f"""
⚠️⚠️ ALERTA DE LIQUIDAÇÃO! ⚠️⚠️

🐋 Wallet: {wallet_name}
📊 Token: {current_pos['coin']}
{'📈 LONG' if current_pos['side'] == 'long' else '📉 SHORT'}

📉 Preço Atual: ${current_px:,.2f}
💀 Liquidação: ${liquidation_px:,.2f}
🚨 Distância: {distance_to_liq:.1f}%

⚡ RISCO ALTO!
⏰ {datetime.now().strftime('%H:%M:%S')} UTC
                """
                await self.telegram.send_message(message)

if __name__ == "__main__":
    async def main():
        # Inicia health check server para o Render
        await start_health_server()
        
        # Inicia o tracker
        tracker = WhaleTracker()
        await tracker.start()
    
    asyncio.run(main())
