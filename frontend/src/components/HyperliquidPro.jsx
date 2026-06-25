import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Bell, Activity, Target, Brain, Award, BarChart3, Clock, Users, Layers, Shield, PlayCircle, AlertTriangle, ExternalLink, Trash2, RefreshCw, ChevronDown, ChevronUp, X, Settings, Send, Eye, EyeOff, CheckCircle } from 'lucide-react';
import apiService from '../api-service';

export default function HyperliquidPro() {
  // ============================================
  // ESTADOS
  // ============================================
  const [tab, setTab] = useState('command');
  const [expandedToken, setExpandedToken] = useState(null);
  const [expandedWallet, setExpandedWallet] = useState(null);
  const [selectedAnalyticsWallet, setSelectedAnalyticsWallet] = useState(null);
  const [simulatorCapital, setSimulatorCapital] = useState(10000);
  const [expandedMetric, setExpandedMetric] = useState(null);
  const [systemStatus, setSystemStatus] = useState('online'); // online, warning, offline
  
  // Estados de dados reais da API
  const [whalesData, setWhalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Estados do modal de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [whaleToDelete, setWhaleToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Estados de configuração do Telegram
  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [tgEnabled, setTgEnabled] = useState(true);
  const [tgTokenMasked, setTgTokenMasked] = useState('');
  const [tgConfigured, setTgConfigured] = useState(false);
  const [tgSaving, setTgSaving] = useState(false);
  const [tgSaved, setTgSaved] = useState(false);
  const [tgError, setTgError] = useState(null);
  const [showToken, setShowToken] = useState(false);

  // ============================================
  // FUNÇÕES DE API
  // ============================================
  const loadWhalesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getWhales();
      setWhalesData(data.whales || []);
      setLastUpdate(new Date());
      setSystemStatus('online');
    } catch (err) {
      console.error('Erro ao carregar whales:', err);
      setError(err.message);
      setSystemStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWhale = async () => {
    if (!whaleToDelete) return;
    
    try {
      setDeleteLoading(true);
      await apiService.deleteWhale(whaleToDelete.address);
      setShowDeleteModal(false);
      setWhaleToDelete(null);
      await loadWhalesData(); // Recarregar dados
    } catch (err) {
      console.error('Erro ao deletar whale:', err);
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Carregar dados ao montar
  useEffect(() => {
    loadWhalesData();
    const interval = setInterval(loadWhalesData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTelegramConfig = async () => {
    try {
      const cfg = await apiService.getTelegramConfig();
      setTgConfigured(cfg.token_configured);
      setTgTokenMasked(cfg.token_masked || '');
      setTgChatId(cfg.chat_id || '');
      setTgEnabled(cfg.enabled);
    } catch (e) {
      // silently ignore — backend may not have config yet
    }
  };

  useEffect(() => {
    loadTelegramConfig();
  }, []);

  const handleSaveTelegramConfig = async () => {
    setTgSaving(true);
    setTgError(null);
    setTgSaved(false);
    try {
      await apiService.saveTelegramConfig({ token: tgToken || undefined, chatId: tgChatId || undefined, enabled: tgEnabled });
      setTgSaved(true);
      setTgToken('');
      setShowToken(false);
      await loadTelegramConfig();
      setTimeout(() => setTgSaved(false), 4000);
    } catch (e) {
      setTgError(e.message);
    } finally {
      setTgSaving(false);
    }
  };

  // ============================================
  // CÁLCULOS GLOBAIS
  // ============================================
  const globalMetrics = {
    totalValue: whalesData.reduce((sum, w) => sum + (w.account_value || 0), 0),
    totalPnl24h: whalesData.reduce((sum, w) => sum + (w.unrealized_pnl || 0), 0),
    totalPositions: whalesData.reduce((sum, w) => sum + (w.active_positions?.length || 0), 0),
    totalWhales: whalesData.length,
    totalLongs: whalesData.reduce((sum, w) => 
      sum + (w.active_positions?.filter(p => p.size > 0).length || 0), 0),
    totalShorts: whalesData.reduce((sum, w) => 
      sum + (w.active_positions?.filter(p => p.size < 0).length || 0), 0),
  };

  // [MOCK DATA] Dados de liquidação estáticos — TODO: conectar a /api/database/trades
  const liquidationData = {
    '1D': { total: 2340000, trades: 12, profit: 450000, longs: 8, shorts: 4 },
    '7D': { total: 8920000, trades: 67, profit: 1890000, longs: 42, shorts: 25 },
    '1W': { total: 8920000, trades: 67, profit: 1890000, longs: 42, shorts: 25 },
    '1M': { total: 24500000, trades: 234, profit: 4870000, longs: 145, shorts: 89 },
  };

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================
  const formatCurrency = (value) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusEmoji = () => {
    if (systemStatus === 'online') return '🟢';
    if (systemStatus === 'warning') return '🟡';
    return '🔴';
  };

  const getStatusColor = () => {
    if (systemStatus === 'online') return 'green';
    if (systemStatus === 'warning') return 'yellow';
    return 'red';
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
      
      {/* Scrollbar customizada */}
      <style>{`
        ::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%);
          border-radius: 10px;
          border: 2px solid rgba(15, 23, 42, 0.5);
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #2563eb 0%, #7c3aed 100%);
        }
      `}</style>

      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1900px] mx-auto">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Hyperliquid Pro</h1>
                <p className="text-xs text-slate-400">Rastreamento institucional</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Indicador LIVE melhorado */}
              <div className={`flex items-center gap-2 bg-${getStatusColor()}-500/10 border border-${getStatusColor()}-500/30 px-3 py-1 rounded text-xs`}>
                <div className={`w-2 h-2 bg-${getStatusColor()}-400 rounded-full animate-pulse`}></div>
                <span className="font-medium flex items-center gap-1">
                  {getStatusEmoji()} Live • {whalesData.length}
                </span>
              </div>

              <button 
                onClick={loadWhalesData}
                className="p-1.5 hover:bg-slate-800 rounded"
                title="Atualizar dados"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button className="p-1.5 hover:bg-slate-800 rounded">
                <Bell className="w-4 h-4" />
              </button>
              
              {/* Botão Add Wallet melhorado */}
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4 py-1.5 rounded text-sm font-medium shadow-lg shadow-blue-500/20 transition-all">
                + Add Wallet
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 px-4">
            {[
              { id: 'command', icon: Target, label: 'Command' },
              { id: 'positions', icon: BarChart3, label: 'Positions' },
              { id: 'trades', icon: Activity, label: 'Trades' },
              { id: 'orders', icon: Clock, label: 'Orders' },
              { id: 'ai-token', icon: Brain, label: 'AI Token' },
              { id: 'ai-wallet', icon: Users, label: 'AI Wallet' },
              { id: 'analytics', icon: Layers, label: 'Analytics' },
              { id: 'risk', icon: Shield, label: 'Risk' },
              { id: 'simulator', icon: PlayCircle, label: 'Simulator' },
              { id: 'board', icon: Award, label: 'Leaderboard' },
              { id: 'settings', icon: Settings, label: 'Settings' },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-medium whitespace-nowrap ${
                    tab === t.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-[1900px] mx-auto p-4">
        
        {/* Loading / Error */}
        {loading && !whalesData.length && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
              <p className="text-slate-400">Carregando dados das whales...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="text-red-400">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ABA COMMAND */}
        {tab === 'command' && !loading && (
          <div className="space-y-4">
            
            {/* Métricas Globais */}
            <div className="grid grid-cols-8 gap-3">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase mb-1">Total Value</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(globalMetrics.totalValue)}</p>
                <p className="text-xs text-slate-400">{globalMetrics.totalWhales} whales</p>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase mb-1">Open Pos</p>
                <p className="text-2xl font-bold text-blue-400">{globalMetrics.totalPositions}</p>
                <p className="text-xs text-slate-400">Posições</p>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase mb-1">PnL 24h</p>
                <p className={`text-2xl font-bold ${globalMetrics.totalPnl24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(globalMetrics.totalPnl24h)}
                </p>
              </div>

              {/* LONG vs SHORT */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase mb-1">LONGS</p>
                <p className="text-2xl font-bold text-green-400">{globalMetrics.totalLongs}</p>
                <p className="text-xs text-slate-400">
                  {((globalMetrics.totalLongs / (globalMetrics.totalPositions || 1)) * 100).toFixed(1)}%
                </p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase mb-1">SHORTS</p>
                <p className="text-2xl font-bold text-orange-400">{globalMetrics.totalShorts}</p>
                <p className="text-xs text-slate-400">
                  {((globalMetrics.totalShorts / (globalMetrics.totalPositions || 1)) * 100).toFixed(1)}%
                </p>
              </div>

              {/* Métricas de Liquidação Expansíveis */}
              {Object.entries(liquidationData).slice(0, 3).map(([period, data]) => (
                <div 
                  key={period}
                  onClick={() => setExpandedMetric(expandedMetric === period ? null : period)}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-slate-400 text-xs uppercase">Liq {period}</p>
                    {expandedMetric === period ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </div>
                  <p className="text-xl font-bold text-red-400">{formatCurrency(data.total)}</p>
                  
                  {expandedMetric === period && (
                    <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Lucro:</span>
                        <span className="text-green-400">{formatCurrency(data.profit)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">LONGs:</span>
                        <span className="text-green-400">{data.longs}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">SHORTs:</span>
                        <span className="text-orange-400">{data.shorts}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Média:</span>
                        <span className="text-blue-400">{formatCurrency(data.total / data.trades)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Lista de Whales */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-4">Whales Ativas ({whalesData.length})</h2>
              
              <div className="space-y-3">
                {whalesData.map((whale) => (
                  <div key={whale.address} className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <a
                            href={`https://hypurrscan.io/address/${whale.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 font-mono text-sm flex items-center gap-1"
                          >
                            {formatAddress(whale.address)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          
                          {/* Risco */}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            whale.liquidation_risk === 'Baixo' ? 'bg-green-500/20 text-green-400' :
                            whale.liquidation_risk === 'Médio' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {whale.liquidation_risk}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400 text-xs">Valor Conta</p>
                            <p className="font-bold text-green-400">{formatCurrency(whale.account_value)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Margem Usada</p>
                            <p className="font-bold">{formatCurrency(whale.total_margin_used)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">PnL</p>
                            <p className={`font-bold ${whale.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatCurrency(whale.unrealized_pnl)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Posições</p>
                            <p className="font-bold text-blue-400">{whale.active_positions?.length || 0}</p>
                          </div>
                        </div>

                        {/* Posições */}
                        {whale.active_positions && whale.active_positions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <p className="text-xs text-slate-400 mb-2">Posições Ativas:</p>
                            <div className="flex flex-wrap gap-2">
                              {whale.active_positions.slice(0, 5).map((pos, idx) => (
                                <div key={idx} className="bg-slate-800/50 px-2 py-1 rounded text-xs">
                                  <span className="font-bold">{pos.coin}</span>
                                  <span className={`ml-2 ${pos.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(pos.unrealized_pnl)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botão Deletar */}
                      <button
                        onClick={() => {
                          setWhaleToDelete(whale);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                        title="Remover whale"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs text-slate-500">
                      Última atualização: {new Date(whale.last_update).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA POSITIONS */}
        {tab === 'positions' && !loading && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Posições Abertas ({globalMetrics.totalPositions})</h2>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm font-bold">
                  LONG: {globalMetrics.totalLongs}
                </span>
                <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded text-sm font-bold">
                  SHORT: {globalMetrics.totalShorts}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {whalesData.map((whale) => 
                whale.active_positions?.map((pos, idx) => (
                  <div key={`${whale.address}-${idx}`} className={`bg-slate-900/50 rounded-lg p-4 border-l-4 ${
                    pos.unrealized_pnl >= 0 ? 'border-green-500' : 'border-red-500'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-lg">{pos.coin}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            pos.size > 0 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {pos.size > 0 ? 'LONG' : 'SHORT'}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {formatAddress(whale.address)}
                          </span>
                        </div>

                        <div className="grid grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400 text-xs">Tamanho</p>
                            <p className="font-bold">{Math.abs(pos.size).toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Entrada</p>
                            <p className="font-bold">${pos.entry_price?.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Alavancagem</p>
                            <p className="font-bold text-yellow-400">{pos.leverage?.toFixed(1)}x</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">PnL</p>
                            <p className={`font-bold ${pos.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatCurrency(pos.unrealized_pnl)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Liquidação</p>
                            <p className="font-bold text-red-400">
                              {pos.liquidation_px ? `$${pos.liquidation_px.toFixed(2)}` : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* OUTRAS ABAS (mockadas por enquanto) */}
        {['trades', 'orders', 'ai-token', 'ai-wallet', 'analytics', 'risk', 'simulator', 'board'].includes(tab) && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-8 text-center">
            <Brain className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-xl font-bold mb-2">Em Desenvolvimento</h3>
            <p className="text-slate-400">
              A aba <span className="text-blue-400 font-bold">{tab}</span> será implementada em breve com dados reais da API
            </p>
          </div>
        )}

        {/* ABA SETTINGS */}
        {tab === 'settings' && (
          <div className="max-w-xl mx-auto space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-blue-400" /> Configurações</h2>

            {/* Card Telegram */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Send className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Telegram Bot</h3>
                    <p className="text-xs text-slate-400">Alertas de posições, liquidações e resumos</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={tgEnabled} onChange={e => setTgEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {tgConfigured && (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 text-sm text-green-400">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Token configurado: <span className="font-mono">{tgTokenMasked}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Bot Token {tgConfigured && <span className="text-slate-500">(deixe vazio para manter o atual)</span>}</label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={tgToken}
                      onChange={e => setTgToken(e.target.value)}
                      placeholder={tgConfigured ? '••••••••••••••' : 'Cole o token do @BotFather'}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button onClick={() => setShowToken(v => !v)} className="absolute right-2 top-2 text-slate-400 hover:text-white">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Chat ID</label>
                  <input
                    type="text"
                    value={tgChatId}
                    onChange={e => setTgChatId(e.target.value)}
                    placeholder="Ex: -1001234567890 ou seu ID pessoal"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Obtenha via @userinfobot no Telegram</p>
                </div>
              </div>

              {tgError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {tgError}
                </div>
              )}

              {tgSaved && (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 text-sm text-green-400">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Salvo! Você deve ter recebido uma mensagem de teste no Telegram.
                </div>
              )}

              <button
                onClick={handleSaveTelegramConfig}
                disabled={tgSaving || (!tgToken && !tgChatId && tgEnabled === undefined)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
              >
                {tgSaving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando e testando...</> : <><Send className="w-4 h-4" /> Salvar e enviar teste</>}
              </button>

              <p className="text-xs text-slate-500">
                As credenciais são salvas no banco de dados do servidor — não ficam no código nem nas env vars do Render.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
                <p className="text-sm text-slate-400">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <p className="text-slate-300 mb-6">
              Tem certeza que deseja remover a whale{' '}
              <span className="font-mono text-blue-400">{formatAddress(whaleToDelete?.address)}</span>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setWhaleToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteWhale}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
