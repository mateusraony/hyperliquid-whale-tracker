"""
🐋 HYPERLIQUID WHALE TRACKER - SISTEMA PRINCIPAL
Sistema de monitoramento 24/7 com alertas no Telegram
Criado para Teteus - 100% GRATUITO

VERSÃO FINAL:
- Alerta a 2% de liquidação (1 alerta só)
- Link correto (Hypurrscan OU HyperDash)
- Horário BRT
- Dados 100% ao vivo
"""

import asyncio
import json
from datetime import datetime, timezone, timedelta
from hyperliquid_api import HyperliquidAPI
from telegram_bot import TelegramBot
from config import WALLETS, TELEGRAM_TOKEN, CHAT_ID, ALERT_SETTINGS
from health_check import start_health_server

# Timezone do Brasil (BRT - UTC-3)
BRT = timezone(timedelta(hours=-3))

class WhaleTracker:
    def __init__(self):
        self.api = HyperliquidAPI()
        self.telegram = TelegramBot(TELEGRAM_TOKEN, CHAT_ID)
        self.previous_positions = {}
        self.last_alert_time = {}
        self.positions_at_risk = {}
        
    def get_brt_time(self):
        """Retorna horário atual em BRT"""
        return datetime.now(BRT).strftime('%H:%M:%S')
    
    def get_wallet_link(self, address, fonte):
        """Retorna o link correto (Hypurrscan OU HyperDash)"""
        if fonte == "hyperdash":
            return f"https://hyperdash.info/trader/{address}"
        else:
            return f"https://hypurrscan.io/address/{address}"
        
    async def start(self):
        """Inicia o monitoramento contínuo"""
        print("🚀 Sistema iniciado!")
        print(f"📊 Monitorando {len(WALLETS)} wallets...")
        await self.telegram.send_message("🎉 Sistema Online!\n🐋 Monitorando wallets da Hyperliquid\n⚡ Alertas automáticos ativados!")
        
        while True:
            try:
                await self.check_all_wallets()
                await asyncio.sleep(ALERT_SETTINGS.get('check_interval', 10))
            except Exception as e:
                print(f"❌ Erro: {e}")
                await asyncio.sleep(30)
    
    async def check_all_wallets(self):
        """Verifica todas as wallets cadastradas"""
        for wallet_address, wallet_info in WALLETS.items():
            try:
                wallet_name = wallet_info["nome"]
                fonte = wallet_info["fonte"]
                
                # Busca dados atuais da wallet
                positions = await self.api.get_user_positions(wallet_address)
                
                # Verifica mudanças
                await self.detect_changes(wallet_address, wallet_name, fonte, positions)
                
            except Exception as e:
                print(f"⚠️ Erro ao verificar {wallet_info.get('nome', 'wallet')}: {e}")
    
    async def detect_changes(self, address, name, fonte, current_positions):
        """Detecta mudanças nas posições e envia alertas"""
        
        # Primeira verificação - salva estado inicial
        if address not in self.previous_positions:
            self.previous_positions[address] = current_positions
            return
        
        previous = self.previous_positions[address]
        
        # Verifica cooldown
        cooldown_key = f"{address}_cooldown"
        can_alert = True
        if cooldown_key in self.last_alert_time:
            time_since_last = (datetime.now() - self.last_alert_time[cooldown_key]).total_seconds()
            if time_since_last < ALERT_SETTINGS.get('alert_cooldown', 60):
                can_alert = False
        
        # DETECTA NOVAS POSIÇÕES ABERTAS
        for pos in current_positions:
            if not self.position_exists(pos, previous):
                position_value = abs(float(pos['szi'])) * float(pos['entryPx'])
                if position_value >= ALERT_SETTINGS.get('min_position_value', 1000):
                    if can_alert:
                        await self.alert_position_opened(address, name, fonte, pos)
                        self.last_alert_time[cooldown_key] = datetime.now()
        
        # DETECTA POSIÇÕES FECHADAS
        for pos in previous:
            if not self.position_exists(pos, current_positions):
                position_value = abs(float(pos['szi'])) * float(pos['entryPx'])
                if position_value >= ALERT_SETTINGS.get('min_position_value', 1000):
                    pos_key = f"{address}_{pos['coin']}"
                    was_at_risk = pos_key in self.positions_at_risk
                    
                    await self.alert_position_closed(address, name, fonte, pos, was_at_risk)
                    
                    if pos_key in self.positions_at_risk:
                        del self.positions_at_risk[pos_key]
        
        # VERIFICA RISCO DE LIQUIDAÇÃO (2%)
        for current_pos in current_positions:
            await self.check_liquidation_risk(address, name, fonte, current_pos)
        
        # Atualiza estado anterior
        self.previous_positions[address] = current_positions
    
    def position_exists(self, position, position_list):
        """Verifica se uma posição existe na lista"""
        for p in position_list:
            if p['coin'] == position['coin']:
                return True
        return False
    
    async def alert_position_opened(self, address, wallet_name, fonte, position):
        """Alerta quando uma nova posição é aberta"""
        coin = position['coin']
        side = position['side']
        size = float(position['szi'])
        entry = float(position['entryPx'])
        leverage = int(position['leverage']['value'])
        liquidation_px = float(position['liquidationPx']) if position['liquidationPx'] else 0
        
        position_value = abs(size) * entry
        emoji = "🟢" if side == "long" else "🔴"
        link = self.get_wallet_link(address, fonte)
        fonte_nome = "HyperDash" if fonte == "hyperdash" else "Hypurrscan"
        
        message = f"""
{emoji} NOVA POSIÇÃO ABERTA!

🐋 Wallet: {wallet_name}
🔗 {fonte_nome}: {link}

📊 Token: {coin}
{'📈 LONG' if side == 'long' else '📉 SHORT'}

💰 Tamanho: ${position_value:,.0f}
🎯 Alavancagem: {leverage}x
📍 Entry: ${entry:,.2f}
💀 Liquidação: ${liquidation_px:,.2f}

⏰ {self.get_brt_time()} BRT
        """
        
        await self.telegram.send_message(message)
        print(f"✅ Alerta enviado: {wallet_name} abriu {side.upper()} em {coin}")
    
    async def alert_position_closed(self, address, wallet_name, fonte, position, was_at_risk):
        """Alerta quando uma posição é fechada (inclui liquidações!)"""
        coin = position['coin']
        side = position['side']
        unrealized_pnl = float(position['unrealizedPnl'])
        
        # Detecta liquidação
        position_value = abs(float(position['szi'])) * float(position['entryPx'])
        loss_percentage = (unrealized_pnl / position_value) * 100 if position_value > 0 else 0
        
        is_liquidation = was_at_risk and loss_percentage < -50
        
        link = self.get_wallet_link(address, fonte)
        fonte_nome = "HyperDash" if fonte == "hyperdash" else "Hypurrscan"
        
        if is_liquidation:
            # ALERTA DE LIQUIDAÇÃO
            message = f"""
💀💀 POSIÇÃO LIQUIDADA! 💀💀

🐋 Wallet: {wallet_name}
🔗 {fonte_nome}: {link}

📊 Token: {coin}
{'📈 LONG' if side == 'long' else '📉 SHORT'}

💵 Perda: ${unrealized_pnl:,.2f} ({loss_percentage:.1f}%)
⚡ LIQUIDAÇÃO CONFIRMADA

⏰ {self.get_brt_time()} BRT
            """
        else:
            # ALERTA NORMAL DE FECHAMENTO
            emoji = "✅" if unrealized_pnl > 0 else "❌"
            result = "LUCRO" if unrealized_pnl > 0 else "PREJUÍZO"
            
            message = f"""
{emoji} POSIÇÃO FECHADA!

🐋 Wallet: {wallet_name}
🔗 {fonte_nome}: {link}

📊 Token: {coin}
{'📈 LONG' if side == 'long' else '📉 SHORT'}

💵 PnL: ${unrealized_pnl:,.2f}
🎯 Resultado: {result}

⏰ {self.get_brt_time()} BRT
            """
        
        await self.telegram.send_message(message)
        print(f"✅ Alerta enviado: {wallet_name} fechou {side.upper()} em {coin}")
    
    async def check_liquidation_risk(self, address, wallet_name, fonte, position):
        """Verifica se posição está em risco de liquidação (2%)"""
        
        current_px = float(position['positionValue']) / float(position['szi'])
        liquidation_px = float(position['liquidationPx']) if position['liquidationPx'] else 0
        
        if liquidation_px <= 0:
            return
        
        # Calcula distância até liquidação
        distance_to_liq = abs((current_px - liquidation_px) / current_px) * 100
        
        pos_key = f"{address}_{position['coin']}"
        
        # ALERTA APENAS QUANDO ENTRA NA ZONA DE 2% PELA PRIMEIRA VEZ
        if distance_to_liq <= ALERT_SETTINGS.get('liquidation_threshold', 2):
            if pos_key not in self.positions_at_risk:
                # PRIMEIRA VEZ - ALERTA!
                link = self.get_wallet_link(address, fonte)
                fonte_nome = "HyperDash" if fonte == "hyperdash" else "Hypurrscan"
                
                message = f"""
⚠️⚠️ ALERTA DE LIQUIDAÇÃO! ⚠️⚠️

🐋 Wallet: {wallet_name}
🔗 {fonte_nome}: {link}

📊 Token: {position['coin']}
{'📈 LONG' if position['side'] == 'long' else '📉 SHORT'}

📉 Preço Atual: ${current_px:,.2f}
💀 Liquidação: ${liquidation_px:,.2f}
🚨 Distância: {distance_to_liq:.1f}%

⚡ RISCO ALTO! Entrou na zona de perigo!
⏰ {self.get_brt_time()} BRT
                """
                await self.telegram.send_message(message)
                
                # Marca que já alertou
                self.positions_at_risk[pos_key] = True
                print(f"⚠️ Alerta de risco: {wallet_name} - {position['coin']} ({distance_to_liq:.1f}%)")
        else:
            # Saiu da zona de perigo
            if pos_key in self.positions_at_risk:
                del self.positions_at_risk[pos_key]
                print(f"✅ {wallet_name} - {position['coin']} saiu da zona de perigo")

if __name__ == "__main__":
    async def main():
        # Inicia health check server
        await start_health_server()
        
        # Inicia o tracker
        tracker = WhaleTracker()
        await tracker.start()
    
    asyncio.run(main())
