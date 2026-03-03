import React, { useEffect, useMemo, useState } from 'react';
import './Content.css';
import api from '../api';
import AnimatedButton from '../components/ui/AnimatedButton';
import MotionCard from '../components/ui/MotionCard';

const typeIcon = {
  Skill: 'psychology',
  Trend: 'trending_up',
  'Skill Gap': 'warning_amber',
};

const Content = () => {
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalContent: 0,
    skills: 0,
    trends: 0,
    skillGaps: 0,
    recommendations: 0,
  });
  const [items, setItems] = useState([]);

  const loadContent = async () => {
    try {
      setError('');
      const res = await api.get('/api/public/admin/content');
      const payload = res?.data?.data;
      if (payload) {
        setStats(payload.stats || {});
        setItems(payload.items || []);
      }
    } catch (err) {
      console.error('Failed to load content data', err);
      setError('Failed to load content data from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchType = selectedType === 'all' || item.type === selectedType;
      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        item.title?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.meta?.toLowerCase().includes(query);
      return matchType && matchQuery;
    });
  }, [items, searchQuery, selectedType]);

  const cards = [
    { title: 'Total Content', value: stats.totalContent ?? 0, icon: 'description', iconClass: 'text-blue-400', bgClass: 'bg-blue-500/10' },
    { title: 'Skills', value: stats.skills ?? 0, icon: 'psychology', iconClass: 'text-cyan-400', bgClass: 'bg-cyan-500/10' },
    { title: 'Trends', value: stats.trends ?? 0, icon: 'trending_up', iconClass: 'text-green-400', bgClass: 'bg-green-500/10' },
    { title: 'Skill Gaps', value: stats.skillGaps ?? 0, icon: 'warning_amber', iconClass: 'text-orange-400', bgClass: 'bg-orange-500/10' },
    { title: 'Recommendations', value: stats.recommendations ?? 0, icon: 'lightbulb', iconClass: 'text-purple-400', bgClass: 'bg-purple-500/10' },
  ];

  return (
    <div className="min-h-screen bg-[#080c14]">
      <div className="border-b border-white/5 bg-[#0f1623]/60 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Content</h1>
            <p className="text-sm text-slate-400 mt-0.5">Database-backed knowledge assets</p>
          </div>
          <AnimatedButton
            onClick={loadContent}
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
          {cards.map((card) => (
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

        <div className="rounded-2xl border border-white/10 bg-[#0f1623]/80 overflow-hidden">
          <div className="p-5 border-b border-white/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {['all', 'Skill', 'Trend', 'Skill Gap'].map((type) => (
                <AnimatedButton
                  key={type}
                  onClick={() => setSelectedType(type)}
                  size="sm"
                  variant={selectedType === type ? 'gradient' : 'ghost'}
                  className={`text-sm transition-colors ${
                    selectedType === type
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {type === 'all' ? 'All' : type}
                </AnimatedButton>
              ))}
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">search</span>
              <input
                type="text"
                placeholder="Search title/category/meta"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 w-full lg:w-80"
              />
            </div>
          </div>

          {error && (
            <div className="mx-5 mt-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10 bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Meta</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td colSpan={5} className="px-6 py-4"><div className="h-8 bg-white/5 rounded-lg animate-pulse" /></td>
                    </tr>
                  ))
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">No matching database records.</td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={`${item.type}-${item.id}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm text-white font-medium">{item.title}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base text-cyan-400">{typeIcon[item.type] || 'dataset'}</span>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">{item.category || '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{item.meta || '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(item.created_at).toLocaleDateString('en-GB')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && (
            <div className="px-6 py-3 border-t border-white/10 text-xs text-slate-600">
              Showing {filteredItems.length} records from database
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Content;
