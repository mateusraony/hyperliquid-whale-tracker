"""
❤️ HEALTH CHECK - Verifica se o sistema está saudável
O Render usa isso para garantir que o serviço está rodando
"""

from aiohttp import web
import asyncio

async def health_check(request):
    """Endpoint de health check para o Render"""
    return web.Response(text="OK", status=200)

async def start_health_server():
    """Inicia servidor HTTP para health checks"""
    app = web.Application()
    app.router.add_get('/health', health_check)
    app.router.add_get('/', health_check)
    
    runner = web.AppRunner(app)
    await runner.setup()
    
    # Render fornece a porta via variável de ambiente
    import os
    port = int(os.environ.get('PORT', 10000))
    
    site = web.TCPSite(runner, '0.0.0.0', port)
    await site.start()
    print(f"✅ Health check server rodando na porta {port}")
