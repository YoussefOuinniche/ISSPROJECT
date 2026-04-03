import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Target, AlertTriangle, ChevronRight, TrendingUp, Compass } from 'lucide-react';
import api from '../api';

const RadarChart = ({ data }) => {
  if (!data || data.length < 3) return <div className="text-slate-500 text-sm text-center">Not enough data for radar chart</div>;

  const size = 260;
  const center = size / 2;
  const radius = size / 2 - 40;
  const numPoints = data.length;
  const angleStep = (Math.PI * 2) / numPoints;
  const maxVal = 100;

  const getPoint = (value, index) => {
    const r = (value / maxVal) * radius;
    const theta = index * angleStep - Math.PI / 2;
    return {
      x: center + r * Math.cos(theta),
      y: center + r * Math.sin(theta)
    };
  };

  const dataPoints = data.map((d, i) => getPoint(d.level, i));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
      {[0.2, 0.4, 0.6, 0.8, 1].map(level => {
        const points = data.map((_, i) => getPoint(level * maxVal, i));
        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
        return <path key={level} d={path} fill="none" stroke="#334155" strokeWidth="1" />;
      })}
      {data.map((_, i) => {
        const edge = getPoint(maxVal, i);
        return <line key={i} x1={center} y1={center} x2={edge.x} y2={edge.y} stroke="#334155" strokeWidth="1" />;
      })}
      <motion.path 
        initial={{ pathLength: 0, opacity: 0 }} 
        animate={{ pathLength: 1, opacity: 1 }} 
        transition={{ duration: 1.5, ease: 'easeOut' }}
        d={dataPath} 
        fill="rgba(6, 182, 212, 0.2)" 
        stroke="#06b6d4" 
        strokeWidth="2" 
      />
      {data.map((d, i) => {
        const edge = getPoint(maxVal * 1.15, i);
        return (
          <text key={i} x={edge.x} y={edge.y + 4} fill="#cbd5e1" fontSize="11" textAnchor="middle" fontWeight="500">
            {d.name.length > 10 ? d.name.slice(0, 10) + '...' : d.name}
          </text>
        );
      })}
    </svg>
  );
};

const ConfidenceMeter = ({ score }) => (
  <div className="w-full">
    <div className="flex justify-between items-end mb-2">
      <span className="text-sm font-semibold text-slate-300">AI Confidence</span>
      <span className="text-xs text-cyan-400 font-bold">{score}% match</span>
    </div>
    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
      <motion.div 
        initial={{ width: 0 }} 
        animate={{ width: `${score}%` }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
      />
    </div>
  </div>
);

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/api/user/profile');
        setProfile(res.data.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load AI profile data');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
      </div>
    );
  }

  const currentRole = profile?.currentRole || 'Software Engineer';
  const targetRole = profile?.targetRole || 'Senior Engineer';
  
  const rawSkills = profile?.skills || [
    { skill_name: 'JavaScript', proficiency_level: 'expert' },
    { skill_name: 'React', proficiency_level: 'advanced' },
    { skill_name: 'Node.js', proficiency_level: 'intermediate' },
    { skill_name: 'Python', proficiency_level: 'beginner' },
    { skill_name: 'Docker', proficiency_level: 'beginner' }
  ];
  
  const levelMap = { 'expert': 100, 'advanced': 80, 'intermediate': 50, 'beginner': 25 };
  const radarSkills = rawSkills.slice(0, 6).map(s => ({
    name: s.skill_name || s.name,
    level: levelMap[(s.proficiency_level || '').toLowerCase()] || 50
  }));

  const gaps = profile?.skillGaps || profile?.gaps || [
    { skill_name: 'Kubernetes', domain: 'DevOps', gap_level: 4, reason: 'High demand in target role' },
    { skill_name: 'System Design', domain: 'Architecture', gap_level: 5, reason: 'Required for Senior' }
  ];

  const recommendations = profile?.recommendations || [
    { title: 'Master Container Orchestration', content: 'Consider the CKA certification.', type: 'course', priority: 'high' },
    { title: 'Read Designing Data-Intensive Applications', content: 'Essential for system design rounds.', type: 'book', priority: 'medium' }
  ];

  const matchScore = profile?.aiConfidenceScore || profile?.matchScore || 65;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-display text-slate-100 min-h-[60vh]">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Sparkles className="text-cyan-400" size={28} />
          AI Profile Overview
        </h1>
        <p className="text-slate-400 mt-2 max-w-2xl">
          Your dynamic career development dashboard, powered by real-time skill gap analysis and market intelligence.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 flex flex-col gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-3xl shadow-xl backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Target size={100} />
            </div>
            
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Compass className="text-emerald-400" size={20} />
              Career Goal
            </h2>
            
            <div className="space-y-4 relative z-10">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Current Role</p>
                <p className="text-lg text-slate-100 font-medium bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-700/30">
                  {currentRole}
                </p>
              </div>
              <div className="flex justify-center text-slate-500">
                <ChevronRight size={24} className="rotate-90 lg:rotate-0" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Target Role</p>
                <p className="text-lg text-cyan-50 font-medium bg-cyan-900/20 px-3 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                  {targetRole}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <ConfidenceMeter score={matchScore} />
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-1">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.1 }}
            className="h-full p-6 bg-slate-800/40 border border-slate-700/50 rounded-3xl shadow-xl backdrop-blur-sm flex flex-col items-center justify-center min-h-[340px]"
          >
            <h2 className="text-lg font-semibold text-white mb-6 self-start w-full">Skill Radar</h2>
            <div className="w-full flex-1 flex items-center justify-center relative">
              <RadarChart data={radarSkills} />
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-1">
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
            className="h-full p-6 bg-slate-800/40 border border-slate-700/50 rounded-3xl shadow-xl backdrop-blur-sm"
          >
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="text-rose-400" size={20} />
              Skill Gaps vs Trends
            </h2>
            
            <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {gaps.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No significant skill gaps identified.</p>
              ) : (
                gaps.map((gap, idx) => (
                  <div key={idx} className="bg-slate-900/60 p-4 rounded-2xl border border-rose-500/10 relative overflow-hidden group hover:border-rose-500/30 transition-colors">
                    <div className={`absolute top-0 left-0 w-1 h-full bg-rose-500/50 opacity-${gap.gap_level * 20}`} />
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-slate-200">{gap.skill_name}</h3>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                        {gap.domain}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mt-2">{gap.reason}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6 p-6 lg:p-8 bg-gradient-to-br from-slate-800/60 to-slate-900/80 border border-slate-700/50 rounded-3xl shadow-xl backdrop-blur-sm"
      >
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Sparkles className="text-amber-400" size={22} />
          Recommendations Panel
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recommendations.length === 0 ? (
            <p className="text-slate-400 text-sm col-span-full">No active recommendations at this time.</p>
          ) : (
            recommendations.map((rec, idx) => (
              <div key={idx} className="bg-slate-800/50 border border-slate-700 hover:border-cyan-500/30 transition-colors p-5 rounded-2xl flex flex-col h-full group">
                <div className="flex justify-between mb-3 items-start gap-2">
                  <h3 className="text-sm font-semibold text-slate-100 flex-1 leading-snug group-hover:text-cyan-300 transition-colors">
                    {rec.title}
                  </h3>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border ${rec.priority === 'high' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : rec.priority === 'medium' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                    {rec.priority || 'normal'}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-auto">{rec.content}</p>
                <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center text-xs text-slate-500">
                  <span className="capitalize">{rec.type}</span>
                  <button className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Set Action <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>

    </div>
  );
}

