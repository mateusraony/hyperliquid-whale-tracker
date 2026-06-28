import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Bell, Activity, Target, Brain, Award, BarChart3,
  Clock, Users, Layers, Shield, PlayCircle, AlertTriangle, ExternalLink, Trash2,
  RefreshCw, ChevronDown, ChevronUp, X, Settings, Send, Eye, EyeOff, CheckCircle,
  Plus, Trophy, Zap, Database, Star, Wallet, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import apiService from '../api-service';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (v) => {
  if (v === null || v === undefined) return '$0';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const fmtFull = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

const fmtAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

const fmtDate = (ts) => {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('pt-BR'); } catch { return ts; }
};

const pnlClass = (v) => (v >= 0 ? 'text-emerald-400' : 'text-red-400');

const riskBadge = (r) =>
  r === 'Alto'  ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
  r === 'Médio' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';

const riskBorderLeft = (r) =>
  r === 'Alto'  ? 'border-l-red-500' :
  r === 'Médio' ? 'border-l-amber-500' :
                  'border-l-emerald-500';

const tierBadge = (tier) => ({
  'S-Tier': 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
  'A-Tier': 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  'B-Tier': 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  'C-Tier': 'bg-slate-500/20 text-slate-300 border border-slate-500/40',
  'D-Tier': 'bg-red-500/20 text-red-300 border border-red-500/40',
}[tier] || 'bg-slate-600/20 text-slate-400');

// ─── sub-components ──────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color = 'white', icon: Icon }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-slate-600" />}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, icon: Icon, iconClass = 'text-blue-400', action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${iconClass}`} />}
        {title}
      </h2>
      {action}
    </div>
  );
}

function TabSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );
}

function DbUnavailable({ msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <Database className="w-10 h-10 text-slate-600" />
      <p className="text-slate-400 text-sm font-medium">{msg || 'Banco de dados não conectado'}</p>
      <p className="text-slate-600 text-xs">Configure DATABASE_URL no Render para habilitar este recurso</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <Icon className="w-10 h-10 text-slate-700" />
      <p className="text-slate-400 font-medium">{title}</p>
      {sub && <p className="text-slate-600 text-xs">{sub}</p>}
    </div>
  );
}

function RefreshBtn({ onClick, loading, label = 'Atualizar' }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      {label}
    </button>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function HyperliquidPro() {
  // core
  const [tab, setTab] = useState('command');
  const [expandedMetric, setExpandedMetric] = useState(null);
  const [systemStatus, setSystemStatus] = useState('online');

  // whale data
  const [whalesData, setWhalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [whaleToDelete, setWhaleToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAddress, setAddAddress] = useState('');
  const [addNickname, setAddNickname] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

  // telegram settings
  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [tgEnabled, setTgEnabled] = useState(true);
  const [tgTokenMasked, setTgTokenMasked] = useState('');
  const [tgConfigured, setTgConfigured] = useState(false);
  const [tgSaving, setTgSaving] = useState(false);
  const [tgSaved, setTgSaved] = useState(false);
  const [tgError, setTgError] = useState(null);
  const [showToken, setShowToken] = useState(false);

  // lazy tab data
  const [tradesData, setTradesData] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [tradesError, setTradesError] = useState(null);

  const [aiScores, setAiScores] = useState([]);
  const [aiScoresLoading, setAiScoresLoading] = useState(false);
  const [aiScoresError, setAiScoresError] = useState(null);

  const [sentiment, setSentiment] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);

  const [correlation, setCorrelation] = useState(null);
  const [correlationLoading, setCorrelationLoading] = useState(false);
  const [correlationError, setCorrelationError] = useState(null);

  const [signals, setSignals] = useState(null);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signalsError, setSignalsError] = useState(null);

  const [simulatorCapital, setSimulatorCapital] = useState(10000);
  const [lbSort, setLbSort] = useState('pnl');

  // ── loaders ────────────────────────────────────────────────────────────────

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
    setTradesLoading(true); setTradesError(null);
    try { const d = await apiService.getTrades(200); setTradesData(d.trades || []); }
    catch (e) { setTradesError(e.message); }
    finally { setTradesLoading(false); }
  };

  const loadAiScores = async () => {
    setAiScoresLoading(true); setAiScoresError(null);
    try { const d = await apiService.getAiWhaleScores(); setAiScores(d.whale_scores || []); }
    catch (e) { setAiScoresError(e.message); }
    finally { setAiScoresLoading(false); }
  };

  const loadSentiment = async () => {
    setSentimentLoading(true);
    try { const d = await apiService.getMarketSentiment(); setSentiment(d); }
    catch (_) {}
    finally { setSentimentLoading(false); }
  };

  const loadCorrelation = async () => {
    setCorrelationLoading(true); setCorrelationError(null);
    try { const d = await apiService.getWhaleCorrelation(); setCorrelation(d); }
    catch (e) { setCorrelationError(e.message); }
    finally { setCorrelationLoading(false); }
  };

  const loadSignals = async () => {
    setSignalsLoading(true); setSignalsError(null);
    try { const d = await apiService.getPredictiveSignals(); setSignals(d); }
    catch (e) { setSignalsError(e.message); }
    finally { setSignalsLoading(false); }
  };

  // ── effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadWhalesData();
    loadTelegramConfig();
    const iv = setInterval(loadWhalesData, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (tab === 'trades'    && !tradesData.length   && !tradesLoading)      loadTrades();
    if (tab === 'ai-wallet' && !aiScores.length     && !aiScoresLoading)    loadAiScores();
    if (tab === 'ai-token'  && !sentiment           && !sentimentLoading)   loadSentiment();
    if (tab === 'analytics' && !correlation         && !correlationLoading) loadCorrelation();
    if (tab === 'risk'      && !signals             && !signalsLoading)     loadSignals();
  }, [tab]); // eslint-disable-line

  // ── actions ────────────────────────────────────────────────────────────────

  const handleDeleteWhale = async () => {
    if (!whaleToDelete) return;
    setDeleteLoading(true);
    try {
      await apiService.deleteWhale(whaleToDelete.address);
      setShowDeleteModal(false);
      setWhaleToDelete(null);
      await loadWhalesData();
    } catch (err) { setError(err.message); }
    finally { setDeleteLoading(false); }
  };

  const handleAddWhale = async () => {
    if (!addAddress.trim()) return;
    setAddLoading(true); setAddError(null);
    try {
      await apiService.addWhale(addAddress.trim(), addNickname.trim() || undefined);
      setShowAddModal(false);
      setAddAddress(''); setAddNickname('');
      await loadWhalesData();
    } catch (e) { setAddError(e.message); }
    finally { setAddLoading(false); }
  };

  const handleSaveTelegramConfig = async () => {
    setTgSaving(true); setTgError(null); setTgSaved(false);
    try {
      await apiService.saveTelegramConfig({ token: tgToken || undefined, chatId: tgChatId || undefined, enabled: tgEnabled });
      setTgSaved(true); setTgToken(''); setShowToken(false);
      await loadTelegramConfig();
      setTimeout(() => setTgSaved(false), 4000);
    } catch (e) { setTgError(e.message); }
    finally { setTgSaving(false); }
  };

  // ── derived data ───────────────────────────────────────────────────────────

  const globalMetrics = {
    totalValue:     whalesData.reduce((s, w) => s + (w.account_value || 0), 0),
    totalPnl:       whalesData.reduce((s, w) => s + (w.unrealized_pnl || 0), 0),
    totalPositions: whalesData.reduce((s, w) => s + (w.active_positions?.length || 0), 0),
    totalWhales:    whalesData.length,
    totalLongs:     whalesData.reduce((s, w) => s + (w.active_positions?.filter(p => p.size > 0).length || 0), 0),
    totalShorts:    whalesData.reduce((s, w) => s + (w.active_positions?.filter(p => p.size < 0).length || 0), 0),
  };

  const liquidationData = {
    '1D': { total: 2_340_000, trades: 12, profit: 450_000, longs: 8,   shorts: 4  },
    '7D': { total: 8_920_000, trades: 67, profit: 1_890_000, longs: 42, shorts: 25 },
    '1M': { total: 24_500_000, trades: 234, profit: 4_870_000, longs: 145, shorts: 89 },
  };

  const allOrders = whalesData.flatMap(w => (w.orders || []).map(o => ({ ...o, whale: w })));

  const simulatorAllocation = (() => {
    const cv = {};
    whalesData.forEach(w =>
      (w.active_positions || []).forEach(p => {
        if (!cv[p.coin]) cv[p.coin] = { value: 0, longs: 0, shorts: 0 };
        cv[p.coin].value += Math.abs(p.position_value || 0);
        p.size > 0 ? cv[p.coin].longs++ : cv[p.coin].shorts++;
      })
    );
    const total = Object.values(cv).reduce((s, v) => s + v.value, 0);
    if (!total) return [];
    return Object.entries(cv)
      .map(([coin, v]) => ({ coin, pct: (v.value / total) * 100, amount: (v.value / total) * simulatorCapital, ...v, consensus: v.longs >= v.shorts ? 'LONG' : 'SHORT' }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 15);
  })();

  const leaderboard = [...whalesData].sort((a, b) =>
    lbSort === 'pnl'       ? (b.unrealized_pnl || 0)           - (a.unrealized_pnl || 0) :
    lbSort === 'value'     ? (b.account_value || 0)             - (a.account_value || 0) :
                             (b.active_positions?.length || 0)  - (a.active_positions?.length || 0)
  );

  // ── tab definitions ────────────────────────────────────────────────────────

  const TABS = [
    { id: 'command',   icon: Target,      label: 'Command'     },
    { id: 'positions', icon: BarChart3,   label: 'Positions'   },
    { id: 'trades',    icon: Activity,    label: 'Trades'      },
    { id: 'orders',    icon: Clock,       label: 'Orders'      },
    { id: 'ai-token',  icon: Brain,       label: 'AI Token'    },
    { id: 'ai-wallet', icon: Users,       label: 'AI Wallet'   },
    { id: 'analytics', icon: Layers,      label: 'Analytics'   },
    { id: 'risk',      icon: Shield,      label: 'Risk'        },
    { id: 'simulator', icon: PlayCircle,  label: 'Simulator'   },
    { id: 'board',     icon: Award,       label: 'Leaderboard' },
    { id: 'settings',  icon: Settings,    label: 'Settings'    },
  ];

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
      <style>{`
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#334155; border-radius:6px; }
        ::-webkit-scrollbar-thumb:hover { background:#475569; }
      `}</style>

      {/* ═══ HEADER ═══════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <p className="font-bold text-sm">Hyperliquid Pro</p>
                <p className="text-[10px] text-slate-500">Whale Tracker</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Live badge — all classes are static (no dynamic Tailwind) */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                systemStatus === 'online'  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                systemStatus === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                             'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  systemStatus === 'online' ? 'bg-emerald-400' :
                  systemStatus === 'warning' ? 'bg-amber-400' : 'bg-red-400'
                }`} />
                {systemStatus === 'online' ? 'Live' : systemStatus === 'warning' ? 'Aviso' : 'Offline'} · {whalesData.length} whales
              </div>

              {lastUpdate && (
                <span className="text-[10px] text-slate-600 hidden sm:block">
                  {lastUpdate.toLocaleTimeString('pt-BR')}
                </span>
              )}

              <button onClick={loadWhalesData} disabled={loading}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <Bell className="w-4 h-4" />
              </button>

              <button onClick={() => { setAddError(null); setShowAddModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-blue-500/20">
                <Plus className="w-3.5 h-3.5" /> Add Wallet
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                    active
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═════════════════════════════════════════════════════ */}
      <main className="max-w-screen-2xl mx-auto px-4 py-5">

        {/* Global error banner */}
        {error && (
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── COMMAND ─────────────────────────────────────────────────────── */}
        {tab === 'command' && (
          <div className="space-y-5">
            {loading && !whalesData.length
              ? <TabSpinner />
              : (
              <>
                {/* Row 1 — main metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  <MetricCard
                    label="Portfolio Total" icon={Wallet}
                    value={fmt(globalMetrics.totalValue)}
                    sub={`${globalMetrics.totalWhales} whales monitoradas`}
                    color="text-emerald-400"
                  />
                  <MetricCard
                    label="PnL Não Realizado" icon={globalMetrics.totalPnl >= 0 ? TrendingUp : TrendingDown}
                    value={fmt(globalMetrics.totalPnl)}
                    sub={globalMetrics.totalPnl >= 0 ? 'Lucro acumulado' : 'Prejuízo acumulado'}
                    color={globalMetrics.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}
                  />
                  <MetricCard
                    label="Posições Abertas" icon={BarChart3}
                    value={globalMetrics.totalPositions}
                    sub={`${globalMetrics.totalWhales} whales ativas`}
                    color="text-blue-400"
                  />
                  <MetricCard
                    label="LONGS" icon={ArrowUpRight}
                    value={globalMetrics.totalLongs}
                    sub={`${((globalMetrics.totalLongs / (globalMetrics.totalPositions || 1)) * 100).toFixed(1)}% do total`}
                    color="text-emerald-400"
                  />
                  <MetricCard
                    label="SHORTS" icon={ArrowDownRight}
                    value={globalMetrics.totalShorts}
                    sub={`${((globalMetrics.totalShorts / (globalMetrics.totalPositions || 1)) * 100).toFixed(1)}% do total`}
                    color="text-orange-400"
                  />
                </div>

                {/* Row 2 — liquidation (mock) */}
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(liquidationData).map(([period, data]) => (
                    <div key={period} onClick={() => setExpandedMetric(expandedMetric === period ? null : period)}
                      className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 cursor-pointer hover:border-slate-600 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Liquidações {period}</p>
                        {expandedMetric === period ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                      </div>
                      <p className="text-xl font-bold text-red-400">{fmt(data.total)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{data.trades} trades</p>
                      {expandedMetric === period && (
                        <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 gap-2 text-xs">
                          <div><p className="text-slate-500 mb-0.5">Lucro</p><p className="font-semibold text-emerald-400">{fmt(data.profit)}</p></div>
                          <div><p className="text-slate-500 mb-0.5">Média/trade</p><p className="font-semibold text-blue-400">{fmt(data.total / data.trades)}</p></div>
                          <div><p className="text-slate-500 mb-0.5">LONGs</p><p className="font-semibold text-emerald-400">{data.longs}</p></div>
                          <div><p className="text-slate-500 mb-0.5">SHORTs</p><p className="font-semibold text-orange-400">{data.shorts}</p></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Whale list */}
                <div>
                  <SectionHeader title={`Whales Monitoradas (${whalesData.length})`} icon={Users} />
                  {whalesData.length === 0
                    ? <EmptyState icon={Wallet} title="Nenhuma whale adicionada" sub='Clique em "Add Wallet" para começar a monitorar' />
                    : (
                      <div className="space-y-3">
                        {whalesData.map(w => (
                          <div key={w.address}
                            className={`bg-slate-800/50 border border-slate-700/50 border-l-4 ${riskBorderLeft(w.liquidation_risk)} rounded-xl p-4 hover:bg-slate-800/70 transition-colors`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                {/* Header row */}
                                <div className="flex items-center gap-2 flex-wrap mb-3">
                                  {w.nickname && (
                                    <span className="font-bold text-sm">{w.nickname}</span>
                                  )}
                                  <a href={`https://hypurrscan.io/address/${w.address}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="font-mono text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
                                    {fmtAddr(w.address)}<ExternalLink className="w-3 h-3 ml-0.5" />
                                  </a>
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${riskBadge(w.liquidation_risk)}`}>
                                    Risco {w.liquidation_risk}
                                  </span>
                                  {w.error && <span className="text-[11px] bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">erro</span>}
                                </div>

                                {/* Metrics row */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div>
                                    <p className="text-slate-500 text-xs mb-0.5">Valor Conta</p>
                                    <p className="font-bold text-emerald-400">{fmt(w.account_value)}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 text-xs mb-0.5">Margem Usada</p>
                                    <p className="font-semibold">{fmt(w.total_margin_used)}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 text-xs mb-0.5">PnL</p>
                                    <p className={`font-bold ${pnlClass(w.unrealized_pnl)}`}>{fmt(w.unrealized_pnl)}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 text-xs mb-0.5">Posições</p>
                                    <p className="font-bold text-blue-400">{w.active_positions?.length || 0}</p>
                                  </div>
                                </div>

                                {/* Position pills */}
                                {w.active_positions?.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                    {w.active_positions.slice(0, 8).map((p, i) => (
                                      <span key={i} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${
                                        p.size > 0
                                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                          : 'bg-red-500/10 border-red-500/20 text-red-300'
                                      }`}>
                                        <span className="font-bold">{p.coin}</span>
                                        <span className={pnlClass(p.unrealized_pnl)}>{fmt(p.unrealized_pnl)}</span>
                                      </span>
                                    ))}
                                    {w.active_positions.length > 8 && (
                                      <span className="px-2 py-1 text-xs text-slate-500">+{w.active_positions.length - 8}</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <button onClick={() => { setWhaleToDelete(w); setShowDeleteModal(true); }}
                                className="shrink-0 p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <p className="text-[10px] text-slate-600 mt-2">Atualizado: {fmtDate(w.last_update)}</p>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </div>
              </>
            )}
          </div>
        )}

        {/* ── POSITIONS ───────────────────────────────────────────────────── */}
        {tab === 'positions' && (
          <div>
            <SectionHeader
              title={`Posições Abertas (${globalMetrics.totalPositions})`}
              icon={BarChart3}
              action={
                <div className="flex gap-2 text-xs font-bold">
                  <span className="px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full">
                    ▲ LONG {globalMetrics.totalLongs}
                  </span>
                  <span className="px-3 py-1 bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded-full">
                    ▼ SHORT {globalMetrics.totalShorts}
                  </span>
                </div>
              }
            />
            {loading ? <TabSpinner /> :
              globalMetrics.totalPositions === 0
                ? <EmptyState icon={BarChart3} title="Nenhuma posição aberta" sub="As posições das whales serão exibidas aqui" />
                : (
                  <div className="space-y-2">
                    {whalesData.flatMap(whale =>
                      (whale.active_positions || []).map((pos, i) => (
                        <div key={`${whale.address}-${i}`}
                          className={`bg-slate-800/50 border border-slate-700/50 border-l-4 ${pos.unrealized_pnl >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'} rounded-xl p-4`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-lg">{pos.coin}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                    pos.size > 0
                                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                      : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                                  }`}>
                                    {pos.size > 0 ? 'LONG' : 'SHORT'}
                                  </span>
                                  <span className="text-xs text-slate-500">{whale.nickname || fmtAddr(whale.address)}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2 text-sm">
                                  <div><p className="text-slate-500 text-xs">Tamanho</p><p className="font-semibold">{Math.abs(pos.size).toFixed(4)}</p></div>
                                  <div><p className="text-slate-500 text-xs">Entrada</p><p className="font-semibold">${pos.entry_price?.toFixed(2)}</p></div>
                                  <div><p className="text-slate-500 text-xs">Mark</p><p className="font-semibold">${pos.mark_px?.toFixed(2) || '—'}</p></div>
                                  <div><p className="text-slate-500 text-xs">Alavancagem</p><p className="font-semibold text-amber-400">{pos.leverage?.toFixed(1) || '—'}×</p></div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-xl font-bold ${pnlClass(pos.unrealized_pnl)}`}>{fmt(pos.unrealized_pnl)}</p>
                              <p className="text-xs text-red-400 mt-1">
                                Liq: {pos.liquidation_px ? `$${pos.liquidation_px.toFixed(2)}` : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )
            }
          </div>
        )}

        {/* ── TRADES ──────────────────────────────────────────────────────── */}
        {tab === 'trades' && (
          <div>
            <SectionHeader title="Histórico de Trades" icon={Activity} iconClass="text-blue-400"
              action={<RefreshBtn onClick={loadTrades} loading={tradesLoading} />} />
            {tradesLoading ? <TabSpinner />
              : tradesError
                ? (tradesError.includes('503') ? <DbUnavailable /> : <p className="text-red-400 text-sm">{tradesError}</p>)
              : tradesData.length === 0
                ? <DbUnavailable msg="Nenhum trade registrado ainda" />
              : (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900/60">
                        <tr className="text-slate-400 text-xs">
                          <th className="text-left px-4 py-3 font-medium">Wallet</th>
                          <th className="text-left px-4 py-3 font-medium">Token</th>
                          <th className="text-left px-4 py-3 font-medium">Side</th>
                          <th className="text-right px-4 py-3 font-medium">Tamanho</th>
                          <th className="text-right px-4 py-3 font-medium">Entrada</th>
                          <th className="text-right px-4 py-3 font-medium">PnL</th>
                          <th className="text-left px-4 py-3 font-medium">Status</th>
                          <th className="text-left px-4 py-3 font-medium">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {tradesData.map((t, i) => {
                          const isLong = String(t.side).toLowerCase().includes('long') || t.side === 'B';
                          return (
                            <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs text-slate-400">{fmtAddr(t.wallet)}</td>
                              <td className="px-4 py-3 font-bold">{t.token || t.coin || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                  isLong ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
                                }`}>{t.side}</span>
                              </td>
                              <td className="px-4 py-3 text-right">{Number(t.size || 0).toFixed(4)}</td>
                              <td className="px-4 py-3 text-right">{t.entry_price ? `$${Number(t.entry_price).toFixed(2)}` : '—'}</td>
                              <td className={`px-4 py-3 text-right font-bold ${pnlClass(Number(t.pnl || 0))}`}>
                                {t.pnl != null ? fmt(Number(t.pnl)) : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  t.status === 'closed' ? 'bg-slate-700 text-slate-400' : 'bg-blue-500/20 text-blue-400'
                                }`}>{t.status || '—'}</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(t.open_timestamp)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
          </div>
        )}

        {/* ── ORDERS ──────────────────────────────────────────────────────── */}
        {tab === 'orders' && (
          <div>
            <SectionHeader title={`Ordens Abertas (${allOrders.length})`} icon={Clock} iconClass="text-amber-400" />
            {loading ? <TabSpinner />
              : allOrders.length === 0
                ? <EmptyState icon={Clock} title="Nenhuma ordem aberta" sub="As ordens abertas das whales aparecerão aqui" />
              : (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900/60">
                        <tr className="text-slate-400 text-xs">
                          <th className="text-left px-4 py-3 font-medium">Whale</th>
                          <th className="text-left px-4 py-3 font-medium">Token</th>
                          <th className="text-left px-4 py-3 font-medium">Tipo</th>
                          <th className="text-right px-4 py-3 font-medium">Preço Limite</th>
                          <th className="text-right px-4 py-3 font-medium">Tamanho</th>
                          <th className="text-left px-4 py-3 font-medium">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {allOrders.map((o, i) => {
                          const isBuy = o.side === 'B' || String(o.side).toLowerCase().includes('buy');
                          return (
                            <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-3">
                                <span className="text-xs font-medium">{o.whale?.nickname || fmtAddr(o.whale?.address)}</span>
                              </td>
                              <td className="px-4 py-3 font-bold">{o.coin || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                  isBuy ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
                                }`}>{isBuy ? 'COMPRA' : 'VENDA'}</span>
                              </td>
                              <td className="px-4 py-3 text-right">{o.limitPx ? `$${Number(o.limitPx).toFixed(2)}` : '—'}</td>
                              <td className="px-4 py-3 text-right">{o.sz || o.size || '—'}</td>
                              <td className="px-4 py-3 text-xs text-slate-500">
                                {o.timestamp ? new Date(o.timestamp).toLocaleString('pt-BR') : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
          </div>
        )}

        {/* ── AI TOKEN ────────────────────────────────────────────────────── */}
        {tab === 'ai-token' && (
          <div className="space-y-4">
            <SectionHeader title="Sentimento de Mercado" icon={Brain} iconClass="text-purple-400"
              action={<RefreshBtn onClick={loadSentiment} loading={sentimentLoading} />} />
            {sentimentLoading ? <TabSpinner />
              : !sentiment
                ? <DbUnavailable msg="Dados de sentimento indisponíveis" />
              : (
                <>
                  {/* Top row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Sentiment card */}
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2">
                      <p className="text-5xl">{sentiment.sentiment_icon}</p>
                      <p className="text-xl font-bold">{sentiment.sentiment}</p>
                      <p className="text-xs text-slate-500">Sentimento Global</p>
                    </div>

                    {/* Long/Short breakdown */}
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Distribuição</p>
                      <div className="space-y-3">
                        {[
                          { label: 'LONG', count: sentiment.positions?.total_longs || 0, pct: sentiment.bullish_percentage || 0, color: 'bg-emerald-500', text: 'text-emerald-400' },
                          { label: 'SHORT', count: sentiment.positions?.total_shorts || 0, pct: sentiment.bearish_percentage || 0, color: 'bg-red-500', text: 'text-red-400' },
                        ].map(({ label, count, pct, color, text }) => (
                          <div key={label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className={`font-bold ${text}`}>{label} ({count})</span>
                              <span className={text}>{pct.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700 text-xs">
                        <div><p className="text-slate-500 mb-0.5">Vol Long</p><p className="font-bold text-emerald-400">{fmt(sentiment.positions?.volume_long)}</p></div>
                        <div><p className="text-slate-500 mb-0.5">Vol Short</p><p className="font-bold text-red-400">{fmt(sentiment.positions?.volume_short)}</p></div>
                      </div>
                    </div>

                    {/* Divergences */}
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Divergências Smart Money</p>
                      {(sentiment.divergences || []).length === 0
                        ? <p className="text-slate-600 text-xs text-center pt-4">Nenhuma divergência detectada</p>
                        : (sentiment.divergences || []).slice(0, 4).map((d, i) => (
                          <div key={i} className="mb-2 last:mb-0 p-2.5 bg-slate-900/50 rounded-lg text-xs border border-slate-700/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-amber-400">{d.whale} · {d.token}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                d.alert_level === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                              }`}>{d.alert_level}</span>
                            </div>
                            <p className="text-slate-400">
                              <span className={d.whale_position === 'LONG' ? 'text-emerald-400' : 'text-red-400'}>{d.whale_position}</span>
                              <span className="text-slate-600 mx-1">vs maioria</span>
                              <span className={d.majority_position === 'LONG' ? 'text-emerald-400' : 'text-red-400'}>{d.majority_position}</span>
                            </p>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* Hot tokens table */}
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="font-semibold text-sm">Hot Tokens</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-900/40">
                          <tr className="text-slate-400 text-xs">
                            <th className="text-left px-4 py-3 font-medium">Token</th>
                            <th className="text-center px-4 py-3 font-medium">Whales</th>
                            <th className="text-center px-4 py-3 font-medium">Longs</th>
                            <th className="text-center px-4 py-3 font-medium">Shorts</th>
                            <th className="text-right px-4 py-3 font-medium">Volume</th>
                            <th className="text-center px-4 py-3 font-medium">Consenso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {(sentiment.hot_tokens || []).map((t, i) => (
                            <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-3 font-bold">{t.token}</td>
                              <td className="px-4 py-3 text-center text-slate-300">{t.whale_count}</td>
                              <td className="px-4 py-3 text-center text-emerald-400 font-semibold">{t.longs}</td>
                              <td className="px-4 py-3 text-center text-red-400 font-semibold">{t.shorts}</td>
                              <td className="px-4 py-3 text-right font-medium">{fmt(t.total_volume)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                  t.consensus === 'LONG'  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                                  t.consensus === 'SHORT' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                                                            'bg-amber-500/15 text-amber-400 border-amber-500/30'
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

        {/* ── AI WALLET ───────────────────────────────────────────────────── */}
        {tab === 'ai-wallet' && (
          <div className="space-y-3">
            <SectionHeader title="Whale Intelligence Scores" icon={Brain} iconClass="text-purple-400"
              action={<RefreshBtn onClick={loadAiScores} loading={aiScoresLoading} />} />
            {aiScoresLoading ? <TabSpinner />
              : aiScoresError ? (aiScoresError.includes('503') ? <DbUnavailable /> : <p className="text-red-400 text-sm">{aiScoresError}</p>)
              : aiScores.length === 0 ? <DbUnavailable msg="Banco não conectado — scores indisponíveis" />
              : aiScores.map((s, i) => (
                <div key={s.address} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold text-sm shrink-0 shadow-lg">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Name + badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold">{s.nickname}</span>
                        <a href={`https://hypurrscan.io/address/${s.address}`} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-xs text-slate-400 hover:text-blue-400 flex items-center gap-0.5">
                          {fmtAddr(s.address)}<ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tierBadge(s.tier)}`}>{s.tier}</span>
                      </div>
                      {/* Stars */}
                      <div className="flex items-center gap-1 mb-3">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className={`w-3.5 h-3.5 ${j < s.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                        ))}
                        <span className="text-xs text-slate-500 ml-1">{s.total_trades} trades</span>
                      </div>
                      {/* Score breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-slate-900/50 rounded-lg p-2.5">
                          <p className="text-slate-500 mb-1">Win Rate</p>
                          <p className="font-bold text-blue-400">{s.breakdown?.win_rate?.toFixed(1)}%</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-2.5">
                          <p className="text-slate-500 mb-1">Sharpe Ratio</p>
                          <p className="font-bold text-purple-400">{s.breakdown?.sharpe_ratio?.toFixed(2)}</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-2.5">
                          <p className="text-slate-500 mb-1">Consistência</p>
                          <p className="font-bold text-emerald-400">{s.breakdown?.consistency?.toFixed(1)}</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-2.5">
                          <p className="text-slate-500 mb-1">PnL 7D</p>
                          <p className={`font-bold ${pnlClass(s.breakdown?.recent_pnl_7d)}`}>{fmt(s.breakdown?.recent_pnl_7d)}</p>
                        </div>
                      </div>
                    </div>
                    {/* Big score */}
                    <div className="text-right shrink-0">
                      <p className="text-3xl font-black text-blue-400">{s.intelligence_score}</p>
                      <p className="text-xs text-slate-500">/ 100</p>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ── ANALYTICS ───────────────────────────────────────────────────── */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            <SectionHeader title="Correlação entre Whales" icon={Layers} iconClass="text-cyan-400"
              action={<RefreshBtn onClick={loadCorrelation} loading={correlationLoading} />} />
            {correlationLoading ? <TabSpinner />
              : correlationError ? (correlationError.includes('503') ? <DbUnavailable /> : <p className="text-red-400 text-sm">{correlationError}</p>)
              : !correlation ? <DbUnavailable />
              : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Pares Analisados',    val: correlation.total_pairs_analyzed,    color: 'text-cyan-400' },
                      { label: 'Correlações Sig.',     val: correlation.significant_correlations, color: 'text-blue-400' },
                      { label: 'Grupos Detectados',   val: correlation.highly_correlated_groups?.length || 0, color: 'text-purple-400' },
                    ].map(m => (
                      <div key={m.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
                        <p className={`text-2xl font-bold ${m.color}`}>{m.val}</p>
                        <p className="text-xs text-slate-500 mt-1">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {(correlation.highly_correlated_groups || []).length > 0 && (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Grupos Correlacionados ≥ 75%</p>
                      <div className="flex flex-wrap gap-3">
                        {correlation.highly_correlated_groups.map(g => (
                          <div key={g.group_id} className="bg-slate-900/50 border border-purple-500/30 rounded-lg p-3">
                            <p className="text-xs font-bold text-purple-400 mb-2">Grupo {g.group_id} · {g.size} whales</p>
                            <div className="flex flex-wrap gap-1">
                              {g.members.map(m => <span key={m} className="text-xs bg-slate-700/70 px-2 py-0.5 rounded">{m}</span>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700/50">
                      <span className="font-semibold text-sm">Pares Correlacionados</span>
                    </div>
                    {(correlation.correlation_matrix || []).length === 0
                      ? <EmptyState icon={Layers} title="Sem posições suficientes para correlacionar" />
                      : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-900/40">
                              <tr className="text-slate-400 text-xs">
                                <th className="text-left px-4 py-3 font-medium">Whale 1</th>
                                <th className="text-left px-4 py-3 font-medium">Whale 2</th>
                                <th className="text-right px-4 py-3 font-medium">Correlação</th>
                                <th className="text-right px-4 py-3 font-medium">Tokens Comuns</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {correlation.correlation_matrix.map((p, i) => (
                                <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                                  <td className="px-4 py-3 text-xs">{p.whale1}</td>
                                  <td className="px-4 py-3 text-xs">{p.whale2}</td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={`font-bold ${p.correlation >= 80 ? 'text-purple-400' : p.correlation >= 65 ? 'text-blue-400' : 'text-slate-300'}`}>
                                      {p.correlation}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-400">{p.common_tokens}</td>
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

        {/* ── RISK ────────────────────────────────────────────────────────── */}
        {tab === 'risk' && (
          <div className="space-y-5">
            <SectionHeader title="Risco & Sinais Preditivos" icon={Shield} iconClass="text-red-400"
              action={<RefreshBtn onClick={loadSignals} loading={signalsLoading} />} />

            {/* Liquidation risk grid (from live data) */}
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Risco de Liquidação por Whale</p>
              {loading ? <TabSpinner /> :
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {whalesData.map(w => (
                    <div key={w.address} className={`rounded-xl p-4 border ${
                      w.liquidation_risk === 'Alto'  ? 'bg-red-500/10 border-red-500/30' :
                      w.liquidation_risk === 'Médio' ? 'bg-amber-500/10 border-amber-500/30' :
                                                       'bg-slate-800/60 border-slate-700/50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{w.nickname || fmtAddr(w.address)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${riskBadge(w.liquidation_risk)}`}>
                          {w.liquidation_risk}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-400">
                        <span>{w.active_positions?.length || 0} posições</span>
                        <span>{fmt(w.account_value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>

            {/* Predictive signals */}
            {signalsLoading ? <TabSpinner />
              : signalsError ? (signalsError.includes('503') ? <DbUnavailable msg="Sinais preditivos requerem banco de dados" /> : <p className="text-red-400 text-sm">{signalsError}</p>)
              : signals && (
                <div>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Sinais Preditivos (últimas 4h)
                    </p>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full font-bold">🟢 {signals.strong_buy_count} BUY</span>
                      <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full font-bold">🟡 {signals.caution_count} CAUTION</span>
                      <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-full font-bold">🔵 {signals.watch_count} WATCH</span>
                    </div>
                  </div>
                  {(signals.signals || []).length === 0
                    ? <EmptyState icon={Zap} title="Nenhum sinal detectado" sub="Sinais aparecem quando top whales acumulam tokens em comum" />
                    : (
                      <div className="space-y-2">
                        {signals.signals.map((s, i) => (
                          <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${
                            s.signal_type === 'STRONG BUY' ? 'bg-emerald-500/10 border-emerald-500/30' :
                            s.signal_type === 'CAUTION'    ? 'bg-amber-500/10 border-amber-500/30' :
                                                             'bg-blue-500/10 border-blue-500/30'
                          }`}>
                            <span className="text-xl shrink-0">{s.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                  s.signal_type === 'STRONG BUY' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                                  s.signal_type === 'CAUTION'    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                                                                   'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                }`}>{s.signal_type}</span>
                                <span className="font-bold">{s.token}</span>
                                <span className="text-xs text-slate-400">Confiança: {s.confidence}%</span>
                              </div>
                              <p className="text-xs text-slate-300">{s.reason}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-slate-500 mb-0.5">Volume</p>
                              <p className="font-bold text-sm">{fmt(s.volume)}</p>
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

        {/* ── SIMULATOR ───────────────────────────────────────────────────── */}
        {tab === 'simulator' && (
          <div className="space-y-5">
            <SectionHeader title="Simulador de Alocação" icon={PlayCircle} iconClass="text-emerald-400" />

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 max-w-sm">
              <p className="text-sm text-slate-400 mb-4">Veja como seu capital seria distribuído seguindo as posições das whales.</p>
              <label className="text-xs text-slate-400 block mb-1.5">Capital (USD)</label>
              <input type="number" min="1" value={simulatorCapital}
                onChange={e => setSimulatorCapital(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
            </div>

            {simulatorAllocation.length === 0
              ? <EmptyState icon={PlayCircle} title="Nenhuma posição ativa para simular" sub="Adicione whales com posições abertas" />
              : (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                    <span className="font-semibold text-sm">Alocação Simulada</span>
                    <span className="text-sm text-slate-400">{fmtFull(simulatorCapital)}</span>
                  </div>
                  {/* Bar chart */}
                  <div className="p-4 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={simulatorAllocation.slice(0, 10)} margin={{ top: 0, right: 10, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="coin" tick={{ fill: '#64748b', fontSize: 10 }} angle={-30} textAnchor="end" />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                        <Tooltip
                          formatter={(v) => [`${v.toFixed(1)}%`, 'Alocação']}
                          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                        />
                        <Bar dataKey="pct" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900/40">
                        <tr className="text-slate-400 text-xs">
                          <th className="text-left px-4 py-3 font-medium">#</th>
                          <th className="text-left px-4 py-3 font-medium">Token</th>
                          <th className="text-left px-4 py-3 font-medium">Consenso</th>
                          <th className="text-right px-4 py-3 font-medium">% Capital</th>
                          <th className="text-right px-4 py-3 font-medium">Valor</th>
                          <th className="text-center px-4 py-3 font-medium">L / S</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {simulatorAllocation.map((a, i) => (
                          <tr key={a.coin} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 text-slate-500 text-xs">{i + 1}</td>
                            <td className="px-4 py-3 font-bold">{a.coin}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                a.consensus === 'LONG' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
                              }`}>{a.consensus}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">{a.pct.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-right font-bold text-blue-400">{fmt(a.amount)}</td>
                            <td className="px-4 py-3 text-center text-xs">
                              <span className="text-emerald-400">{a.longs}L</span>
                              <span className="text-slate-600 mx-1">/</span>
                              <span className="text-red-400">{a.shorts}S</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
          </div>
        )}

        {/* ── LEADERBOARD ─────────────────────────────────────────────────── */}
        {tab === 'board' && (
          <div className="space-y-4">
            <SectionHeader title="Leaderboard" icon={Trophy} iconClass="text-amber-400"
              action={
                <div className="flex gap-1">
                  {[{ id: 'pnl', label: 'PnL' }, { id: 'value', label: 'Valor' }, { id: 'positions', label: 'Posições' }].map(s => (
                    <button key={s.id} onClick={() => setLbSort(s.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        lbSort === s.id ? 'bg-blue-600 text-white' : 'bg-slate-700/60 text-slate-400 hover:text-white'
                      }`}>{s.label}
                    </button>
                  ))}
                </div>
              }
            />
            {loading ? <TabSpinner />
              : leaderboard.length === 0
                ? <EmptyState icon={Trophy} title="Nenhuma whale monitorada" />
              : (
                <div className="space-y-2">
                  {leaderboard.map((w, i) => (
                    <div key={w.address} className={`flex items-center gap-4 px-4 py-4 rounded-xl border transition-colors ${
                      i === 0 ? 'bg-amber-500/5 border-amber-500/30' :
                      i === 1 ? 'bg-slate-400/5 border-slate-400/20' :
                      i === 2 ? 'bg-orange-700/5 border-orange-700/20' :
                                'bg-slate-800/50 border-slate-700/50'
                    }`}>
                      {/* Rank */}
                      <div className="w-8 text-center shrink-0">
                        {i === 0 ? <span className="text-2xl">🥇</span> :
                         i === 1 ? <span className="text-2xl">🥈</span> :
                         i === 2 ? <span className="text-2xl">🥉</span> :
                         <span className="text-slate-500 font-bold">{i + 1}</span>}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {w.nickname && <span className="font-semibold">{w.nickname}</span>}
                          <a href={`https://hypurrscan.io/address/${w.address}`} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-xs text-slate-500 hover:text-blue-400 flex items-center gap-0.5">
                            {fmtAddr(w.address)}<ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold border ${riskBadge(w.liquidation_risk)}`}>
                            {w.liquidation_risk}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-slate-500">
                          <span>{w.active_positions?.length || 0} posições</span>
                          <span>{fmt(w.account_value)} conta</span>
                        </div>
                      </div>
                      {/* PnL */}
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-black flex items-center gap-1 ${pnlClass(w.unrealized_pnl)}`}>
                          {w.unrealized_pnl >= 0
                            ? <TrendingUp className="w-4 h-4" />
                            : <TrendingDown className="w-4 h-4" />
                          }
                          {fmt(w.unrealized_pnl)}
                        </p>
                        <p className="text-xs text-slate-500">PnL não realizado</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── SETTINGS ────────────────────────────────────────────────────── */}
        {tab === 'settings' && (
          <div className="max-w-lg">
            <SectionHeader title="Configurações" icon={Settings} />
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 space-y-5">
              {/* Toggle row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Send className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Telegram Bot</p>
                    <p className="text-xs text-slate-500">Alertas de posições, liquidações e resumos</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={tgEnabled} onChange={e => setTgEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {tgConfigured && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Token configurado: <span className="font-mono">{tgTokenMasked}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">
                    Bot Token {tgConfigured && <span className="text-slate-600">(deixe vazio para manter o atual)</span>}
                  </label>
                  <div className="relative">
                    <input type={showToken ? 'text' : 'password'} value={tgToken} onChange={e => setTgToken(e.target.value)}
                      placeholder={tgConfigured ? '••••••••••' : 'Cole o token do @BotFather'}
                      className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                    <button onClick={() => setShowToken(v => !v)} className="absolute right-3 top-2.5 text-slate-500 hover:text-white">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Chat ID</label>
                  <input type="text" value={tgChatId} onChange={e => setTgChatId(e.target.value)}
                    placeholder="Ex: -1001234567890"
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                  <p className="text-xs text-slate-600 mt-1">Obtenha via @userinfobot no Telegram</p>
                </div>
              </div>

              {tgError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{tgError}
                </div>
              )}
              {tgSaved && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4 shrink-0" />Salvo! Você deve ter recebido uma mensagem de teste.
                </div>
              )}

              <button onClick={handleSaveTelegramConfig} disabled={tgSaving || (!tgToken && !tgChatId)}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                {tgSaving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando…</> : <><Send className="w-4 h-4" /> Salvar e testar</>}
              </button>

              <p className="text-xs text-slate-600">As credenciais são salvas no banco de dados do servidor, não no código.</p>
            </div>
          </div>
        )}
      </main>

      {/* ═══ DELETE MODAL ══════════════════════════════════════════════════════ */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-red-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-slate-300 mb-1 text-sm">Remover a whale:</p>
            <div className="bg-slate-800/60 rounded-lg px-3 py-2 mb-5 text-sm">
              {whaleToDelete?.nickname && <span className="font-semibold mr-2">{whaleToDelete.nickname}</span>}
              <span className="font-mono text-blue-400">{fmtAddr(whaleToDelete?.address)}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setWhaleToDelete(null); }}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={handleDeleteWhale} disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                {deleteLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Excluindo…</> : <><Trash2 className="w-4 h-4" /> Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADD WALLET MODAL ══════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold flex items-center gap-2"><Plus className="w-4 h-4 text-blue-400" /> Adicionar Whale</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Endereço da Wallet</label>
                <input type="text" value={addAddress} onChange={e => setAddAddress(e.target.value)}
                  placeholder="0x0000…0000"
                  className="w-full bg-slate-800/60 border border-slate-600 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Apelido <span className="text-slate-600">(opcional)</span></label>
                <input type="text" value={addNickname} onChange={e => setAddNickname(e.target.value)}
                  placeholder="Ex: Whale Alpha"
                  className="w-full bg-slate-800/60 border border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
            </div>
            {addError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0" />{addError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={handleAddWhale} disabled={addLoading || !addAddress.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                {addLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Adicionando…</> : <><Plus className="w-4 h-4" /> Adicionar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
