import React, { useEffect, useMemo, useState } from 'react';
import './Analytics.css';
import api from '../api';
import AnimatedButton from '../components/ui/AnimatedButton';
import MotionCard from '../components/ui/MotionCard';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState({ users: 0, profiles: 0, userSkills: 0, trends: 0, avgSkillsPerUser: 0 });
  const [roleBreakdown, setRoleBreakdown] = useState([]);
  const [proficiencyBreakdown, setProficiencyBreakdown] = useState([]);
  const [topSkillCategories, setTopSkillCategories] = useState([]);
  const [topGapDomains, setTopGapDomains] = useState([]);

  const loadAnalytics = async () => {
    try {
      setError('');
      const res = await api.get('/api/public/admin/analytics');
      const data = res?.data?.data;
      if (data) {
        setMetrics(data.metrics || {});
        setRoleBreakdown(data.roleBreakdown || []);
        setProficiencyBreakdown(data.proficiencyBreakdown || []);
        setTopSkillCategories(data.topSkillCategories || []);
        setTopGapDomains(data.topGapDomains || []);
      }
    } catch (err) {
      console.error('Failed to load analytics data', err);
      setError('Failed to load analytics data from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const totalRoles = useMemo(() => roleBreakdown.reduce((sum, row) => sum + row.count, 0), [roleBreakdown]);
  const totalProficiency = useMemo(() => proficiencyBreakdown.reduce((sum, row) => sum + row.count, 0), [proficiencyBreakdown]);
  const maxCategory = useMemo(() => Math.max(1, ...topSkillCategories.map((row) => row.count)), [topSkillCategories]);
  const maxGap = useMemo(() => Math.max(1, ...topGapDomains.map((row) => row.count)), [topGapDomains]);

  const metricCards = [
    { title: 'Users', value: metrics.users ?? 0, icon: 'group', iconClass: 'text-cyan-400', bgClass: 'bg-cyan-500/10' },
    { title: 'Profiles', value: metrics.profiles ?? 0, icon: 'badge', iconClass: 'text-blue-400', bgClass: 'bg-blue-500/10' },
    { title: 'User Skills', value: metrics.userSkills ?? 0, icon: 'neurology', iconClass: 'text-purple-400', bgClass: 'bg-purple-500/10' },
    { title: 'Trends', value: metrics.trends ?? 0, icon: 'trending_up', iconClass: 'text-green-400', bgClass: 'bg-green-500/10' },
    { title: 'Avg Skills/User', value: metrics.avgSkillsPerUser ?? 0, icon: 'calculate', iconClass: 'text-orange-400', bgClass: 'bg-orange-500/10' },
  ];

  return (
    <div className="min-h-screen bg-[#080c14]">
      <div className="border-b border-white/5 bg-[#0f1623]/60 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-sm text-slate-400 mt-0.5">All indicators derived from current database rows</p>
          </div>
          <AnimatedButton
            onClick={loadAnalytics}
            variant="ghost"
            className="text-slate-300"
          >
            <span className="material-symbols-outlined text-xl">refresh</span>
            Refresh
          </AnimatedButton>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {metricCards.map((card) => (
            <MotionCard key={card.title} whileHover={{ y: -4 }} className="rounded-2xl border border-white/10 bg-[#0f1623]/80 p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${card.bgClass}`}>
                  <span className={`material-symbols-outlined text-xl ${card.iconClass}`}>{card.icon}</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{card.title}</p>
                  <p className="text-2xl font-bold text-white tabular-nums">{loading ? '—' : card.value}</p>
                </div>
              </div>
            </MotionCard>
          ))}
        </div>

        {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-[#0f1623]/80 p-6">
            <h2 className="text-lg font-bold text-white mb-5">Role Breakdown</h2>
            <div className="space-y-3">
              {(loading ? [] : roleBreakdown).map((row) => {
                const pct = totalRoles ? Math.round((row.count / totalRoles) * 100) : 0;
                return (
                  <div key={row.name}>
                    <div className="flex items-center justify-between mb-1.5 text-sm">
                      <span className="text-slate-300 capitalize">{row.name}</span>
                      <span className="text-slate-500">{row.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {!loading && roleBreakdown.length === 0 && <p className="text-sm text-slate-500">No role data found.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0f1623]/80 p-6">
            <h2 className="text-lg font-bold text-white mb-5">Proficiency Levels</h2>
            <div className="space-y-3">
              {(loading ? [] : proficiencyBreakdown).map((row) => {
                const pct = totalProficiency ? Math.round((row.count / totalProficiency) * 100) : 0;
                return (
                  <div key={row.name}>
                    <div className="flex items-center justify-between mb-1.5 text-sm">
                      <span className="text-slate-300 capitalize">{row.name}</span>
                      <span className="text-slate-500">{row.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {!loading && proficiencyBreakdown.length === 0 && <p className="text-sm text-slate-500">No proficiency data found.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0f1623]/80 p-6">
            <h2 className="text-lg font-bold text-white mb-5">Top Skill Categories</h2>
            <div className="space-y-3">
              {(loading ? [] : topSkillCategories).map((row) => {
                const pct = Math.round((row.count / maxCategory) * 100);
                return (
                  <div key={row.name}>
                    <div className="flex items-center justify-between mb-1.5 text-sm">
                      <span className="text-slate-300">{row.name}</span>
                      <span className="text-slate-500">{row.count}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {!loading && topSkillCategories.length === 0 && <p className="text-sm text-slate-500">No skill category data found.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0f1623]/80 p-6">
            <h2 className="text-lg font-bold text-white mb-5">Top Skill Gap Domains</h2>
            <div className="space-y-3">
              {(loading ? [] : topGapDomains).map((row) => {
                const pct = Math.round((row.count / maxGap) * 100);
                return (
                  <div key={row.name}>
                    <div className="flex items-center justify-between mb-1.5 text-sm">
                      <span className="text-slate-300">{row.name}</span>
                      <span className="text-slate-500">{row.count}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {!loading && topGapDomains.length === 0 && <p className="text-sm text-slate-500">No skill gap domain data found.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
