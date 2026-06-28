import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Bell, Activity, Target, Brain, Award, BarChart3,
  Clock, Users, Layers, Shield, PlayCircle, AlertTriangle, ExternalLink, Trash2,
  RefreshCw, ChevronDown, ChevronUp, X, Settings, Send, Eye, EyeOff, CheckCircle,
  Plus, Trophy, Zap, Database, Star,
} from 'lucide-react';
import apiService from '../api-service';

export default function HyperliquidPro() {
  // ── Core state ──────────────────────────────────────────────
  const [tab, setTab] = useState('command');
  const [expandedMetric, setExpandedMetric] = useState(null);
  const [systemStatus, setSystemStatus] = useState('online');

  // Whale data
  const [whalesData, setWhalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [whaleToDelete, setWhaleToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add Wallet modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAddress, setAddAddress] = useState('');
  const [addNickname, setAddNickname] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

  // Telegram settings
  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [tgEnabled, setTgEnabled] = useState(true);
  const [tgTokenMasked, setTgTokenMasked] = useState('');
  const [tgConfigured, setTgConfigured] = useState(false);
  const [tgSaving, setTgSaving] = useState(false);
  const [tgSaved, setTgSaved] = useState(false);
  const [tgError, setTgError] = useState(null);
  const [showToken, setShowToken] = useState(false);

  // Trades tab
  const [tradesData, setTradesData] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [tradesError, setTradesError] = useState(null);

  // AI Wallet tab
  const [aiScores, setAiScores] = useState([]);
  const [aiScoresLoading, setAiScoresLoading] = useState(false);
  const [aiScoresError, setAiScoresError] = useState(null);

  // AI Token tab
  const [sentiment, setSentiment] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);

  // Analytics tab
  const [correlation, setCorrelation] = useState(null);
  const [correlationLoading, setCorrelationLoading] = useState(false);
  const [correlationError, setCorrelationError] = useState(null);

  // Risk tab
  const [signals, setSignals] = useState(null);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signalsError, setSignalsError] = useState(null);

  // Simulator
  const [simulatorCapital, setSimulatorCapital] = useState(10000);

  // Leaderboard sort
  const [lbSort, setLbSort] = useState('pnl');

  // ── API loaders ─────────────────────────────────────────────
  const loadWhalesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getWhales();
      setWhalesData(data.whales || []);
      setLastUpdate(new Date());
      setSystemStatus('online');
    } catch (err) {
      setError(err.message);
      setSystemStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  const loadTelegramConfig = async () => {
    try {
      const cfg = await apiService.getTelegramConfig();
      setTgConfigured(cfg.token_configured);
      setTgTokenMasked(cfg.token_masked || '');
      setTgChatId(cfg.chat_id || '');
      setTgEnabled(cfg.enabled);
    } catch (_) {}
  };

  const loadTrades = async () => {
    setTradesLoading(true);
    setTradesError(null);
    try {
      const data = await apiService.getTrades(200);
      setTradesData(data.trades || []);
    } catch (e) {
      setTradesError(e.message);
    } finally {
      setTradesLoading(false);
    }
  };

  const loadAiScores = async () => {
    setAiScoresLoading(true);
    setAiScoresError(null);
    try {
      const data = await apiService.getAiWhaleScores();
      setAiScores(data.whale_scores || []);
    } catch (e) {
      setAiScoresError(e.message);
    } finally {
      setAiScoresLoading(false);
    }
  };

  const loadSentiment = async () => {
    setSentimentLoading(true);
    try {
      const data = await apiService.getMarketSentiment();
      setSentiment(data);
    } catch (_) {}
    finally {
      setSentimentLoading(false);
    }
  };

  const loadCorrelation = async () => {
    setCorrelationLoading(true);
    setCorrelationError(null);
    try {
      const data = await apiService.getWhaleCorrelation();
      setCorrelation(data);
    } catch (e) {
      setCorrelationError(e.message);
    } finally {
      setCorrelationLoading(false);
    }
  };

  const loadSignals = async () => {
    setSignalsLoading(true);
    setSignalsError(null);
    try {
      const data = await apiService.getPredictiveSignals();
      setSignals(data);
    } catch (e) {
      setSignalsError(e.message);
    } finally {
      setSignalsLoading(false);
    }
  };

  // ── Effects ──────────────────────────────────────────────────
  useEffect(() => {
    loadWhalesData();
    loadTelegramConfig();
    const interval = setInterval(loadWhalesData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tab === 'trades' && !tradesData.length && !tradesLoading) loadTrades();
    if (tab === 'ai-wallet' && !aiScores.length && !aiScoresLoading) loadAiScores();
    if (tab === 'ai-token' && !sentiment && !sentimentLoading) loadSentiment();
    if (tab === 'analytics' && !correlation && !correlationLoading) loadCorrelation();
    if (tab === 'risk' && !signals && !signalsLoading) loadSignals();
  }, [tab]); // eslint-disable-line

  // ── Actions ──────────────────────────────────────────────────
  const handleDeleteWhale = async () => {
    if (!whaleToDelete) return;
    try {
      setDeleteLoading(true);
      await apiService.deleteWhale(whaleToDelete.address);
      setShowDeleteModal(false);
      setWhaleToDelete(null);
      await loadWhalesData();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddWhale = async () => {
    if (!addAddress.trim()) return;
    setAddLoading(true);
    setAddError(null);
    try {
      await apiService.addWhale(addAddress.trim(), addNickname.trim() || undefined);
      setShowAddModal(false);
      setAddAddress('');
      setAddNickname('');
      await loadWhalesData();
    } catch (e) {
      setAddError(e.message);
    } finally {
      setAddLoading(false);
    }
  };

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

  // ── Computed ─────────────────────────────────────────────────
  const globalMetrics = {
    totalValue: whalesData.reduce((s, w) => s + (w.account_value || 0), 0),
    totalPnl: whalesData.reduce((s, w) => s + (w.unrealized_pnl || 0), 0),
    totalPositions: whalesData.reduce((s, w) => s + (w.active_positions?.length || 0), 0),
    totalWhales: whalesData.length,
    totalLongs: whalesData.reduce((s, w) => s + (w.active_positions?.filter(p => p.size > 0).length || 0), 0),
    totalShorts: whalesData.reduce((s, w) => s + (w.active_positions?.filter(p => p.size < 0).length || 0), 0),
  };

  const liquidationData = {
    '1D': { total: 2340000, trades: 12, profit: 450000, longs: 8, shorts: 4 },
    '7D': { total: 8920000, trades: 67, profit: 1890000, longs: 42, shorts: 25 },
    '1M': { total: 24500000, trades: 234, profit: 4870000, longs: 145, shorts: 89 },
  };

  // All open orders across all whales
  const allOrders = whalesData.flatMap(w =>
    (w.orders || []).map(o => ({ ...o, whale: w }))
  );

  // Simulator allocation
  const simulatorAllocation = (() => {
    const coinVolume = {};
    whalesData.forEach(w => {
      (w.active_positions || []).forEach(p => {
        const c = p.coin;
        if (!coinVolume[c]) coinVolume[c] = { value: 0, longs: 0, shorts: 0 };
        coinVolume[c].value += Math.abs(p.position_value || 0);
        if (p.size > 0) coinVolume[c].longs++; else coinVolume[c].shorts++;
      });
    });
    const total = Object.values(coinVolume).reduce((s, v) => s + v.value, 0);
    if (!total) return [];
    return Object.entries(coinVolume)
      .map(([coin, v]) => ({
        coin,
        pct: (v.value / total) * 100,
        amount: (v.value / total) * simulatorCapital,
        consensus: v.longs >= v.shorts ? 'LONG' : 'SHORT',
        longs: v.longs,
        shorts: v.shorts,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 15);
  })();

  // Leaderboard sorted whales
  const leaderboard = [...whalesData].sort((a, b) => {
    if (lbSort === 'pnl') return (b.unrealized_pnl || 0) - (a.unrealized_pnl || 0);
    if (lbSort === 'value') return (b.account_value || 0) - (a.account_value || 0);
    return (b.active_positions?.length || 0) - (a.active_positions?.length || 0);
  });

  // ── Helpers ──────────────────────────────────────────────────
  const fmt = (v) => {
    if (!v && v !== 0) return '$0';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
  };

  const fmtAddr = (a) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';

  const fmtDate = (ts) => {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleString('pt-BR'); } catch { return ts; }
  };

  const riskColor = (r) =>
    r === 'Alto' ? 'bg-red-500/20 text-red-400' :
    r === 'Médio' ? 'bg-yellow-500/20 text-yellow-400' :
    'bg-green-500/20 text-green-400';

  const statusColor = systemStatus === 'online' ? 'green' : systemStatus === 'warning' ? 'yellow' : 'red';

  const tierColor = (tier) => ({
    'S-Tier': 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    'A-Tier': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    'B-Tier': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    'C-Tier': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    'D-Tier': 'bg-red-500/20 text-red-400 border border-red-500/30',
  }[tier] || 'bg-slate-600/20 text-slate-400');

  const DbUnavailable = ({ msg }) => (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <Database className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm">{msg || 'Banco de dados não conectado'}</p>
      <p className="text-xs mt-1 opacity-60">Configure DATABASE_URL no Render para habilitar</p>
    </div>
  );

  const TabSpinner = () => (
    <div className="flex items-center justify-center py-16">
      <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
      <style>{`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(15,23,42,.5); border-radius:8px; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(180deg,#3b82f6,#8b5cf6); border-radius:8px; }
      `}</style>

      {/* ── Header ── */}
      <div className="border-b border-slate-700/50 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1900px] mx-auto">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Hyperliquid Pro</h1>
                <p className="text-[10px] text-slate-400">Rastreamento institucional</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 bg-${statusColor}-500/10 border border-${statusColor}-500/30 px-2.5 py-1 rounded text-xs`}>
                <div className={`w-1.5 h-1.5 bg-${statusColor}-400 rounded-full animate-pulse`} />
                <span className="font-medium">
                  {systemStatus === 'online' ? '🟢' : systemStatus === 'warning' ? '🟡' : '🔴'} Live · {whalesData.length}
                </span>
              </div>
              <button onClick={loadWhalesData} className="p-1.5 hover:bg-slate-800 rounded" disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button className="p-1.5 hover:bg-slate-800 rounded">
                <Bell className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setAddError(null); setShowAddModal(true); }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-3 py-1.5 rounded text-sm font-medium shadow-lg shadow-blue-500/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Wallet
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 overflow-x-auto pb-0.5 px-4">
            {[
              { id: 'command',   icon: Target,      label: 'Command'    },
              { id: 'positions', icon: BarChart3,    label: 'Positions'  },
              { id: 'trades',    icon: Activity,     label: 'Trades'     },
              { id: 'orders',    icon: Clock,        label: 'Orders'     },
              { id: 'ai-token',  icon: Brain,        label: 'AI Token'   },
              { id: 'ai-wallet', icon: Users,        label: 'AI Wallet'  },
              { id: 'analytics', icon: Layers,       label: 'Analytics'  },
              { id: 'risk',      icon: Shield,       label: 'Risk'       },
              { id: 'simulator', icon: PlayCircle,   label: 'Simulator'  },
              { id: 'board',     icon: Award,        label: 'Leaderboard'},
              { id: 'settings',  icon: Settings,     label: 'Settings'   },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-medium whitespace-nowrap transition-colors ${
                    tab === t.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-[1900px] mx-auto p-4">

        {/* Global loading */}
        {loading && !whalesData.length && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
              <p className="text-slate-400">Carregando dados das whales…</p>
            </div>
          </div>
        )}

        {/* Global error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
            <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        {/* ════ COMMAND ════ */}
        {tab === 'command' && !loading && (
          <div className="space-y-4">
            {/* Metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase mb-1">Total Value</p>
                <p className="text-xl font-bold text-green-400">{fmt(globalMetrics.totalValue)}</p>
                <p className="text-xs text-slate-400">{globalMetrics.totalWhales} whales</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase mb-1">Open Pos</p>
                <p className="text-xl font-bold text-blue-400">{globalMetrics.totalPositions}</p>
                <p className="text-xs text-slate-400">posições</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase mb-1">PnL Total</p>
                <p className={`text-xl font-bold ${globalMetrics.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {fmt(globalMetrics.totalPnl)}
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase mb-1">LONGS</p>
                <p className="text-xl font-bold text-green-400">{globalMetrics.totalLongs}</p>
                <p className="text-xs text-slate-400">
                  {((globalMetrics.totalLongs / (globalMetrics.totalPositions || 1)) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs uppercase mb-1">SHORTS</p>
                <p className="text-xl font-bold text-orange-400">{globalMetrics.totalShorts}</p>
                <p className="text-xs text-slate-400">
                  {((globalMetrics.totalShorts / (globalMetrics.totalPositions || 1)) * 100).toFixed(1)}%
                </p>
              </div>
              {Object.entries(liquidationData).map(([period, data]) => (
                <div
                  key={period}
                  onClick={() => setExpandedMetric(expandedMetric === period ? null : period)}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-slate-400 text-xs uppercase">Liq {period}</p>
                    {expandedMetric === period ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </div>
                  <p className="text-lg font-bold text-red-400">{fmt(data.total)}</p>
                  {expandedMetric === period && (
                    <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-slate-400">Lucro:</span><span className="text-green-400">{fmt(data.profit)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-slate-400">LONGs:</span><span className="text-green-400">{data.longs}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-slate-400">SHORTs:</span><span className="text-orange-400">{data.shorts}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-slate-400">Média:</span><span className="text-blue-400">{fmt(data.total / data.trades)}</span></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Whale list */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Whales Ativas ({whalesData.length})</h2>
                {lastUpdate && <span className="text-xs text-slate-500">Atualizado {lastUpdate.toLocaleTimeString('pt-BR')}</span>}
              </div>
              <div className="space-y-3">
                {whalesData.map((whale) => (
                  <div key={whale.address} className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {whale.nickname && <span className="font-semibold text-sm">{whale.nickname}</span>}
                          <a href={`https://hypurrscan.io/address/${whale.address}`} target="_blank" rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 font-mono text-xs flex items-center gap-1">
                            {fmtAddr(whale.address)}<ExternalLink className="w-3 h-3" />
                          </a>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${riskColor(whale.liquidation_risk)}`}>
                            {whale.liquidation_risk}
                          </span>
                          {whale.error && <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">erro</span>}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div><p className="text-slate-400 text-xs">Valor Conta</p><p className="font-bold text-green-400">{fmt(whale.account_value)}</p></div>
                          <div><p className="text-slate-400 text-xs">Margem Usada</p><p className="font-bold">{fmt(whale.total_margin_used)}</p></div>
                          <div><p className="text-slate-400 text-xs">PnL</p><p className={`font-bold ${whale.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(whale.unrealized_pnl)}</p></div>
                          <div><p className="text-slate-400 text-xs">Posições</p><p className="font-bold text-blue-400">{whale.active_positions?.length || 0}</p></div>
                        </div>
                        {whale.active_positions?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <p className="text-xs text-slate-400 mb-2">Posições:</p>
                            <div className="flex flex-wrap gap-2">
                              {whale.active_positions.slice(0, 6).map((pos, i) => (
                                <div key={i} className="bg-slate-800/50 px-2 py-1 rounded text-xs flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${pos.size > 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                                  <span className="font-bold">{pos.coin}</span>
                                  <span className={pos.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>{fmt(pos.unrealized_pnl)}</span>
                                </div>
                              ))}
                              {whale.active_positions.length > 6 && (
                                <span className="text-xs text-slate-500">+{whale.active_positions.length - 6}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <button onClick={() => { setWhaleToDelete(whale); setShowDeleteModal(true); }}
                        className="p-2 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors ml-2 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs text-slate-500">Última atualização: {fmtDate(whale.last_update)}</div>
                  </div>
                ))}
                {!whalesData.length && (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Nenhuma whale monitorada. Clique em Add Wallet para começar.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════ POSITIONS ════ */}
        {tab === 'positions' && !loading && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-bold">Posições Abertas ({globalMetrics.totalPositions})</h2>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm font-bold">LONG: {globalMetrics.totalLongs}</span>
                <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded text-sm font-bold">SHORT: {globalMetrics.totalShorts}</span>
              </div>
            </div>
            {globalMetrics.totalPositions === 0
              ? <p className="text-slate-500 text-center py-8">Nenhuma posição aberta no momento.</p>
              : <div className="space-y-2">
                  {whalesData.flatMap(whale =>
                    (whale.active_positions || []).map((pos, i) => (
                      <div key={`${whale.address}-${i}`}
                        className={`bg-slate-900/50 rounded-lg p-4 border-l-4 ${pos.unrealized_pnl >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{pos.coin}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${pos.size > 0 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                              {pos.size > 0 ? 'LONG' : 'SHORT'}
                            </span>
                            {whale.nickname && <span className="text-xs text-slate-400">{whale.nickname}</span>}
                            <a href={`https://hypurrscan.io/address/${whale.address}`} target="_blank" rel="noopener noreferrer"
                              className="text-slate-500 hover:text-blue-400 font-mono text-xs">
                              {fmtAddr(whale.address)}
                            </a>
                          </div>
                          <span className={`text-sm font-bold ${pos.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {fmt(pos.unrealized_pnl)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-2 text-sm">
                          <div><p className="text-slate-400 text-xs">Tamanho</p><p className="font-medium">{Math.abs(pos.size).toFixed(4)}</p></div>
                          <div><p className="text-slate-400 text-xs">Entrada</p><p className="font-medium">${pos.entry_price?.toFixed(2)}</p></div>
                          <div><p className="text-slate-400 text-xs">Mark</p><p className="font-medium">${pos.mark_px?.toFixed(2) || '—'}</p></div>
                          <div><p className="text-slate-400 text-xs">Alavancagem</p><p className="font-medium text-yellow-400">{pos.leverage?.toFixed(1) || '—'}x</p></div>
                          <div><p className="text-slate-400 text-xs">Liquidação</p><p className="font-medium text-red-400">{pos.liquidation_px ? `$${pos.liquidation_px.toFixed(2)}` : 'N/A'}</p></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
            }
          </div>
        )}

        {/* ════ TRADES ════ */}
        {tab === 'trades' && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-blue-400" /> Histórico de Trades</h2>
              <button onClick={loadTrades} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                <RefreshCw className={`w-3.5 h-3.5 ${tradesLoading ? 'animate-spin' : ''}`} /> Atualizar
              </button>
            </div>
            {tradesLoading ? <TabSpinner />
              : tradesError ? (tradesError.includes('503') || tradesError.includes('Banco')
                  ? <DbUnavailable />
                  : <p className="text-red-400 text-sm">{tradesError}</p>)
              : tradesData.length === 0
                ? <DbUnavailable msg="Nenhum trade registrado ainda" />
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 text-xs border-b border-slate-700">
                          <th className="text-left py-2 pr-4">Wallet</th>
                          <th className="text-left py-2 pr-4">Token</th>
                          <th className="text-left py-2 pr-4">Side</th>
                          <th className="text-right py-2 pr-4">Tamanho</th>
                          <th className="text-right py-2 pr-4">Entrada</th>
                          <th className="text-right py-2 pr-4">PnL</th>
                          <th className="text-left py-2 pr-4">Status</th>
                          <th className="text-left py-2">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tradesData.map((t, i) => (
                          <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30">
                            <td className="py-2 pr-4 font-mono text-xs text-slate-400">{fmtAddr(t.wallet)}</td>
                            <td className="py-2 pr-4 font-bold">{t.token || t.coin || '—'}</td>
                            <td className="py-2 pr-4">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                String(t.side).toLowerCase().includes('long') || String(t.side) === 'B'
                                  ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}>{t.side}</span>
                            </td>
                            <td className="py-2 pr-4 text-right">{Number(t.size || 0).toFixed(4)}</td>
                            <td className="py-2 pr-4 text-right">{t.entry_price ? `$${Number(t.entry_price).toFixed(2)}` : '—'}</td>
                            <td className={`py-2 pr-4 text-right font-bold ${Number(t.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {t.pnl != null ? fmt(Number(t.pnl)) : '—'}
                            </td>
                            <td className="py-2 pr-4">
                              <span className={`text-xs px-2 py-0.5 rounded ${t.status === 'closed' ? 'bg-slate-600/50 text-slate-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {t.status || '—'}
                              </span>
                            </td>
                            <td className="py-2 text-xs text-slate-500">{fmtDate(t.open_timestamp)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
            }
          </div>
        )}

        {/* ════ ORDERS ════ */}
        {tab === 'orders' && !loading && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-400" /> Ordens Abertas ({allOrders.length})
            </h2>
            {allOrders.length === 0
              ? (
                <div className="text-center py-12 text-slate-500">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma ordem aberta no momento.</p>
                </div>
              )
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs border-b border-slate-700">
                        <th className="text-left py-2 pr-4">Whale</th>
                        <th className="text-left py-2 pr-4">Token</th>
                        <th className="text-left py-2 pr-4">Tipo</th>
                        <th className="text-right py-2 pr-4">Preço</th>
                        <th className="text-right py-2 pr-4">Tamanho</th>
                        <th className="text-left py-2">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allOrders.map((o, i) => {
                        const isBuy = o.side === 'B' || String(o.side).toLowerCase().includes('buy') || String(o.side).toLowerCase().includes('long');
                        return (
                          <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30">
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-1.5">
                                {o.whale?.nickname && <span className="text-xs font-semibold">{o.whale.nickname}</span>}
                                <span className="font-mono text-xs text-slate-500">{fmtAddr(o.whale?.address)}</span>
                              </div>
                            </td>
                            <td className="py-2 pr-4 font-bold">{o.coin || '—'}</td>
                            <td className="py-2 pr-4">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${isBuy ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {isBuy ? 'COMPRA' : 'VENDA'}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-right">{o.limitPx ? `$${Number(o.limitPx).toFixed(2)}` : '—'}</td>
                            <td className="py-2 pr-4 text-right">{o.sz || o.size || '—'}</td>
                            <td className="py-2 text-xs text-slate-500">
                              {o.timestamp ? new Date(o.timestamp).toLocaleString('pt-BR') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        )}

        {/* ════ AI TOKEN (market-sentiment) ════ */}
        {tab === 'ai-token' && (
          <div className="space-y-4">
            {sentimentLoading ? <TabSpinner />
              : !sentiment
                ? <DbUnavailable msg="Dados de sentimento indisponíveis" />
                : (
                  <>
                    {/* Overall sentiment */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="col-span-1 bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                        <p className="text-4xl mb-2">{sentiment.sentiment_icon}</p>
                        <p className="text-2xl font-bold mb-1">{sentiment.sentiment}</p>
                        <p className="text-xs text-slate-400">Sentimento Atual</p>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                        <p className="text-xs text-slate-400 uppercase mb-3">Distribuição de Posições</p>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-green-400 font-bold">LONG ({sentiment.positions?.total_longs || 0})</span>
                              <span className="text-green-400">{sentiment.bullish_percentage?.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${sentiment.bullish_percentage || 0}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-red-400 font-bold">SHORT ({sentiment.positions?.total_shorts || 0})</span>
                              <span className="text-red-400">{sentiment.bearish_percentage?.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: `${sentiment.bearish_percentage || 0}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 gap-2 text-xs">
                          <div><p className="text-slate-400">Vol Long</p><p className="font-bold text-green-400">{fmt(sentiment.positions?.volume_long)}</p></div>
                          <div><p className="text-slate-400">Vol Short</p><p className="font-bold text-red-400">{fmt(sentiment.positions?.volume_short)}</p></div>
                        </div>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                        <p className="text-xs text-slate-400 uppercase mb-3">Divergências (Top Whales)</p>
                        {(sentiment.divergences || []).length === 0
                          ? <p className="text-slate-500 text-sm">Nenhuma divergência detectada.</p>
                          : (sentiment.divergences || []).slice(0, 4).map((d, i) => (
                            <div key={i} className="mb-2 p-2 bg-slate-900/50 rounded text-xs">
                              <span className="font-bold text-yellow-400">{d.whale}</span>
                              <span className="text-slate-400 mx-1">em</span>
                              <span className="font-bold">{d.token}</span>
                              <span className={`ml-1 ${d.whale_position === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>{d.whale_position}</span>
                              <span className="text-slate-500 mx-1">vs maioria</span>
                              <span className={d.majority_position === 'LONG' ? 'text-green-400' : 'text-red-400'}>{d.majority_position}</span>
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${d.alert_level === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {d.alert_level}
                              </span>
                            </div>
                          ))
                        }
                      </div>
                    </div>

                    {/* Hot tokens */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                      <h3 className="font-bold mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Hot Tokens</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-slate-400 text-xs border-b border-slate-700">
                              <th className="text-left py-2 pr-4">Token</th>
                              <th className="text-right py-2 pr-4">Whales</th>
                              <th className="text-right py-2 pr-4">Longs</th>
                              <th className="text-right py-2 pr-4">Shorts</th>
                              <th className="text-right py-2 pr-4">Volume</th>
                              <th className="text-left py-2">Consenso</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(sentiment.hot_tokens || []).map((t, i) => (
                              <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30">
                                <td className="py-2 pr-4 font-bold">{t.token}</td>
                                <td className="py-2 pr-4 text-right">{t.whale_count}</td>
                                <td className="py-2 pr-4 text-right text-green-400">{t.longs}</td>
                                <td className="py-2 pr-4 text-right text-red-400">{t.shorts}</td>
                                <td className="py-2 pr-4 text-right">{fmt(t.total_volume)}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                    t.consensus === 'LONG' ? 'bg-green-500/20 text-green-400' :
                                    t.consensus === 'SHORT' ? 'bg-red-500/20 text-red-400' :
                                    'bg-yellow-500/20 text-yellow-400'
                                  }`}>{t.consensus}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )
            }
          </div>
        )}

        {/* ════ AI WALLET (whale-scores) ════ */}
        {tab === 'ai-wallet' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Brain className="w-5 h-5 text-purple-400" /> Whale Intelligence Scores</h2>
              <button onClick={loadAiScores} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                <RefreshCw className={`w-3.5 h-3.5 ${aiScoresLoading ? 'animate-spin' : ''}`} /> Atualizar
              </button>
            </div>
            {aiScoresLoading ? <TabSpinner />
              : aiScoresError ? (aiScoresError.includes('503') ? <DbUnavailable /> : <p className="text-red-400 text-sm">{aiScoresError}</p>)
              : aiScores.length === 0
                ? <DbUnavailable msg="Banco não conectado — scores indisponíveis" />
                : (
                  <div className="space-y-3">
                    {aiScores.map((s, i) => (
                      <div key={s.address} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                        <div className="flex items-start justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                              {i + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{s.nickname}</span>
                                <a href={`https://hypurrscan.io/address/${s.address}`} target="_blank" rel="noopener noreferrer"
                                  className="text-xs font-mono text-slate-400 hover:text-blue-400 flex items-center gap-0.5">
                                  {fmtAddr(s.address)}<ExternalLink className="w-2.5 h-2.5" />
                                </a>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${tierColor(s.tier)}`}>{s.tier}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                {Array.from({ length: 5 }).map((_, j) => (
                                  <Star key={j} className={`w-3 h-3 ${j < s.stars ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                                ))}
                                <span className="text-xs text-slate-400 ml-1">{s.intelligence_score} pts</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-400">{s.intelligence_score}</p>
                            <p className="text-xs text-slate-400">{s.total_trades} trades</p>
                          </div>
                        </div>
                        {/* Score bars */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 text-xs">
                          {[
                            { label: 'Win Rate', val: s.breakdown?.win_rate, suffix: '%', color: 'blue' },
                            { label: 'Sharpe', val: (s.breakdown?.sharpe_ratio * 25).toFixed(0), suffix: '', color: 'purple' },
                            { label: 'Consistência', val: s.breakdown?.consistency, suffix: '', color: 'green' },
                            { label: 'PnL 7D', val: s.breakdown?.recent_pnl_7d >= 0 ? 'positivo' : 'negativo', suffix: '', color: s.breakdown?.recent_pnl_7d >= 0 ? 'green' : 'red', raw: fmt(s.breakdown?.recent_pnl_7d) },
                            { label: 'PnL Total', val: null, raw: fmt(s.total_pnl), color: s.total_pnl >= 0 ? 'green' : 'red' },
                          ].map((m, j) => (
                            <div key={j} className="bg-slate-900/50 rounded-lg p-2">
                              <p className="text-slate-400 mb-1">{m.label}</p>
                              <p className={`font-bold text-${m.color}-400`}>{m.raw || `${m.val}${m.suffix}`}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
            }
          </div>
        )}

        {/* ════ ANALYTICS (correlation) ════ */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Layers className="w-5 h-5 text-cyan-400" /> Correlação entre Whales</h2>
              <button onClick={loadCorrelation} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                <RefreshCw className={`w-3.5 h-3.5 ${correlationLoading ? 'animate-spin' : ''}`} /> Atualizar
              </button>
            </div>
            {correlationLoading ? <TabSpinner />
              : correlationError ? (correlationError.includes('503') ? <DbUnavailable /> : <p className="text-red-400 text-sm">{correlationError}</p>)
              : !correlation
                ? <DbUnavailable />
                : (
                  <>
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-cyan-400">{correlation.total_pairs_analyzed}</p>
                        <p className="text-xs text-slate-400">Pares Analisados</p>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-blue-400">{correlation.significant_correlations}</p>
                        <p className="text-xs text-slate-400">Correlações Sig.</p>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-purple-400">{correlation.highly_correlated_groups?.length || 0}</p>
                        <p className="text-xs text-slate-400">Grupos Detectados</p>
                      </div>
                    </div>

                    {/* Groups */}
                    {(correlation.highly_correlated_groups || []).length > 0 && (
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                        <h3 className="font-bold mb-3 text-sm text-slate-300">Grupos Altamente Correlacionados (≥75%)</h3>
                        <div className="flex flex-wrap gap-3">
                          {correlation.highly_correlated_groups.map((g) => (
                            <div key={g.group_id} className="bg-slate-900/50 border border-purple-500/30 rounded-lg p-3">
                              <p className="text-xs font-bold text-purple-400 mb-1">Grupo {g.group_id} · {g.size} whales</p>
                              <div className="flex flex-wrap gap-1">
                                {g.members.map((m) => (
                                  <span key={m} className="text-xs bg-slate-700 px-2 py-0.5 rounded">{m}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pairs table */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                      <h3 className="font-bold mb-3 text-sm text-slate-300">Pares Correlacionados</h3>
                      {(correlation.correlation_matrix || []).length === 0
                        ? <p className="text-slate-500 text-sm text-center py-4">Sem posições suficientes para calcular correlação.</p>
                        : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-slate-400 text-xs border-b border-slate-700">
                                  <th className="text-left py-2 pr-4">Whale 1</th>
                                  <th className="text-left py-2 pr-4">Whale 2</th>
                                  <th className="text-right py-2 pr-4">Correlação</th>
                                  <th className="text-right py-2">Tokens Comuns</th>
                                </tr>
                              </thead>
                              <tbody>
                                {correlation.correlation_matrix.map((p, i) => (
                                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30">
                                    <td className="py-2 pr-4 text-xs">{p.whale1}</td>
                                    <td className="py-2 pr-4 text-xs">{p.whale2}</td>
                                    <td className="py-2 pr-4 text-right">
                                      <span className={`font-bold text-sm ${p.correlation >= 80 ? 'text-purple-400' : p.correlation >= 65 ? 'text-blue-400' : 'text-slate-300'}`}>
                                        {p.correlation}%
                                      </span>
                                    </td>
                                    <td className="py-2 text-right text-slate-400">{p.common_tokens}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      }
                    </div>
                  </>
                )
            }
          </div>
        )}

        {/* ════ RISK (predictive-signals) ════ */}
        {tab === 'risk' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-red-400" /> Sinais Preditivos & Risco</h2>
              <button onClick={loadSignals} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                <RefreshCw className={`w-3.5 h-3.5 ${signalsLoading ? 'animate-spin' : ''}`} /> Atualizar
              </button>
            </div>

            {/* Liquidation risk from live data */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-400" /> Risco de Liquidação por Whale</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {whalesData.map(w => (
                  <div key={w.address} className={`rounded-lg p-3 border ${
                    w.liquidation_risk === 'Alto' ? 'border-red-500/50 bg-red-500/10' :
                    w.liquidation_risk === 'Médio' ? 'border-yellow-500/50 bg-yellow-500/10' :
                    'border-green-500/30 bg-green-500/5'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">{w.nickname || fmtAddr(w.address)}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${riskColor(w.liquidation_risk)}`}>{w.liquidation_risk}</span>
                    </div>
                    <div className="text-xs text-slate-400">{w.active_positions?.length || 0} posições · {fmt(w.account_value)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Predictive signals */}
            {signalsLoading ? <TabSpinner />
              : signalsError ? (signalsError.includes('503') ? <DbUnavailable msg="Sinais preditivos requerem banco de dados" /> : <p className="text-red-400 text-sm">{signalsError}</p>)
              : signals && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="font-bold text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Sinais Preditivos (últimas 4h)</h3>
                    <div className="flex gap-2 text-xs">
                      <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">🟢 {signals.strong_buy_count} BUY</span>
                      <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-bold">🟡 {signals.caution_count} CAUTION</span>
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold">🔵 {signals.watch_count} WATCH</span>
                    </div>
                  </div>
                  {(signals.signals || []).length === 0
                    ? <p className="text-slate-500 text-sm text-center py-4">Nenhum sinal detectado no período.</p>
                    : (
                      <div className="space-y-2">
                        {signals.signals.map((s, i) => (
                          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                            s.signal_type === 'STRONG BUY' ? 'bg-green-500/10 border-green-500/30' :
                            s.signal_type === 'CAUTION' ? 'bg-yellow-500/10 border-yellow-500/30' :
                            'bg-blue-500/10 border-blue-500/30'
                          }`}>
                            <span className="text-lg shrink-0">{s.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                  s.signal_type === 'STRONG BUY' ? 'bg-green-500/20 text-green-400' :
                                  s.signal_type === 'CAUTION' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}>{s.signal_type}</span>
                                <span className="font-bold">{s.token}</span>
                                <span className="text-xs text-slate-400">Confiança: {s.confidence}%</span>
                              </div>
                              <p className="text-xs text-slate-300 mt-1">{s.reason}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-slate-400">Volume</p>
                              <p className="text-sm font-bold">{fmt(s.volume)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </div>
              )
            }
          </div>
        )}

        {/* ════ SIMULATOR ════ */}
        {tab === 'simulator' && !loading && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 max-w-md">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <PlayCircle className="w-5 h-5 text-green-400" /> Simulador de Alocação
              </h2>
              <p className="text-sm text-slate-400 mb-4">Simule como seu capital seria alocado seguindo as posições atuais das whales (proporcional ao volume).</p>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Capital para simular (USD)</label>
                <input
                  type="number"
                  value={simulatorCapital}
                  onChange={e => setSimulatorCapital(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  min="1"
                />
              </div>
            </div>

            {simulatorAllocation.length === 0
              ? (
                <div className="text-center py-12 text-slate-500">
                  <PlayCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma posição ativa para simular.</p>
                </div>
              )
              : (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <h3 className="font-bold text-sm mb-3">Alocação Simulada — {fmt(simulatorCapital)}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 text-xs border-b border-slate-700">
                          <th className="text-left py-2 pr-4">#</th>
                          <th className="text-left py-2 pr-4">Token</th>
                          <th className="text-left py-2 pr-4">Consenso</th>
                          <th className="text-right py-2 pr-4">% Capital</th>
                          <th className="text-right py-2 pr-4">Valor ($)</th>
                          <th className="text-right py-2">Whales (L/S)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simulatorAllocation.map((a, i) => (
                          <tr key={a.coin} className="border-b border-slate-800 hover:bg-slate-800/30">
                            <td className="py-2 pr-4 text-slate-500 text-xs">{i + 1}</td>
                            <td className="py-2 pr-4 font-bold">{a.coin}</td>
                            <td className="py-2 pr-4">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${a.consensus === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {a.consensus}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-right font-medium">{a.pct.toFixed(1)}%</td>
                            <td className="py-2 pr-4 text-right font-bold text-blue-400">{fmt(a.amount)}</td>
                            <td className="py-2 text-right text-xs">
                              <span className="text-green-400">{a.longs}L</span>
                              <span className="text-slate-500"> / </span>
                              <span className="text-red-400">{a.shorts}S</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Bar chart */}
                  <div className="mt-4 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={simulatorAllocation.slice(0, 10)} margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="coin" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-35} textAnchor="end" />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                        <Tooltip formatter={(v) => `${v.toFixed(1)}%`} contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                        <Bar dataKey="pct" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            }
          </div>
        )}

        {/* ════ LEADERBOARD ════ */}
        {tab === 'board' && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Leaderboard</h2>
              <div className="flex gap-2 text-xs">
                {[{ id: 'pnl', label: 'PnL' }, { id: 'value', label: 'Valor' }, { id: 'positions', label: 'Posições' }].map(s => (
                  <button key={s.id} onClick={() => setLbSort(s.id)}
                    className={`px-3 py-1 rounded font-medium transition-colors ${lbSort === s.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {leaderboard.length === 0
              ? <p className="text-slate-500 text-center py-12">Nenhuma whale monitorada.</p>
              : (
                <div className="space-y-2">
                  {leaderboard.map((w, i) => (
                    <div key={w.address} className={`bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4 ${i < 3 ? 'border-opacity-100' : ''} ${
                      i === 0 ? 'border-yellow-500/40 bg-yellow-500/5' : i === 1 ? 'border-slate-400/40' : i === 2 ? 'border-amber-700/40' : ''
                    }`}>
                      <div className="text-2xl w-8 text-center shrink-0">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-base text-slate-500 font-bold">{i + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {w.nickname && <span className="font-semibold">{w.nickname}</span>}
                          <a href={`https://hypurrscan.io/address/${w.address}`} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-mono text-slate-400 hover:text-blue-400 flex items-center gap-0.5">
                            {fmtAddr(w.address)}<ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${riskColor(w.liquidation_risk)}`}>{w.liquidation_risk}</span>
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-slate-400">
                          <span>{w.active_positions?.length || 0} posições</span>
                          <span>{fmt(w.account_value)} conta</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xl font-bold ${w.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {w.unrealized_pnl >= 0 ? <TrendingUp className="w-4 h-4 inline mr-1" /> : <TrendingDown className="w-4 h-4 inline mr-1" />}
                          {fmt(w.unrealized_pnl)}
                        </p>
                        <p className="text-xs text-slate-400">PnL não realizado</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ════ SETTINGS ════ */}
        {tab === 'settings' && (
          <div className="max-w-xl mx-auto space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-blue-400" /> Configurações</h2>
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
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
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
                    <input type={showToken ? 'text' : 'password'} value={tgToken} onChange={e => setTgToken(e.target.value)}
                      placeholder={tgConfigured ? '••••••••••' : 'Cole o token do @BotFather'}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-blue-500" />
                    <button onClick={() => setShowToken(v => !v)} className="absolute right-2 top-2 text-slate-400 hover:text-white">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Chat ID</label>
                  <input type="text" value={tgChatId} onChange={e => setTgChatId(e.target.value)}
                    placeholder="Ex: -1001234567890"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                  <p className="text-xs text-slate-500 mt-1">Obtenha via @userinfobot no Telegram</p>
                </div>
              </div>
              {tgError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{tgError}
                </div>
              )}
              {tgSaved && (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 text-sm text-green-400">
                  <CheckCircle className="w-4 h-4 shrink-0" />Salvo! Você deve ter recebido uma mensagem de teste no Telegram.
                </div>
              )}
              <button onClick={handleSaveTelegramConfig} disabled={tgSaving || (!tgToken && !tgChatId)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all">
                {tgSaving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando…</> : <><Send className="w-4 h-4" /> Salvar e enviar teste</>}
              </button>
              <p className="text-xs text-slate-500">As credenciais são salvas no banco de dados do servidor.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete modal ── */}
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
              Remover a whale{' '}
              <span className="font-mono text-blue-400">{whaleToDelete?.nickname || fmtAddr(whaleToDelete?.address)}</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setWhaleToDelete(null); }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors" disabled={deleteLoading}>
                Cancelar
              </button>
              <button onClick={handleDeleteWhale}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2" disabled={deleteLoading}>
                {deleteLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Excluindo…</> : <><Trash2 className="w-4 h-4" /> Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Wallet modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-blue-400" /> Adicionar Whale</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Endereço (0x…)</label>
                <input type="text" value={addAddress} onChange={e => setAddAddress(e.target.value)}
                  placeholder="0x0000000000000000000000000000000000000000"
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Apelido (opcional)</label>
                <input type="text" value={addNickname} onChange={e => setAddNickname(e.target.value)}
                  placeholder="Ex: Whale Alpha"
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            {addError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0" />{addError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handleAddWhale} disabled={addLoading || !addAddress.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2">
                {addLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Adicionando…</> : <><Plus className="w-4 h-4" /> Adicionar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
