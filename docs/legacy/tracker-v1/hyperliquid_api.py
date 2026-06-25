"""
🔗 HYPERLIQUID API - Conexão com blockchain
Busca dados em tempo real das wallets
"""

import aiohttp
import json
from typing import List, Dict

class HyperliquidAPI:
    def __init__(self):
        self.base_url = "https://api.hyperliquid.xyz/info"
        
    async def get_user_positions(self, address: str) -> List[Dict]:
        """
        Busca posições abertas de um usuário
        Retorna lista de posições com dados completos
        """
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "type": "clearinghouseState",
                    "user": address
                }
                
                async with session.post(self.base_url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Extrai posições abertas
                        if 'assetPositions' in data:
                            positions = []
                            for pos in data['assetPositions']:
                                if 'position' in pos:
                                    position_data = pos['position']
                                    # Só retorna posições abertas (size != 0)
                                    if float(position_data['szi']) != 0:
                                        positions.append({
                                            'coin': position_data['coin'],
                                            'side': 'long' if float(position_data['szi']) > 0 else 'short',
                                            'szi': position_data['szi'],
                                            'entryPx': position_data['entryPx'],
                                            'positionValue': position_data['positionValue'],
                                            'unrealizedPnl': position_data['unrealizedPnl'],
                                            'liquidationPx': position_data.get('liquidationPx', '0'),
                                            'leverage': position_data['leverage']
                                        })
                            return positions
                        return []
                    else:
                        print(f"⚠️ Erro na API: Status {response.status}")
                        return []
                        
        except Exception as e:
            print(f"❌ Erro ao buscar posições: {e}")
            return []
    
    async def get_user_trades(self, address: str, limit: int = 50) -> List[Dict]:
        """
        Busca histórico de trades de um usuário
        """
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "type": "userFills",
                    "user": address
                }
                
                async with session.post(self.base_url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data[:limit] if data else []
                    return []
                    
        except Exception as e:
            print(f"❌ Erro ao buscar trades: {e}")
            return []
    
    async def get_market_price(self, coin: str) -> float:
        """
        Busca preço atual de mercado de um ativo
        """
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "type": "metaAndAssetCtxs"
                }
                
                async with session.post(self.base_url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        # Busca preço do coin específico
                        for asset in data[1]:
                            if asset['coin'] == coin:
                                return float(asset['markPx'])
                    return 0.0
                    
        except Exception as e:
            print(f"❌ Erro ao buscar preço: {e}")
            return 0.0
