import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import api from '../api';
import AnimatedButton from '../components/ui/AnimatedButton';
import MotionCard from '../components/ui/MotionCard';
import { useToast } from '../components/ui/Toast';

// Animated skills bar chart
const SkillsChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
        No skill data available
      </div>
    );
  }
  const max = Math.max(...data.map(d => d.count));
  const palette = [
    'from-cyan-500 to-blue-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-emerald-400',
    'from-orange-500 to-amber-400',
    'from-rose-500 to-red-500',
    'from-indigo-500 to-violet-500',
  ];
  return (
    <div className="flex items-end gap-3 px-2" style={{ height: '140px' }}>
      {data.map((d, i) => {
        const pct = Math.max(6, Math.round((d.count / max) * 100));
        return (
          <div key={d.name} className="flex-1 flex flex-col items-center gap-1.5 group">
            <span className="text-xs font-bold text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {d.count}
            </span>
            <div className="w-full relative" style={{ height: '100px' }}>
              <div
                className={`absolute bottom-0 left-0 right-0 rounded-t-lg bg-gradient-to-t ${palette[i % palette.length]}
                            skill-bar opacity-80 group-hover:opacity-100 transition-opacity duration-200`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 text-center leading-tight max-w-full truncate block">
              {d.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const colorMap = {
  blue:   { gradient: 'from-blue-600/20 to-blue-900/10',    border: 'border-blue-500/20',   icon: 'text-blue-400',   badge: 'text-blue-300 bg-blue-500/10',   glow: 'hover:shadow-blue-500/10'   },
  purple: { gradient: 'from-purple-600/20 to-purple-900/10', border: 'border-purple-500/20', icon: 'text-purple-400', badge: 'text-purple-300 bg-purple-500/10', glow: 'hover:shadow-purple-500/10' },
  green:  { gradient: 'from-green-600/20 to-green-900/10',   border: 'border-green-500/20',  icon: 'text-green-400',  badge: 'text-green-300 bg-green-500/10',  glow: 'hover:shadow-green-500/10'  },
  orange: { gradient: 'from-orange-600/20 to-orange-900/10', border: 'border-orange-500/20', icon: 'text-orange-400', badge: 'text-orange-300 bg-orange-500/10', glow: 'hover:shadow-orange-500/10' },
};

const activityColorMap = {
  blue:   'bg-blue-500/10 text-blue-400',
  orange: 'bg-orange-500/10 text-orange-400',
  green:  'bg-green-500/10 text-green-400',
  red:    'bg-red-500/10 text-red-400',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [timeRange, setTimeRange] = useState('30d');
  const [stats, setStats] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [skillsByCategory, setSkillsByCategory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.get('/api/public/dashboard');
      if (res?.data?.data) {
        const { stats, recentActivities, skillsByCategory } = res.data.data;
        setStats(stats || []);
        setRecentActivities(recentActivities || []);
        setSkillsByCategory(skillsByCategory || []);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    const onGlobalRefresh = () => loadDashboard();
    window.addEventListener('skillpulse:refresh', onGlobalRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('skillpulse:refresh', onGlobalRefresh);
    };
  }, [loadDashboard]);

  const exportCsv = () => {
    if (!stats.length) {
      toast.info('No dashboard data to export');
      return;
    }
    const rows = [
      ['Title', 'Value', 'DisplayValue', 'Change', 'Label'],
      ...stats.map((item) => [item.title, item.value, item.displayValue, item.change, item.changeLabel]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dashboard-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Dashboard CSV exported');
  };

  const onCardClick = (title) => {
    const map = {
      'Total Users': '/users',
      'Skills Tracked': '/content?type=Skill',
      'Active Trends': '/analytics?focus=trends',
      'Skill Gaps': '/analytics?focus=skill-gaps',
    };
    const destination = map[title];
    if (destination) navigate(destination);
  };

  return (
    <div className="min-h-screen bg-[#080c14]">
      {/* Page Header */}
      <div className="border-b border-white/5 bg-[#0f1623]/60 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Overview</h1>
            <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-2">
              Real-time platform statistics
              {lastUpdated && (
                <span className="text-xs text-slate-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AnimatedButton
              onClick={loadDashboard}
              disabled={loading}
              variant="ghost"
              className="text-slate-400"
            >
              <span className={`material-symbols-outlined text-xl ${loading ? 'animate-spin' : ''}`}>refresh</span>
              Refresh
            </AnimatedButton>
            <AnimatedButton variant="gradient" className="text-white" onClick={exportCsv}>
              <span className="material-symbols-outlined text-xl">downloading</span>
              Export
            </AnimatedButton>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl h-40 bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const g = colorMap[stat.color] || colorMap.blue;
              return (
                <MotionCard
                  key={index}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: index * 0.06 }}
                  whileHover={{ y: -6 }}
                  className={`relative rounded-2xl border ${g.border} bg-gradient-to-br ${g.gradient}
                              hover:shadow-xl ${g.glow} hover:-translate-y-1.5
                              transition-all duration-300 backdrop-blur-sm overflow-hidden
                              group p-6 stat-card cursor-pointer`}
                  onClick={() => onCardClick(stat.title)}
                >
                  <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-3xl
                                  bg-white/5 group-hover:bg-white/10 transition-opacity duration-300" />
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <span className={`material-symbols-outlined text-2xl ${g.icon}`}>{stat.icon}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${g.badge}`}>
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-1 font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-white tabular-nums">{stat.displayValue}</p>
                  <p className="text-xs text-slate-600 mt-1.5">{stat.changeLabel}</p>
                </MotionCard>
              );
            })}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart */}
          <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#0f1623]/80 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Skills by Category</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Distribution across {skillsByCategory.reduce((a, b) => a + b.count, 0)} tracked skills
                </p>
              </div>
              <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                {['30d', '90d', '1y'].map(r => (
                  <AnimatedButton
                    key={r}
                    onClick={() => setTimeRange(r)}
                    size="sm"
                    variant={timeRange === r ? 'gradient' : 'ghost'}
                    className={`text-xs font-semibold transition-all duration-200
                      ${timeRange === r
                        ? 'text-white shadow-sm shadow-cyan-500/20'
                        : 'text-slate-500 hover:text-white'}`}
                  >
                    {r.toUpperCase()}
                  </AnimatedButton>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="h-40 bg-white/5 rounded-xl animate-pulse" />
            ) : (
              <SkillsChart data={skillsByCategory} />
            )}
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {skillsByCategory.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2 h-2 rounded-sm inline-block" style={{
                    background: ['#06b6d4','#a855f7','#10b981','#f97316','#ef4444','#6366f1'][i % 6]
                  }} />
                  {d.name} ({d.count})
                </span>
              ))}
            </div>
          </div>

          {/* Recent Members */}
          <div className="rounded-2xl border border-white/5 bg-[#0f1623]/80 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Recent Members</h2>
              <span className="text-xs font-medium text-slate-500 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 flex items-center gap-1.5">
                Live <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              </span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-2.5 rounded-xl hover:bg-white/5 border border-transparent
                               hover:border-white/5 transition-all duration-200 group"
                  >
                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                                    ${activityColorMap[activity.color] || activityColorMap.blue}
                                    transition-transform duration-200 group-hover:scale-110`}>
                      <span className="material-symbols-outlined text-base">{activity.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{activity.user}</p>
                      <p className="text-xs text-slate-500 truncate">{activity.action}</p>
                      <p className="text-xs text-slate-700 mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

