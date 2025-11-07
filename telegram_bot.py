"""
📱 TELEGRAM BOT - Sistema de Alertas
Envia notificações ilimitadas e gratuitas
"""

import aiohttp
from typing import Optional

class TelegramBot:
    def __init__(self, token: str, chat_id: str):
        self.token = token
        self.chat_id = chat_id
        self.base_url = f"https://api.telegram.org/bot{token}"
        
    async def send_message(self, text: str, parse_mode: str = "HTML") -> bool:
        """
        Envia mensagem no Telegram
        Retorna True se enviou com sucesso
        """
        try:
            url = f"{self.base_url}/sendMessage"
            
            payload = {
                "chat_id": self.chat_id,
                "text": text,
                "parse_mode": parse_mode,
                "disable_web_page_preview": True
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        return True
                    else:
                        print(f"⚠️ Erro ao enviar mensagem: Status {response.status}")
                        return False
                        
        except Exception as e:
            print(f"❌ Erro no Telegram: {e}")
            return False
    
    async def send_alert(self, title: str, message: str, emoji: str = "🔔") -> bool:
        """
        Envia alerta formatado
        """
        formatted_message = f"""
{emoji} <b>{title}</b>

{message}
        """
        return await self.send_message(formatted_message)
    
    async def test_connection(self) -> bool:
        """
        Testa se o bot está funcionando
        """
        try:
            url = f"{self.base_url}/getMe"
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Bot conectado: @{data['result']['username']}")
                        return True
                    return False
        except Exception as e:
            print(f"❌ Erro ao testar bot: {e}")
            return False
