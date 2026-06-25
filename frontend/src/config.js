const API_CONFIG = {
  // URL do backend: configure REACT_APP_API_URL no Render (ou .env.local localmente)
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',

  // Timeout em milissegundos
  TIMEOUT: 60000,

  // Intervalo de atualização automática (30 segundos)
  REFRESH_INTERVAL: 30000,
};

export { API_CONFIG };
export default API_CONFIG;
