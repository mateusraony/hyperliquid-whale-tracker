import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, Cell,
  RadialBarChart, RadialBar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Bell, Activity, Target, Brain, Award, BarChart3,
  Clock, Users, Layers, Shield, PlayCircle, AlertTriangle, ExternalLink, Trash2,
  RefreshCw, ChevronDown, ChevronUp, X, Settings, Send, Eye, EyeOff, CheckCircle,
  Plus, Trophy, Zap, Database, Star, Wallet, ArrowUpRight, ArrowDownRight, Info,
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

const parseTs = (ts) => {
  if (!ts) return null;
  // If no timezone suffix, treat as UTC (backend stores UTC without Z)
  const s = String(ts);
  const d = new Date(/[Zz+\-]\d{0,2}:?\d{0,2}$/.test(s) ? s : s + 'Z');
  return isNaN(d.getTime()) ? null : d;
};

const fmtDate = (ts) => {
  const d = parseTs(ts);
  if (!d) return '—';
  return d.toLocaleString('pt-BR');
};

const fmtRel = (ts) => {
  const d = parseTs(ts);
  if (!d) return '—';
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)   return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('pt-BR');
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

// narrative insight — plain language summary of what whales are doing right now
function generateNarrative(whalesData, globalMetrics) {
  if (!whalesData.length) return null;
  const { totalLongs, totalShorts, totalPositions, totalPnl, totalValue } = globalMetrics;
  const highRisk = whalesData.filter(w => w.liquidation_risk === 'Alto').length;
  const medRisk  = whalesData.filter(w => w.liquidation_risk === 'Médio').length;
  const pnlRatio = totalValue > 0 ? (totalPnl / totalValue) * 100 : 0;
  const bullPct  = totalPositions > 0 ? (totalLongs / totalPositions) * 100 : 50;

  // top coins by position count
  const coinCount = {};
  whalesData.forEach(w => (w.active_positions || []).forEach(p => {
    coinCount[p.coin] = (coinCount[p.coin] || 0) + 1;
  }));
  const topCoins = Object.entries(coinCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);

  const direction = bullPct >= 60 ? 'COMPRANDO' : bullPct <= 40 ? 'VENDENDO' : 'divididas';
  const dirEmoji  = bullPct >= 60 ? '🟢' : bullPct <= 40 ? '🔴' : '🟡';
  const dirColor  = bullPct >= 60 ? 'emerald' : bullPct <= 40 ? 'red' : 'amber';
  const pnlStr    = `${totalPnl >= 0 ? '+' : ''}${fmt(totalPnl)}`;
  const pnlWord   = totalPnl >= 0 ? 'lucro' : 'prejuízo';

  const sentences = [];
  if (totalPositions === 0) {
    sentences.push(`As ${whalesData.length} baleias monitoradas não têm posições abertas agora — aguardando oportunidade.`);
  } else {
    sentences.push(`As baleias estão ${direction} agora mesmo: ${totalLongs} apostando em ALTA e ${totalShorts} em QUEDA${topCoins.length ? ` — moedas mais negociadas: ${topCoins.join(', ')}` : ''}.`);
    sentences.push(`O portfólio total está ${pnlWord === 'lucro' ? 'em lucro de' : 'perdendo'} ${pnlStr} (${pnlRatio >= 0 ? '+' : ''}${pnlRatio.toFixed(1)}% do capital total de ${fmt(totalValue)}).`);
  }
  if (highRisk >= 1) sentences.push(`⚠️ ${highRisk} balei${highRisk > 1 ? 'as' : 'a'} com risco ALTO de liquidação — posições próximas ao limite de perda.`);
  else if (medRisk >= 2) sentences.push(`${medRisk} baleias com risco médio de liquidação — atenção.`);

  return { color: dirColor, emoji: dirEmoji, direction, bullPct, text: sentences.join(' ') };
}

function buildActivityFeed(whalesData) {
  const events = [];
  whalesData.forEach(w => {
    (w.active_positions || []).forEach(p => {
      events.push({
        whale: w.nickname || fmtAddr(w.address),
        coin: p.coin,
        side: p.size > 0 ? 'LONG' : 'SHORT',
        value: p.position_value || 0,
        pnl: p.unrealized_pnl || 0,
        leverage: p.leverage,
        risk: w.liquidation_risk,
      });
    });
  });
  return events.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

// ─── sub-components ──────────────────────────────────────────────────────────

function GlowCard({ label, value, sub, color = 'cyan', icon: Icon, trend, heat, sparkData, sparkColor }) {
  const border =
    color === 'cyan'    ? 'border-cyan-500/20 hover:border-cyan-500/40' :
    color === 'emerald' ? 'border-emerald-500/20 hover:border-emerald-500/40' :
    color === 'red'     ? 'border-red-500/20 hover:border-red-500/40' :
    color === 'amber'   ? 'border-amber-500/20 hover:border-amber-500/40' :
    color === 'purple'  ? 'border-purple-500/20 hover:border-purple-500/40' :
    color === 'orange'  ? 'border-orange-500/20 hover:border-orange-500/40' :
    color === 'blue'    ? 'border-blue-500/20 hover:border-blue-500/40' :
                          'border-cyan-500/20 hover:border-cyan-500/40';
  const glow =
    color === 'cyan'    ? 'shadow-cyan-500/5' :
    color === 'emerald' ? 'shadow-emerald-500/5' :
    color === 'red'     ? 'shadow-red-500/5' :
    color === 'amber'   ? 'shadow-amber-500/5' :
    color === 'purple'  ? 'shadow-purple-500/5' :
    color === 'orange'  ? 'shadow-orange-500/5' :
    color === 'blue'    ? 'shadow-blue-500/5' :
                          'shadow-cyan-500/5';
  const iconBg =
    color === 'cyan'    ? 'bg-cyan-500/10 text-cyan-400' :
    color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
    color === 'red'     ? 'bg-red-500/10 text-red-400' :
    color === 'amber'   ? 'bg-amber-500/10 text-amber-400' :
    color === 'purple'  ? 'bg-purple-500/10 text-purple-400' :
    color === 'orange'  ? 'bg-orange-500/10 text-orange-400' :
    color === 'blue'    ? 'bg-blue-500/10 text-blue-400' :
                          'bg-cyan-500/10 text-cyan-400';
  const valColor =
    color === 'cyan'    ? 'text-cyan-400' :
    color === 'emerald' ? 'text-emerald-400' :
    color === 'red'     ? 'text-red-400' :
    color === 'amber'   ? 'text-amber-400' :
    color === 'purple'  ? 'text-purple-400' :
    color === 'orange'  ? 'text-orange-400' :
    color === 'blue'    ? 'text-blue-400' :
                          'text-cyan-400';
  return (
    <div className={`bg-[#0a1628]/60 backdrop-blur border ${border} rounded-xl p-3.5 flex flex-col gap-2 shadow-lg ${glow} transition-all duration-200`}>
      <div className="flex items-center justify-between">
        <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest">{label}</p>
        {Icon && (
          <div className={`relative w-6 h-6 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className="w-3 h-3" />
            {heat > 70 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          </div>
        )}
      </div>
      <p className={`text-xl font-black font-mono tabular-nums ${valColor} leading-none`}>{value}</p>
      {sparkData && sparkData.length > 1 && (
        <div className="h-8 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line dataKey="v" stroke={sparkColor || '#22d3ee'} dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {(sub || trend !== undefined) && (
        <div className="flex items-center justify-between">
          {sub && <p className="text-[10px] text-slate-600">{sub}</p>}
          {trend !== undefined && (
            <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value, max = 100, color = 'cyan' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const fillFrom =
    color === 'cyan'    ? 'from-cyan-500 to-cyan-400' :
    color === 'emerald' ? 'from-emerald-500 to-emerald-400' :
    color === 'red'     ? 'from-red-500 to-red-400' :
    color === 'amber'   ? 'from-amber-500 to-amber-400' :
    color === 'purple'  ? 'from-purple-500 to-purple-400' :
    color === 'orange'  ? 'from-orange-500 to-orange-400' :
    color === 'blue'    ? 'from-blue-500 to-blue-400' :
                          'from-cyan-500 to-cyan-400';
  return (
    <div className="h-1 bg-[#0f2040] rounded-full overflow-hidden">
      <div className={`h-full bg-gradient-to-r ${fillFrom} rounded-full transition-all duration-700 relative overflow-hidden`}
        style={{ width: `${pct}%` }}>
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shine-sweep" />
      </div>
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
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
      <p className="text-xs text-slate-500">Carregando...</p>
    </div>
  );
}

function DbUnavailable({ msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-14 h-14 bg-slate-800/60 rounded-2xl flex items-center justify-center">
        <Database className="w-6 h-6 text-slate-600" />
      </div>
      <p className="text-slate-400 text-sm font-medium">{msg || 'Banco de dados não conectado'}</p>
      <p className="text-slate-600 text-xs">Configure DATABASE_URL no Render para habilitar</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-14 h-14 bg-slate-800/60 rounded-2xl flex items-center justify-center">
        <Icon className="w-6 h-6 text-slate-700" />
      </div>
      <p className="text-slate-400 font-medium">{title}</p>
      {sub && <p className="text-slate-600 text-xs">{sub}</p>}
    </div>
  );
}

function RefreshBtn({ onClick, loading, label = 'Atualizar' }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800/60 border border-transparent hover:border-slate-700/50">
      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      {label}
    </button>
  );
}

const CHART_STYLE = {
  contentStyle: { background: '#070e1c', border: '1px solid #0e2d4a', borderRadius: '10px', fontSize: 11, fontFamily: 'ui-monospace, monospace' },
  itemStyle: { color: '#22d3ee' },
};

// ─── main component ──────────────────────────────────────────────────────────

export default function HyperliquidPro() {
  const [tab, setTab] = useState('command');
  // eslint-disable-next-line no-unused-vars
  const [expandedMetric, setExpandedMetric] = useState(null);
  const [systemStatus, setSystemStatus] = useState('online');

  const [whalesData, setWhalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [lastUpdate, setLastUpdate] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [whaleToDelete, setWhaleToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addAddress, setAddAddress] = useState('');
  const [addNickname, setAddNickname] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [tgEnabled, setTgEnabled] = useState(true);
  const [tgTokenMasked, setTgTokenMasked] = useState('');
  const [tgConfigured, setTgConfigured] = useState(false);
  const [tgSaving, setTgSaving] = useState(false);
  const [tgSaved, setTgSaved] = useState(false);
  const [tgError, setTgError] = useState(null);
  const [showToken, setShowToken] = useState(false);

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
  const [now, setNow] = useState(new Date());
  const [flashPnl, setFlashPnl] = useState(null);
  const prevPnlRef = useRef(null);
  const [pnlHistory, setPnlHistory] = useState([]);
  const [valueHistory, setValueHistory] = useState([]);

  // ── loaders ────────────────────────────────────────────────────────────────

  const loadWhalesData = async () => {
    try {
      setLoading(true); setError(null);
      const data = await apiService.getWhales();
      setWhalesData(data.whales || []);
      setLastUpdate(new Date());
      setSystemStatus('online');
    } catch (err) {
      setError(err.message);
      setSystemStatus('offline');
    } finally { setLoading(false); }
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
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!whalesData.length) return;
    const totalPnl = whalesData.reduce((s, w) => s + (w.unrealized_pnl || 0), 0);
    const totalValue = whalesData.reduce((s, w) => s + (w.account_value || 0), 0);
    if (prevPnlRef.current !== null && prevPnlRef.current !== totalPnl) {
      const dir = totalPnl > prevPnlRef.current ? 'up' : 'down';
      setFlashPnl(dir);
      setTimeout(() => setFlashPnl(null), 1200);
    }
    prevPnlRef.current = totalPnl;
    setPnlHistory(prev => [...prev.slice(-19), { v: totalPnl }]);
    setValueHistory(prev => [...prev.slice(-19), { v: totalValue }]);
  }, [whalesData]);

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
      setShowDeleteModal(false); setWhaleToDelete(null);
      await loadWhalesData();
    } catch (err) { setError(err.message); }
    finally { setDeleteLoading(false); }
  };

  const handleAddWhale = async () => {
    if (!addAddress.trim()) return;
    setAddLoading(true); setAddError(null);
    try {
      await apiService.addWhale(addAddress.trim(), addNickname.trim() || undefined);
      setShowAddModal(false); setAddAddress(''); setAddNickname('');
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

  const narrative = generateNarrative(whalesData, globalMetrics);


  const allOrders = whalesData.flatMap(w => (w.orders || []).map(o => ({ ...o, whale: w })));

  const longShortPieData = [
    { name: 'LONG', value: globalMetrics.totalLongs, fill: '#10b981' },
    { name: 'SHORT', value: globalMetrics.totalShorts, fill: '#f97316' },
  ];

  const whaleBarData = [...whalesData]
    .sort((a, b) => (b.account_value || 0) - (a.account_value || 0))
    .slice(0, 6)
    .map(w => ({
      name: (w.nickname || fmtAddr(w.address)).slice(0, 10),
      value: w.account_value || 0,
      pnl: w.unrealized_pnl || 0,
    }));

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
    lbSort === 'pnl'       ? (b.unrealized_pnl || 0)          - (a.unrealized_pnl || 0) :
    lbSort === 'value'     ? (b.account_value || 0)            - (a.account_value || 0) :
                             (b.active_positions?.length || 0) - (a.active_positions?.length || 0)
  );

  const activityFeed = buildActivityFeed(whalesData);

  const tickerPositions = whalesData.flatMap(w =>
    (w.active_positions || []).map(p => ({
      coin: p.coin,
      side: p.size > 0 ? 'LONG' : 'SHORT',
      pnl: p.unrealized_pnl || 0,
      whale: w.nickname || fmtAddr(w.address),
    }))
  );

  const cumulativePnlData = (() => {
    if (!tradesData.length) return [];
    const byDate = {};
    tradesData.filter(t => t.pnl != null && t.status === 'closed' && t.close_timestamp).forEach(t => {
      const day = new Date(t.close_timestamp).toLocaleDateString('pt-BR');
      byDate[day] = (byDate[day] || 0) + Number(t.pnl);
    });
    let running = 0;
    return Object.entries(byDate)
      .sort(([a], [b]) => {
        const p = (s) => { const [d, m, y] = s.split('/'); return new Date(parseInt(y), parseInt(m) - 1, parseInt(d)); };
        return p(a) - p(b);
      })
      .map(([date, pnl]) => ({ date, cumulative: (running += pnl) }));
  })();

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
    <div className="min-h-screen bg-[#060b14] text-white">
      <style>{`
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#0e2d4a; border-radius:8px; }
        ::-webkit-scrollbar-thumb:hover { background:#1a4a72; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn 0.25s ease both; }
        .no-scrollbar { scrollbar-width:none; }
        .no-scrollbar::-webkit-scrollbar { display:none; }
      `}</style>

      {/* ═══ HEADER ═══════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-cyan-900/20 bg-[#040912]/80 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Activity className="w-3.5 h-3.5 text-black" />
              </div>
              <div className="leading-tight">
                <p className="font-black text-sm tracking-tight">Hyperliquid Pro</p>
                <p className="text-[10px] text-slate-600 font-medium">Whale Tracker</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {now.toLocaleTimeString('pt-BR')}
              </div>

              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                systemStatus === 'online'  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                systemStatus === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                             'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  systemStatus === 'online' ? 'bg-emerald-400' :
                  systemStatus === 'warning' ? 'bg-amber-400' : 'bg-red-400'
                }`} />
                {systemStatus === 'online' ? 'Live' : systemStatus === 'warning' ? 'Aviso' : 'Offline'}
                <span className="text-slate-600 font-normal">· {whalesData.length}w</span>
              </div>

              <button onClick={loadWhalesData} disabled={loading}
                className="p-1.5 rounded-lg hover:bg-cyan-500/10 text-slate-500 hover:text-cyan-400 transition-all">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button className="p-1.5 rounded-lg hover:bg-cyan-500/10 text-slate-500 hover:text-cyan-400 transition-all">
                <Bell className="w-3.5 h-3.5" />
              </button>

              <button onClick={() => { setAddError(null); setShowAddModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-xl text-xs font-bold text-cyan-400 transition-all">
                <Plus className="w-3.5 h-3.5" /> Add Wallet
              </button>
            </div>
          </div>

          <div className="flex overflow-x-auto no-scrollbar">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                    active
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-600 hover:text-slate-300 hover:border-slate-700'
                  }`}>
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-400' : ''}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ═══ TICKER TAPE ═════════════════════════════════════════════════════ */}
      {tickerPositions.length > 0 && (
        <div className="border-b border-cyan-900/20 bg-[#040912]/60 overflow-hidden py-1.5">
          <div className="flex gap-6 ticker-track whitespace-nowrap" style={{ width: 'max-content', animation: 'tickerScroll 30s linear infinite' }}>
            {[...tickerPositions, ...tickerPositions].map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2">
                <span className={`w-1.5 h-1.5 rounded-full ${p.side === 'LONG' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="font-black text-slate-300">{p.coin}</span>
                <span className={`font-semibold ${p.side === 'LONG' ? 'text-emerald-400' : 'text-red-400'}`}>{p.side}</span>
                <span className={`tabular-nums ${p.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(p.pnl)}</span>
                <span className="text-slate-700">·</span>
                <span className="text-slate-600">{p.whale}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ═══ MAIN ════════════════════════════════════════════════════════════ */}
      <main className="max-w-screen-2xl mx-auto px-4 py-5">

        {error && (
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 mb-4 fade-in">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── COMMAND ─────────────────────────────────────────────────────── */}
        {tab === 'command' && (
          <div className="fade-in">
            {loading && !whalesData.length ? <TabSpinner /> : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                {/* ── LEFT COLUMN (2/3) ─────────────────────────────────── */}
                <div className="xl:col-span-2 space-y-5">

                  {/* HERO — 3 status cards, immediately readable */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                    {/* Card 1: Direction (what are whales doing RIGHT NOW) */}
                    {(() => {
                      const lPct = globalMetrics.totalPositions > 0 ? (globalMetrics.totalLongs / globalMetrics.totalPositions) * 100 : 50;
                      const isBuying  = lPct >= 55;
                      const isSelling = lPct <= 45;
                      const label = isBuying ? 'COMPRANDO' : isSelling ? 'VENDENDO' : 'DIVIDIDAS';
                      const sub = isBuying
                        ? `${globalMetrics.totalLongs} apostando em ALTA`
                        : isSelling
                        ? `${globalMetrics.totalShorts} apostando em QUEDA`
                        : `${globalMetrics.totalLongs} alta · ${globalMetrics.totalShorts} queda`;
                      return (
                        <div className={`rounded-2xl p-5 border-l-4 ${
                          isBuying  ? 'bg-emerald-500/8 border-l-emerald-500 border border-emerald-500/15' :
                          isSelling ? 'bg-red-500/8 border-l-red-500 border border-red-500/15' :
                                      'bg-amber-500/8 border-l-amber-500 border border-amber-500/15'
                        }`}>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">As baleias estão</p>
                          <div className={`flex items-center gap-2 mb-1 ${isBuying ? 'text-emerald-400' : isSelling ? 'text-red-400' : 'text-amber-400'}`}>
                            {isBuying ? <ArrowUpRight className="w-6 h-6" /> : isSelling ? <ArrowDownRight className="w-6 h-6" /> : <Activity className="w-5 h-5" />}
                            <span className="text-2xl font-black">{label}</span>
                          </div>
                          <p className="text-xs text-slate-500">{sub}</p>
                          {globalMetrics.totalPositions > 0 && (
                            <div className="mt-3 flex h-2 rounded-full overflow-hidden gap-0.5">
                              <div className="bg-emerald-500 rounded-l-full transition-all duration-700 relative overflow-hidden" style={{ width: `${lPct}%` }}>
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shine-sweep" />
                              </div>
                              <div className="bg-red-500 rounded-r-full flex-1 transition-all duration-700" />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Card 2: PnL */}
                    <div className={`rounded-2xl p-5 border ${globalMetrics.totalPnl >= 0 ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-red-500/5 border-red-500/15'}`}>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                        {globalMetrics.totalPnl >= 0 ? 'Em Lucro Agora' : 'Em Prejuízo Agora'}
                      </p>
                      <p className={`text-3xl font-black font-mono tabular-nums ${globalMetrics.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {globalMetrics.totalPnl >= 0 ? '+' : ''}{fmt(globalMetrics.totalPnl)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        {globalMetrics.totalValue > 0
                          ? `${((globalMetrics.totalPnl / globalMetrics.totalValue) * 100).toFixed(2)}% do capital`
                          : 'sem capital'}
                      </p>
                      {pnlHistory.length > 1 && (
                        <div className="h-8 -mx-1 mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={pnlHistory}>
                              <Line dataKey="v" stroke={globalMetrics.totalPnl >= 0 ? '#10b981' : '#ef4444'} dot={false} strokeWidth={1.5} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Card 3: Capital */}
                    <div className="rounded-2xl p-5 bg-[#0a1628]/60 border border-cyan-900/20">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Capital Total</p>
                      <p className="text-3xl font-black font-mono tabular-nums text-cyan-400">{fmt(globalMetrics.totalValue)}</p>
                      <p className="text-xs text-slate-500 mt-1">{globalMetrics.totalWhales} baleias · {globalMetrics.totalPositions} posições</p>
                      {valueHistory.length > 1 && (
                        <div className="h-8 -mx-1 mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={valueHistory}>
                              <Line dataKey="v" stroke="#22d3ee" dot={false} strokeWidth={1.5} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* NARRATIVE — plain language, readable by anyone */}
                  {narrative && (
                    <div className={`px-4 py-4 rounded-xl border ${
                      narrative.color === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/15' :
                      narrative.color === 'red'     ? 'bg-red-500/5 border-red-500/15' :
                      narrative.color === 'amber'   ? 'bg-amber-500/5 border-amber-500/15' :
                                                      'bg-cyan-500/5 border-cyan-500/15'
                    }`}>
                      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">O que está acontecendo agora</p>
                      <p className={`text-sm leading-relaxed ${
                        narrative.color === 'emerald' ? 'text-emerald-200' :
                        narrative.color === 'red'     ? 'text-red-200' :
                        narrative.color === 'amber'   ? 'text-amber-200' :
                                                        'text-cyan-200'
                      }`}>{narrative.emoji} {narrative.text}</p>
                    </div>
                  )}

                  {/* POSITIONS GRID — one tile per open position */}
                  {globalMetrics.totalPositions > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Posições Abertas Agora ({globalMetrics.totalPositions})
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {whalesData.flatMap((w, wi) =>
                          (w.active_positions || []).map((p, pi) => {
                            const isLong = p.size > 0;
                            const positivePnl = (p.unrealized_pnl || 0) >= 0;
                            return (
                              <div key={`${wi}-${pi}`}
                                className={`rounded-xl p-3.5 border transition-all ${
                                  isLong
                                    ? 'bg-emerald-500/5 border-emerald-500/15 hover:border-emerald-500/30'
                                    : 'bg-red-500/5 border-red-500/15 hover:border-red-500/30'
                                }`}>
                                <div className="flex items-start justify-between mb-1.5">
                                  <span className="font-black text-white text-base leading-none">{p.coin}</span>
                                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {isLong ? '▲ LONG' : '▼ SHORT'}
                                  </span>
                                </div>
                                <p className={`text-lg font-black font-mono tabular-nums leading-none ${positivePnl ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {positivePnl ? '+' : ''}{fmt(p.unrealized_pnl)}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1.5 truncate">{w.nickname || fmtAddr(w.address)}</p>
                                <p className="text-[10px] text-slate-600 font-mono">{fmt(p.position_value)}{p.leverage ? ` · ${p.leverage.toFixed(0)}×` : ''}</p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* WHALE LIST — compact single-line rows */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        Baleias Monitoradas ({whalesData.length})
                      </p>
                      <button onClick={() => { setAddError(null); setShowAddModal(true); }}
                        className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
                        <Plus className="w-3 h-3" /> Adicionar
                      </button>
                    </div>
                    {whalesData.length === 0
                      ? <EmptyState icon={Wallet} title="Nenhuma whale adicionada" sub='Clique em "Add Wallet" para começar' />
                      : (
                        <div className="space-y-2">
                          {whalesData.map(w => {
                            const marginPct = w.account_value > 0 ? Math.min(100, (w.total_margin_used / w.account_value) * 100) : 0;
                            const isHighRisk = w.liquidation_risk === 'Alto';
                            const pnlPos = (w.unrealized_pnl || 0) >= 0;
                            return (
                              <div key={w.address}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-l-2 ${riskBorderLeft(w.liquidation_risk)} ${
                                  isHighRisk
                                    ? 'bg-red-500/5 border-red-500/10 whale-high-risk'
                                    : 'bg-[#0a1628]/60 border-cyan-900/15'
                                } hover:bg-[#0a1628]/90 transition-all`}>
                                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-[10px] font-black text-cyan-300 shrink-0">
                                  {(w.nickname || w.address || '?').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-bold text-sm text-white truncate">{w.nickname || fmtAddr(w.address)}</span>
                                    {isHighRisk && (
                                      <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full shrink-0">⚠ Risco Alto</span>
                                    )}
                                    {w.error && (
                                      <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full shrink-0">erro</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px]">
                                    <span className="font-mono tabular-nums text-emerald-400 font-bold">{fmt(w.account_value)}</span>
                                    <span className={`font-mono tabular-nums font-bold ${pnlPos ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {pnlPos ? '+' : ''}{fmt(w.unrealized_pnl)}
                                    </span>
                                    <span className="text-slate-500">{w.active_positions?.length || 0} posições</span>
                                    <span className="text-slate-600">{fmtRel(w.last_update)}</span>
                                  </div>
                                </div>
                                <div className="w-20 shrink-0">
                                  <div className="flex justify-between text-[9px] text-slate-600 mb-1">
                                    <span>Margem</span>
                                    <span className="font-mono">{marginPct.toFixed(0)}%</span>
                                  </div>
                                  <ProgressBar value={marginPct} color={marginPct > 70 ? 'red' : marginPct > 40 ? 'amber' : 'emerald'} />
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <a href={`https://hypurrscan.io/address/${w.address}`} target="_blank" rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                  <button onClick={() => { setWhaleToDelete(w); setShowDeleteModal(true); }}
                                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    }
                  </div>

                </div>

                {/* ── RIGHT COLUMN (1/3) — Activity Feed ─────────────────── */}
                <div className="space-y-4">
                  <div className="bg-[#0a1628]/60 border border-cyan-900/20 rounded-xl p-4 xl:sticky xl:top-20">
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      Atividade ao Vivo
                    </p>
                    <div className="space-y-2 max-h-[70vh] overflow-y-auto no-scrollbar">
                      {activityFeed.length === 0
                        ? <p className="text-slate-600 text-xs text-center py-8">Sem posições ativas</p>
                        : activityFeed.map((ev, i) => (
                          <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${ev.side === 'LONG' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${ev.side === 'LONG' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-slate-400 text-[10px] font-semibold truncate">{ev.whale}</span>
                                <span className={`text-[10px] font-bold font-mono shrink-0 ${ev.side === 'LONG' ? 'text-emerald-400' : 'text-red-400'}`}>{ev.side}</span>
                              </div>
                              <div className="flex items-center justify-between gap-1 mt-0.5">
                                <span className="font-black text-white text-sm">{ev.coin}</span>
                                <span className={`text-xs font-mono tabular-nums font-bold ${ev.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(ev.pnl)}</span>
                              </div>
                              <p className="text-[10px] text-slate-600 font-mono mt-0.5">{fmt(ev.value)}{ev.leverage ? ` · ${ev.leverage.toFixed(0)}×` : ''}</p>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ── POSITIONS ───────────────────────────────────────────────────── */}
        {tab === 'positions' && (
          <div className="fade-in">
            <SectionHeader
              title={`Posições Abertas (${globalMetrics.totalPositions})`}
              icon={BarChart3}
              action={
                <div className="flex gap-2 text-xs font-bold">
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">▲ LONG {globalMetrics.totalLongs}</span>
                  <span className="px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full">▼ SHORT {globalMetrics.totalShorts}</span>
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
                          className={`bg-slate-800/40 border border-white/5 border-l-4 ${pos.unrealized_pnl >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'} rounded-2xl p-4`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <span className="font-black text-lg">{pos.coin}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                  pos.size > 0
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                                }`}>{pos.size > 0 ? 'LONG' : 'SHORT'}</span>
                                <span className="text-xs text-slate-500">{whale.nickname || fmtAddr(whale.address)}</span>
                                {pos.leverage && <span className="text-xs text-amber-400 font-bold">{pos.leverage.toFixed(0)}×</span>}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <div><p className="text-slate-600 text-[10px] mb-0.5 uppercase tracking-widest">Tamanho</p><p className="font-semibold font-mono tabular-nums">{Math.abs(pos.size).toFixed(4)}</p></div>
                                <div><p className="text-slate-600 text-[10px] mb-0.5 uppercase tracking-widest">Entrada</p><p className="font-semibold font-mono tabular-nums">${pos.entry_price?.toFixed(2)}</p></div>
                                <div><p className="text-slate-600 text-[10px] mb-0.5 uppercase tracking-widest">Mark</p><p className="font-semibold font-mono tabular-nums">${pos.mark_px?.toFixed(2) || '—'}</p></div>
                                <div><p className="text-slate-600 text-[10px] mb-0.5 uppercase tracking-widest">Liquidação</p><p className="font-semibold font-mono tabular-nums text-red-400">{pos.liquidation_px ? `$${pos.liquidation_px.toFixed(2)}` : 'N/A'}</p></div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-xl font-black font-mono tabular-nums ${pnlClass(pos.unrealized_pnl)}`}>{fmt(pos.unrealized_pnl)}</p>
                              <p className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">{fmt(pos.position_value)}</p>
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
          <div className="fade-in">
            <SectionHeader title="Histórico de Trades" icon={Activity} iconClass="text-blue-400"
              action={<RefreshBtn onClick={loadTrades} loading={tradesLoading} />} />
            {tradesLoading ? <TabSpinner />
              : tradesError
                ? (tradesError.includes('503') ? <DbUnavailable /> : <p className="text-red-400 text-sm">{tradesError}</p>)
              : tradesData.length === 0
                ? <DbUnavailable msg="Nenhum trade registrado ainda" />
              : (
                <>
                {cumulativePnlData.length > 1 && (
                  <div className="bg-[#0a1628]/60 border border-cyan-900/20 rounded-xl p-5 mb-4">
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3">PnL Acumulado</p>
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cumulativePnlData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="2 2" stroke="#0e2d4a" />
                          <XAxis dataKey="date" tick={{ fill: '#334155', fontSize: 9 }} />
                          <YAxis tick={{ fill: '#334155', fontSize: 9 }} tickFormatter={v => fmt(v)} />
                          <Tooltip {...CHART_STYLE} formatter={(v) => [fmt(v), 'PnL Acum.']} />
                          <Area type="monotone" dataKey="cumulative" stroke="#22d3ee" strokeWidth={2} fill="url(#pnlGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <div className="bg-[#0a1628]/60 border border-cyan-900/20 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900/60">
                        <tr className="text-slate-400 text-xs">
                          {['Wallet','Token','Side','Tamanho','Entrada','PnL','Status','Data'].map(h => (
                            <th key={h} className={`px-4 py-3 font-semibold ${['Tamanho','Entrada','PnL'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {tradesData.map((t, i) => {
                          const isLong = String(t.side).toLowerCase().includes('long') || t.side === 'B';
                          return (
                            <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs text-slate-500">{fmtAddr(t.wallet)}</td>
                              <td className="px-4 py-3 font-black">{t.token || t.coin || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                  isLong ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
                                }`}>{t.side}</span>
                              </td>
                              <td className="px-4 py-3 text-right">{Number(t.size || 0).toFixed(4)}</td>
                              <td className="px-4 py-3 text-right">{t.entry_price ? `$${Number(t.entry_price).toFixed(2)}` : '—'}</td>
                              <td className={`px-4 py-3 text-right font-black ${pnlClass(Number(t.pnl || 0))}`}>
                                {t.pnl != null ? fmt(Number(t.pnl)) : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  t.status === 'closed' ? 'bg-slate-700/60 text-slate-500' : 'bg-cyan-500/20 text-cyan-400'
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
                </>
              )
            }
          </div>
        )}

        {/* ── ORDERS ──────────────────────────────────────────────────────── */}
        {tab === 'orders' && (
          <div className="fade-in">
            <SectionHeader title={`Ordens Abertas (${allOrders.length})`} icon={Clock} iconClass="text-amber-400" />
            {loading ? <TabSpinner />
              : allOrders.length === 0
                ? <EmptyState icon={Clock} title="Nenhuma ordem aberta" sub="As ordens abertas das whales aparecerão aqui" />
              : (
                <div className="bg-slate-800/40 border border-white/5 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900/60">
                        <tr className="text-slate-400 text-xs">
                          {['Whale','Token','Tipo','Preço Limite','Tamanho','Data'].map(h => (
                            <th key={h} className={`px-4 py-3 font-semibold ${['Preço Limite','Tamanho'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {allOrders.map((o, i) => {
                          const isBuy = o.side === 'B' || String(o.side).toLowerCase().includes('buy');
                          return (
                            <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                              <td className="px-4 py-3 text-xs font-semibold">{o.whale?.nickname || fmtAddr(o.whale?.address)}</td>
                              <td className="px-4 py-3 font-black">{o.coin || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                  isBuy ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
                                }`}>{isBuy ? 'COMPRA' : 'VENDA'}</span>
                              </td>
                              <td className="px-4 py-3 text-right">{o.limitPx ? `$${Number(o.limitPx).toFixed(2)}` : '—'}</td>
                              <td className="px-4 py-3 text-right">{o.sz || o.size || '—'}</td>
                              <td className="px-4 py-3 text-xs text-slate-500">{o.timestamp ? new Date(o.timestamp).toLocaleString('pt-BR') : '—'}</td>
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
          <div className="space-y-5 fade-in">
            <SectionHeader title="Sentimento de Mercado" icon={Brain} iconClass="text-purple-400"
              action={<RefreshBtn onClick={loadSentiment} loading={sentimentLoading} />} />
            {sentimentLoading ? <TabSpinner />
              : !sentiment ? <DbUnavailable msg="Dados de sentimento indisponíveis" />
              : (
                <>
                  {/* Sentiment hero */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Radial gauge */}
                    <div className="bg-[#0a1628]/60 border border-cyan-900/20 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                      <div className="relative h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart cx="50%" cy="55%" innerRadius="55%" outerRadius="90%"
                            data={[
                              { name: 'BEAR', value: sentiment.bearish_percentage || 0, fill: '#ef4444' },
                              { name: 'BULL', value: sentiment.bullish_percentage || 0, fill: '#10b981' },
                            ]}
                            startAngle={180} endAngle={0}>
                            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#0f2040' }} />
                            <Tooltip {...CHART_STYLE} formatter={(v, n) => [`${v.toFixed(1)}%`, n]} />
                          </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
                          <p className="text-2xl leading-none mb-1">{sentiment.sentiment_icon}</p>
                          <p className={`text-lg font-black font-mono tabular-nums ${
                            sentiment.bullish_percentage >= 60 ? 'text-emerald-400' :
                            sentiment.bearish_percentage >= 60 ? 'text-red-400' : 'text-slate-200'
                          }`}>{sentiment.sentiment}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs mt-2">
                        <span className="text-emerald-400 font-mono font-bold">BULL {(sentiment.bullish_percentage || 0).toFixed(1)}%</span>
                        <span className="text-red-400 font-mono font-bold">BEAR {(sentiment.bearish_percentage || 0).toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Volume split */}
                    <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-5">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Volume por Lado</p>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-emerald-400 font-bold">LONG Volume</span>
                            <span className="text-emerald-400 font-black">{fmt(sentiment.positions?.volume_long)}</span>
                          </div>
                          <ProgressBar value={sentiment.positions?.volume_long || 0} max={(sentiment.positions?.volume_long || 0) + (sentiment.positions?.volume_short || 0)} color="emerald" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-red-400 font-bold">SHORT Volume</span>
                            <span className="text-red-400 font-black">{fmt(sentiment.positions?.volume_short)}</span>
                          </div>
                          <ProgressBar value={sentiment.positions?.volume_short || 0} max={(sentiment.positions?.volume_long || 0) + (sentiment.positions?.volume_short || 0)} color="red" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/50 text-xs">
                          <div><p className="text-slate-500 mb-0.5">Total Longs</p><p className="font-black text-emerald-400 text-lg">{sentiment.positions?.total_longs || 0}</p></div>
                          <div><p className="text-slate-500 mb-0.5">Total Shorts</p><p className="font-black text-red-400 text-lg">{sentiment.positions?.total_shorts || 0}</p></div>
                        </div>
                      </div>
                    </div>

                    {/* Divergences */}
                    <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-5">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-400" /> Smart Money Divergências
                      </p>
                      {(sentiment.divergences || []).length === 0
                        ? <div className="flex flex-col items-center justify-center py-6 gap-2">
                            <Info className="w-6 h-6 text-slate-700" />
                            <p className="text-slate-600 text-xs">Nenhuma divergência detectada</p>
                          </div>
                        : (sentiment.divergences || []).slice(0, 4).map((d, i) => (
                          <div key={i} className="mb-2 last:mb-0 p-3 bg-slate-900/60 rounded-xl text-xs border border-slate-700/40">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-black text-amber-400">{d.whale} · {d.token}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                d.alert_level === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>{d.alert_level}</span>
                            </div>
                            <p className="text-slate-400">
                              <span className={d.whale_position === 'LONG' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{d.whale_position}</span>
                              <span className="text-slate-600 mx-1.5">vs maioria</span>
                              <span className={d.majority_position === 'LONG' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{d.majority_position}</span>
                            </p>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* Hot tokens — card grid */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Hot Tokens
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {(sentiment.hot_tokens || []).map((t, i) => {
                        const total = t.longs + t.shorts;
                        const lPct = total > 0 ? (t.longs / total) * 100 : 50;
                        return (
                          <div key={i} className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 hover:border-blue-500/20 transition-all">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-black text-lg">{t.token}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                t.consensus === 'LONG'  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                                t.consensus === 'SHORT' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                                                          'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              }`}>{t.consensus}</span>
                            </div>
                            <div className="space-y-2 mb-3">
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-emerald-400">L {t.longs}</span>
                                  <span className="text-red-400">S {t.shorts}</span>
                                </div>
                                {/* split bar */}
                                <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden flex">
                                  <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${lPct}%` }} />
                                  <div className="h-full bg-red-500 rounded-r-full flex-1" />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">{t.whale_count} whales</span>
                              <span className="font-bold text-slate-300">{fmt(t.total_volume)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )
            }
          </div>
        )}

        {/* ── AI WALLET ───────────────────────────────────────────────────── */}
        {tab === 'ai-wallet' && (
          <div className="space-y-4 fade-in">
            <SectionHeader title="Whale Intelligence Scores" icon={Brain} iconClass="text-purple-400"
              action={<RefreshBtn onClick={loadAiScores} loading={aiScoresLoading} />} />
            {aiScoresLoading ? <TabSpinner />
              : aiScoresError ? (aiScoresError.includes('503') ? <DbUnavailable /> : <p className="text-red-400 text-sm">{aiScoresError}</p>)
              : aiScores.length === 0 ? <DbUnavailable msg="Banco não conectado — scores indisponíveis" />
              : (
                <>
                  {/* RadarChart for top whale */}
                  {aiScores[0] && (
                    <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-5">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Perfil de Performance — <span className="text-purple-400">{aiScores[0].nickname}</span>
                      </p>
                      <p className="text-[11px] text-slate-600 mb-3">Top whale por score de inteligência</p>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={[
                            { metric: 'Win Rate', value: aiScores[0].breakdown?.win_rate || 0 },
                            { metric: 'Sharpe', value: Math.min(100, (aiScores[0].breakdown?.sharpe_ratio || 0) * 25) },
                            { metric: 'Consistência', value: aiScores[0].breakdown?.consistency || 0 },
                            { metric: 'Volume', value: Math.min(100, (Math.abs(aiScores[0].breakdown?.avg_trade_size || 0) / 100000) * 100) },
                            { metric: 'PnL 7D', value: Math.min(100, Math.max(0, 50 + ((aiScores[0].breakdown?.recent_pnl_7d || 0) / 10000) * 50)) },
                          ]}>
                            <PolarGrid stroke="#0e2d4a" />
                            <PolarAngleAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 11 }} />
                            <Radar dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.1} strokeWidth={2} />
                            <Tooltip {...CHART_STYLE} formatter={(v) => [`${v.toFixed(1)}`, 'Score']} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Whale score list */}
                  <div className="space-y-3">
                    {aiScores.map((s, i) => (
                      <div key={s.address} className="bg-slate-800/40 border border-white/5 rounded-2xl p-5 hover:border-purple-500/20 transition-all">
                        <div className="flex items-start gap-4">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-lg ${
                            i === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-black' :
                            i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-black' :
                            i === 2 ? 'bg-gradient-to-br from-amber-700 to-orange-800 text-white' :
                                      'bg-gradient-to-br from-blue-600 to-violet-600 text-white'
                          }`}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-black">{s.nickname}</span>
                              <a href={`https://hypurrscan.io/address/${s.address}`} target="_blank" rel="noopener noreferrer"
                                className="font-mono text-xs text-slate-500 hover:text-blue-400 flex items-center gap-0.5">
                                {fmtAddr(s.address)}<ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tierBadge(s.tier)}`}>{s.tier}</span>
                            </div>
                            <div className="flex items-center gap-1 mb-3">
                              {Array.from({ length: 5 }).map((_, j) => (
                                <Star key={j} className={`w-3.5 h-3.5 ${j < s.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                              ))}
                              <span className="text-xs text-slate-500 ml-1">{s.total_trades} trades · PnL {fmt(s.total_pnl)}</span>
                            </div>
                            {/* Progress bars per dimension */}
                            <div className="space-y-2">
                              {[
                                { label: 'Win Rate', val: s.breakdown?.win_rate || 0, color: 'blue' },
                                { label: 'Sharpe', val: Math.min(100, (s.breakdown?.sharpe_ratio || 0) * 25), color: 'purple' },
                                { label: 'Consistência', val: s.breakdown?.consistency || 0, color: 'emerald' },
                              ].map(row => (
                                <div key={row.label}>
                                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                    <span>{row.label}</span>
                                    <span className="font-semibold">{row.val.toFixed(1)}</span>
                                  </div>
                                  <ProgressBar value={row.val} color={row.color} />
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-3xl font-black font-mono tabular-nums text-cyan-400">{s.intelligence_score}</p>
                            <p className="text-xs text-slate-500">/ 100</p>
                            <p className={`text-xs font-bold mt-1 ${pnlClass(s.breakdown?.recent_pnl_7d)}`}>{fmt(s.breakdown?.recent_pnl_7d)} <span className="text-slate-600 font-normal">7d</span></p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
            }
          </div>
        )}

        {/* ── ANALYTICS ───────────────────────────────────────────────────── */}
        {tab === 'analytics' && (
          <div className="space-y-5 fade-in">
            <SectionHeader title="Correlação entre Whales" icon={Layers} iconClass="text-cyan-400"
              action={<RefreshBtn onClick={loadCorrelation} loading={correlationLoading} />} />
            {correlationLoading ? <TabSpinner />
              : correlationError ? (correlationError.includes('503') ? <DbUnavailable /> : <p className="text-red-400 text-sm">{correlationError}</p>)
              : !correlation ? <DbUnavailable />
              : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Pares Analisados',  val: correlation.total_pairs_analyzed,    color: 'text-cyan-400'   },
                      { label: 'Correlações Sig.',   val: correlation.significant_correlations, color: 'text-blue-400'   },
                      { label: 'Grupos Detectados', val: correlation.highly_correlated_groups?.length || 0, color: 'text-purple-400' },
                    ].map(m => (
                      <div key={m.label} className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 text-center">
                        <p className={`text-3xl font-black ${m.color}`}>{m.val}</p>
                        <p className="text-xs text-slate-500 mt-1">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Bar chart for correlation matrix */}
                  {(correlation.correlation_matrix || []).length > 0 && (
                    <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-5">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Top Pares por Correlação</p>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={correlation.correlation_matrix.slice(0, 8).map(p => ({
                              name: `${p.whale1.slice(0,5)}×${p.whale2.slice(0,5)}`,
                              correlation: p.correlation,
                              tokens: p.common_tokens,
                            }))}
                            margin={{ top: 0, right: 10, left: -10, bottom: 30 }}>
                            <defs>
                              <linearGradient id="corrGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.6} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 2" stroke="#0e2d4a" />
                            <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 9 }} angle={-30} textAnchor="end" />
                            <YAxis tick={{ fill: '#334155', fontSize: 10 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                            <Tooltip {...CHART_STYLE} formatter={(v, n, p) => [`${v}% (${p.payload.tokens} tokens)`, 'Correlação']} />
                            <Bar dataKey="correlation" fill="url(#corrGrad)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {(correlation.highly_correlated_groups || []).length > 0 && (
                    <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-5">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Grupos Altamente Correlacionados ≥75%</p>
                      <div className="flex flex-wrap gap-3">
                        {correlation.highly_correlated_groups.map(g => (
                          <div key={g.group_id} className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-3">
                            <p className="text-xs font-bold text-purple-400 mb-2">Grupo {g.group_id} · {g.size} whales</p>
                            <div className="flex flex-wrap gap-1">
                              {g.members.map(m => <span key={m} className="text-xs bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-lg border border-purple-500/20">{m}</span>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(correlation.correlation_matrix || []).length > 0 && (
                    <div className="bg-slate-800/40 border border-white/5 rounded-2xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/5 font-semibold text-sm">Matriz Completa</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-900/60">
                            <tr className="text-slate-400 text-xs">
                              {['Whale 1','Whale 2','Correlação','Tokens Comuns'].map(h => (
                                <th key={h} className={`px-4 py-3 font-semibold ${h === 'Correlação' || h === 'Tokens Comuns' ? 'text-right' : 'text-left'}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80">
                            {correlation.correlation_matrix.map((p, i) => (
                              <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                                <td className="px-4 py-3 text-xs font-medium">{p.whale1}</td>
                                <td className="px-4 py-3 text-xs font-medium">{p.whale2}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 h-1 bg-[#0f2040] rounded-full overflow-hidden">
                                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${p.correlation}%` }} />
                                    </div>
                                    <span className={`font-black text-sm ${p.correlation >= 80 ? 'text-purple-400' : p.correlation >= 65 ? 'text-blue-400' : 'text-slate-300'}`}>
                                      {p.correlation}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right text-slate-400">{p.common_tokens}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )
            }
          </div>
        )}

        {/* ── RISK ────────────────────────────────────────────────────────── */}
        {tab === 'risk' && (
          <div className="space-y-5 fade-in">
            <SectionHeader title="Risco & Sinais Preditivos" icon={Shield} iconClass="text-red-400"
              action={<RefreshBtn onClick={loadSignals} loading={signalsLoading} />} />

            {/* Liquidation risk grid */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Risco de Liquidação por Whale</p>
              {loading ? <TabSpinner /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {whalesData.map(w => {
                    const marginPct = w.account_value > 0 ? Math.min(100, (w.total_margin_used / w.account_value) * 100) : 0;
                    return (
                      <div key={w.address} className={`rounded-xl p-4 border ${
                        w.liquidation_risk === 'Alto'  ? 'bg-red-500/5 border-red-500/20 whale-high-risk' :
                        w.liquidation_risk === 'Médio' ? 'bg-amber-500/5 border-amber-500/20' :
                                                         'bg-[#0a1628]/60 border-cyan-900/20'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-sm">{w.nickname || fmtAddr(w.address)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${riskBadge(w.liquidation_risk)}`}>
                            {w.liquidation_risk}
                          </span>
                        </div>
                        <div className="mb-2">
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                            <span>Margem</span><span>{marginPct.toFixed(1)}%</span>
                          </div>
                          <ProgressBar value={marginPct} color={w.liquidation_risk === 'Alto' ? 'red' : w.liquidation_risk === 'Médio' ? 'amber' : 'emerald'} />
                        </div>
                        <div className="flex gap-3 text-xs text-slate-500">
                          <span>{w.active_positions?.length || 0} posições</span>
                          <span className="text-emerald-400 font-semibold">{fmt(w.account_value)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Predictive signals */}
            {signalsLoading ? <TabSpinner />
              : signalsError ? (signalsError.includes('503') ? <DbUnavailable msg="Sinais requerem banco de dados" /> : <p className="text-red-400 text-sm">{signalsError}</p>)
              : signals && (
                <div>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sinais Preditivos (últimas 4h)</p>
                    <div className="flex gap-2 text-xs font-bold">
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">🟢 {signals.strong_buy_count} STRONG BUY</span>
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">🟡 {signals.caution_count} CAUTION</span>
                      <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">🔵 {signals.watch_count} WATCH</span>
                    </div>
                  </div>
                  {(signals.signals || []).length === 0
                    ? <EmptyState icon={Zap} title="Nenhum sinal detectado" sub="Sinais aparecem quando top whales acumulam tokens em comum" />
                    : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {signals.signals.map((s, i) => (
                          <div key={i} className={`rounded-2xl p-5 border ${
                            s.signal_type === 'STRONG BUY' ? 'bg-emerald-500/8 border-emerald-500/20' :
                            s.signal_type === 'CAUTION'    ? 'bg-amber-500/8 border-amber-500/20' :
                                                             'bg-blue-500/8 border-blue-500/20'
                          }`}>
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-3xl leading-none">{s.icon}</span>
                                <div>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                    s.signal_type === 'STRONG BUY' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                                    s.signal_type === 'CAUTION'    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                                                                     'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  }`}>{s.signal_type}</span>
                                  <p className="font-black text-xl mt-0.5">{s.token}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs text-slate-500 mb-0.5">Volume</p>
                                <p className="font-black text-sm">{fmt(s.volume)}</p>
                              </div>
                            </div>
                            <p className="text-xs text-slate-300 mb-3">{s.reason}</p>
                            <div>
                              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                <span>Confiança</span><span className="font-bold">{s.confidence}%</span>
                              </div>
                              <ProgressBar value={s.confidence} color={s.signal_type === 'STRONG BUY' ? 'emerald' : s.signal_type === 'CAUTION' ? 'amber' : 'blue'} />
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
          <div className="space-y-5 fade-in">
            <SectionHeader title="Simulador de Alocação" icon={PlayCircle} iconClass="text-emerald-400" />
            <div className="bg-[#0a1628]/60 border border-cyan-900/20 rounded-xl p-5 max-w-sm">
              <p className="text-xs text-slate-500 mb-4">Simule como seu capital seria distribuído seguindo as posições reais das whales.</p>
              <label className="text-[10px] text-slate-600 block mb-1.5 font-semibold uppercase tracking-widest">Capital (USD)</label>
              <input type="number" min="1" value={simulatorCapital}
                onChange={e => setSimulatorCapital(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#050b18]/80 border border-cyan-900/40 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500/60 transition-all" />
            </div>
            {simulatorAllocation.length === 0
              ? <EmptyState icon={PlayCircle} title="Nenhuma posição ativa para simular" sub="Adicione whales com posições abertas" />
              : (
                <div className="bg-[#0a1628]/60 border border-cyan-900/20 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-cyan-900/20 flex items-center justify-between">
                    <span className="font-bold">Alocação Simulada</span>
                    <span className="text-emerald-400 font-black font-mono tabular-nums">{fmtFull(simulatorCapital)}</span>
                  </div>
                  <div className="p-5 h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={simulatorAllocation.slice(0, 10)} margin={{ top: 0, right: 10, left: -10, bottom: 22 }}>
                        <defs>
                          <linearGradient id="simLongGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
                          </linearGradient>
                          <linearGradient id="simShortGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#f97316" stopOpacity={0.5} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 2" stroke="#0e2d4a" />
                        <XAxis dataKey="coin" tick={{ fill: '#334155', fontSize: 10 }} angle={-30} textAnchor="end" />
                        <YAxis tick={{ fill: '#334155', fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                        <Tooltip {...CHART_STYLE} formatter={(v) => [`${v.toFixed(1)}%`, 'Alocação']} />
                        <Bar dataKey="pct" radius={[5, 5, 0, 0]}>
                          {simulatorAllocation.slice(0, 10).map((a, i) => (
                            <Cell key={i} fill={a.consensus === 'LONG' ? 'url(#simLongGrad)' : 'url(#simShortGrad)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900/60">
                        <tr className="text-slate-400 text-xs">
                          {['#','Token','Consenso','% Capital','Valor','L/S'].map(h => (
                            <th key={h} className={`px-4 py-3 font-semibold ${['% Capital','Valor'].includes(h) ? 'text-right' : h === 'L/S' ? 'text-center' : 'text-left'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {simulatorAllocation.map((a, i) => (
                          <tr key={a.coin} className="hover:bg-slate-700/20 transition-colors">
                            <td className="px-4 py-3 text-slate-500 text-xs">{i + 1}</td>
                            <td className="px-4 py-3 font-black">{a.coin}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                a.consensus === 'LONG' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
                              }`}>{a.consensus}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold">{a.pct.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-right font-black text-blue-400">{fmt(a.amount)}</td>
                            <td className="px-4 py-3 text-center text-xs">
                              <span className="text-emerald-400 font-bold">{a.longs}L</span>
                              <span className="text-slate-600 mx-1">/</span>
                              <span className="text-red-400 font-bold">{a.shorts}S</span>
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
          <div className="space-y-5 fade-in">
            <SectionHeader title="Leaderboard" icon={Trophy} iconClass="text-amber-400"
              action={
                <div className="flex gap-1">
                  {[{ id: 'pnl', label: 'PnL' }, { id: 'value', label: 'Valor' }, { id: 'positions', label: 'Posições' }].map(s => (
                    <button key={s.id} onClick={() => setLbSort(s.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        lbSort === s.id ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-[#0a1628]/60 text-slate-500 hover:text-cyan-300 border border-cyan-900/30'
                      }`}>{s.label}
                    </button>
                  ))}
                </div>
              }
            />
            {loading ? <TabSpinner />
              : leaderboard.length === 0 ? <EmptyState icon={Trophy} title="Nenhuma whale monitorada" />
              : (
                <>
                  {/* Podium top 3 */}
                  {leaderboard.length >= 3 && (
                    <div className="flex items-end justify-center gap-3 py-4">
                      {[leaderboard[1], leaderboard[0], leaderboard[2]].map((w, idx) => {
                        const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                        const h = rank === 1 ? 'h-36' : rank === 2 ? 'h-28' : 'h-24';
                        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
                        const borderC = rank === 1 ? 'border-amber-500/40 bg-amber-500/5' : rank === 2 ? 'border-slate-400/30 bg-slate-400/5' : 'border-orange-700/30 bg-orange-700/5';
                        return (
                          <div key={w.address} className={`flex-1 max-w-[160px] ${h} rounded-2xl border ${borderC} flex flex-col items-center justify-end pb-3 gap-1 px-2`}>
                            <span className="text-2xl">{medal}</span>
                            <p className="text-xs font-black text-center leading-tight">{(w.nickname || fmtAddr(w.address)).slice(0, 12)}</p>
                            <p className={`text-sm font-black ${pnlClass(w.unrealized_pnl)}`}>{fmt(w.unrealized_pnl)}</p>
                            <p className="text-[10px] text-slate-500">{fmt(w.account_value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Full list */}
                  <div className="space-y-2">
                    {leaderboard.map((w, i) => (
                      <div key={w.address} className={`flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all ${
                        i === 0 ? 'bg-amber-500/5 border-amber-500/20' :
                        i === 1 ? 'bg-slate-400/5 border-slate-400/15' :
                        i === 2 ? 'bg-orange-700/5 border-orange-700/15' :
                                  'bg-slate-800/40 border-white/5'
                      }`}>
                        <div className="w-8 text-center shrink-0 font-black">
                          {i === 0 ? <span className="text-xl">🥇</span> :
                           i === 1 ? <span className="text-xl">🥈</span> :
                           i === 2 ? <span className="text-xl">🥉</span> :
                           <span className="text-slate-500">{i + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {w.nickname && <span className="font-bold">{w.nickname}</span>}
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
                        <div className="text-right shrink-0">
                          <p className={`text-lg font-black font-mono tabular-nums flex items-center gap-1 ${pnlClass(w.unrealized_pnl)}`}>
                            {w.unrealized_pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {fmt(w.unrealized_pnl)}
                          </p>
                          <p className="text-xs text-slate-600">PnL não realizado</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
            }
          </div>
        )}

        {/* ── SETTINGS ────────────────────────────────────────────────────── */}
        {tab === 'settings' && (
          <div className="max-w-lg fade-in">
            <SectionHeader title="Configurações" icon={Settings} />
            <div className="bg-[#0a1628]/60 border border-cyan-900/20 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                    <Send className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Telegram Bot</p>
                    <p className="text-xs text-slate-500">Alertas de posições, liquidações e resumos</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={tgEnabled} onChange={e => setTgEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600" />
                </label>
              </div>

              {tgConfigured && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Token configurado: <span className="font-mono">{tgTokenMasked}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-semibold">
                    Bot Token {tgConfigured && <span className="text-slate-600 font-normal">(deixe vazio para manter)</span>}
                  </label>
                  <div className="relative">
                    <input type={showToken ? 'text' : 'password'} value={tgToken} onChange={e => setTgToken(e.target.value)}
                      placeholder={tgConfigured ? '••••••••••' : 'Cole o token do @BotFather'}
                      className="w-full bg-[#050b18]/80 border border-cyan-900/40 rounded-xl px-3 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-cyan-500/60 transition-all" />
                    <button onClick={() => setShowToken(v => !v)} className="absolute right-3 top-2.5 text-slate-500 hover:text-white">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Chat ID</label>
                  <input type="text" value={tgChatId} onChange={e => setTgChatId(e.target.value)}
                    placeholder="Ex: -1001234567890"
                    className="w-full bg-[#050b18]/80 border border-cyan-900/40 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500/60 transition-all" />
                  <p className="text-xs text-slate-600 mt-1">Obtenha via @userinfobot no Telegram</p>
                </div>
              </div>

              {tgError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-sm text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{tgError}
                </div>
              )}
              {tgSaved && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4 shrink-0" />Salvo! Você deve ter recebido uma mensagem de teste.
                </div>
              )}

              <button onClick={handleSaveTelegramConfig} disabled={tgSaving || (!tgToken && !tgChatId)}
                className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20">
                {tgSaving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando…</> : <><Send className="w-4 h-4" /> Salvar e testar</>}
              </button>

              <p className="text-xs text-slate-600">Credenciais salvas no banco de dados do servidor.</p>
            </div>
          </div>
        )}
      </main>

      {/* ═══ DELETE MODAL ══════════════════════════════════════════════════════ */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#070e1c] border border-red-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-red-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-black">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-slate-300 mb-1 text-sm">Remover a whale:</p>
            <div className="bg-slate-800/60 rounded-xl px-3 py-2 mb-5 text-sm border border-white/5">
              {whaleToDelete?.nickname && <span className="font-black mr-2">{whaleToDelete.nickname}</span>}
              <span className="font-mono text-blue-400">{fmtAddr(whaleToDelete?.address)}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setWhaleToDelete(null); }} disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 rounded-xl text-sm transition-all">
                Cancelar
              </button>
              <button onClick={handleDeleteWhale} disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all">
                {deleteLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Excluindo…</> : <><Trash2 className="w-4 h-4" /> Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADD WALLET MODAL ══════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#070e1c] border border-cyan-900/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" /> Adicionar Whale
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Endereço da Wallet</label>
                <input type="text" value={addAddress} onChange={e => setAddAddress(e.target.value)}
                  placeholder="0x0000…0000"
                  className="w-full bg-[#050b18]/80 border border-cyan-900/40 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500/60 transition-all" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Apelido <span className="text-slate-600 font-normal">(opcional)</span></label>
                <input type="text" value={addNickname} onChange={e => setAddNickname(e.target.value)}
                  placeholder="Ex: Whale Alpha"
                  className="w-full bg-[#050b18]/80 border border-cyan-900/40 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/60 transition-all" />
              </div>
            </div>
            {addError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-sm text-red-400 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0" />{addError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 rounded-xl text-sm transition-all">
                Cancelar
              </button>
              <button onClick={handleAddWhale} disabled={addLoading || !addAddress.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2 transition-all">
                {addLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Adicionando…</> : <><Plus className="w-4 h-4" /> Adicionar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
