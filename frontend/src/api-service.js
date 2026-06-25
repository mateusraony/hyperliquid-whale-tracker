import { API_CONFIG } from './config';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...options.headers },
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      console.warn(`Tentativa ${i + 1}/${maxRetries} falhou:`, error.message);
      if (i < maxRetries - 1) await delay(Math.min(1000 * Math.pow(2, i), 10000));
    }
  }
  throw new Error(`Falha após ${maxRetries} tentativas: ${lastError.message}`);
}

// ============================================
// Funções de risco de liquidação
// ============================================

function calculateLiquidationRisk(positions) {
  if (!positions || positions.length === 0) return 'Baixo';
  for (const pos of positions) {
    const szi = parseFloat(pos.szi || 0);
    if (szi === 0) continue;
    const posValue = parseFloat(pos.positionValue || 0);
    const currentPx = Math.abs(szi) > 0 ? posValue / Math.abs(szi) : 0;
    const liqPx = parseFloat(pos.liquidationPx || 0);
    if (liqPx > 0 && currentPx > 0) {
      const dist = Math.abs((currentPx - liqPx) / currentPx) * 100;
      if (dist <= 1) return 'Alto';
      if (dist <= 5) return 'Médio';
    }
  }
  return 'Baixo';
}

// ============================================
// Normalização: backend → formato esperado pelo componente
// ============================================

function normalizeWhale(whale) {
  const positions = whale.positions || [];

  const active_positions = positions.map(pos => ({
    coin: pos.coin,
    size: parseFloat(pos.szi || 0),
    entry_price: parseFloat(pos.entryPx || 0),
    leverage: pos.leverage?.value ? parseFloat(pos.leverage.value) : null,
    unrealized_pnl: parseFloat(pos.unrealizedPnl || 0),
    liquidation_px: pos.liquidationPx ? parseFloat(pos.liquidationPx) : null,
    mark_px: pos.markPx ? parseFloat(pos.markPx) : null,
    position_value: parseFloat(pos.positionValue || 0),
  }));

  const unrealized_pnl = positions.reduce(
    (sum, p) => sum + parseFloat(p.unrealizedPnl || 0), 0
  );

  const account_value = whale.total_position_value || 0;
  const portfolio_heat = whale.metrics?.portfolio_heat || 0;
  const total_margin_used = account_value * (portfolio_heat / 100);

  return {
    address: whale.address,
    nickname: whale.nickname,
    active_positions,
    orders: whale.orders || [],
    account_value,
    total_margin_used,
    unrealized_pnl,
    liquidation_risk: calculateLiquidationRisk(positions),
    metrics: whale.metrics,
    last_update: whale.last_update,
    error: whale.error,
  };
}

// ============================================
// API pública (default export)
// ============================================

async function getWhales() {
  const data = await fetchWithRetry(`${API_CONFIG.API_BASE_URL}/whales`);
  const whales = (data.whales || []).map(normalizeWhale);
  return { whales, count: data.count };
}

async function addWhale(address, nickname) {
  return fetchWithRetry(`${API_CONFIG.API_BASE_URL}/whales`, {
    method: 'POST',
    body: JSON.stringify({ address, nickname }),
  });
}

async function deleteWhale(address) {
  return fetchWithRetry(`${API_CONFIG.API_BASE_URL}/whales/${address}`, {
    method: 'DELETE',
  });
}

async function getHealth() {
  return fetchWithRetry(`${API_CONFIG.API_BASE_URL}/health`);
}

async function sendResume() {
  return fetchWithRetry(`${API_CONFIG.API_BASE_URL}/telegram/send-resume`, {
    method: 'POST',
  });
}

async function getTelegramConfig() {
  return fetchWithRetry(`${API_CONFIG.API_BASE_URL}/telegram/config`);
}

async function saveTelegramConfig({ token, chatId, enabled }) {
  return fetchWithRetry(`${API_CONFIG.API_BASE_URL}/telegram/config`, {
    method: 'POST',
    body: JSON.stringify({ token: token || null, chat_id: chatId || null, enabled }),
  });
}

const apiService = {
  getWhales,
  addWhale,
  deleteWhale,
  getHealth,
  sendResume,
  getTelegramConfig,
  saveTelegramConfig,
};

export default apiService;

export { getWhales, addWhale, deleteWhale, getHealth, sendResume, getTelegramConfig, saveTelegramConfig };
