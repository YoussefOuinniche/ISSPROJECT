import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import api from '../api';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import KpiTile from '../components/product/KpiTile';
import { useToast } from '../components/ui/Toast';

const SkillsChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="dashboard-empty">
        No skill data available
      </div>
    );
  }

  const max = Math.max(...data.map((item) => item.count));

  return (
    <div className="dashboard-skill-chart">
      {data.map((item, index) => {
        const pct = Math.max(8, Math.round((item.count / max) * 100));
        return (
          <div key={item.name} className="dashboard-skill-bar-wrap">
            <span className="dashboard-skill-value">
              {item.count}
            </span>
            <div className="dashboard-skill-track">
              <div
                className="dashboard-skill-fill"
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="dashboard-skill-label" title={item.name}>
              {item.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [summary, setSummary] = useState({
    users: 0,
    admins: 0,
    profiles: 0,
    skills: 0,
    userSkills: 0,
    trends: 0,
    skillGaps: 0,
    recommendations: 0,
    aiGeneratedGaps: 0,
  });
  const [workflows, setWorkflows] = useState({
    profileCoveragePct: 0,
    avgSkillsPerUser: 0,
    aiGeneratedGaps: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [skillsByCategory, setSkillsByCategory] = useState([]);
  const [topGapDomains, setTopGapDomains] = useState([]);
  const [aiService, setAiService] = useState({ enabled: false, status: 'disabled', model: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError('');
      const res = await api.get('/api/public/admin/overview');
      if (res?.data?.data) {
        const payload = res.data.data;
        setSummary(payload.summary || {});
        setWorkflows(payload.workflows || {});
        setRecentUsers(payload.recentUsers || []);
        setSkillsByCategory(payload.distributions?.skillsByCategory || []);
        setTopGapDomains(payload.distributions?.topGapDomains || []);
        setAiService(payload.aiService || { enabled: false, status: 'disabled', model: null });
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      setError(err?.response?.data?.message || 'Failed to load admin overview data');
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
    if (!summary?.users && !summary?.skills) {
      toast.info('No dashboard data to export');
      return;
    }
    const rows = [
      ['Metric', 'Value'],
      ['Total Users', summary.users ?? 0],
      ['Administrators', summary.admins ?? 0],
      ['Profiles', summary.profiles ?? 0],
      ['Skills', summary.skills ?? 0],
      ['User Skills', summary.userSkills ?? 0],
      ['Trends', summary.trends ?? 0],
      ['Skill Gaps', summary.skillGaps ?? 0],
      ['Recommendations', summary.recommendations ?? 0],
      ['Profile Coverage %', workflows.profileCoveragePct ?? 0],
      ['Average Skills Per User', workflows.avgSkillsPerUser ?? 0],
      ['AI Generated Gaps', workflows.aiGeneratedGaps ?? 0],
      ['AI Service Status', aiService?.status || 'unknown'],
      ['AI Model', aiService?.model || 'n/a'],
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
      'Active Trends': '/content?type=Trend',
      'Skill Gaps': '/content?type=Skill%20Gap',
    };
    const destination = map[title];
    if (destination) navigate(destination);
  };

  const totalTrackedSkills = useMemo(
    () => skillsByCategory.reduce((sum, item) => sum + Number(item.count || 0), 0),
    [skillsByCategory],
  );

  const stats = useMemo(() => ([
    {
      title: 'Total Users',
      displayValue: Number(summary.users || 0).toLocaleString(),
      change: `${summary.admins || 0} admins`,
      changeLabel: 'active accounts',
      icon: 'group',
    },
    {
      title: 'Skills Tracked',
      displayValue: Number(summary.skills || 0).toLocaleString(),
      change: `${summary.userSkills || 0} mapped`,
      changeLabel: 'user skill links',
      icon: 'psychology',
    },
    {
      title: 'Active Trends',
      displayValue: Number(summary.trends || 0).toLocaleString(),
      change: `${summary.recommendations || 0} recommendations`,
      changeLabel: 'stored in database',
      icon: 'trending_up',
    },
    {
      title: 'Skill Gaps',
      displayValue: Number(summary.skillGaps || 0).toLocaleString(),
      change: `${summary.aiGeneratedGaps || 0} AI-tagged`,
      changeLabel: 'reason begins with AI:',
      icon: 'warning_amber',
    },
  ]), [summary]);

  const workflowTiles = useMemo(() => ([
    {
      label: 'Profile Coverage',
      value: `${workflows.profileCoveragePct || 0}%`,
      description: 'users with profile rows',
      icon: 'badge',
    },
    {
      label: 'Average Skills/User',
      value: `${workflows.avgSkillsPerUser || 0}`,
      description: 'user_skills / users',
      icon: 'balance',
    },
    {
      label: 'AI Generated Gaps',
      value: `${workflows.aiGeneratedGaps || 0}`,
      description: 'skill_gaps reason like AI:%',
      icon: 'auto_awesome',
    },
    {
      label: 'AI Service',
      value: (aiService?.status || 'unknown').toUpperCase(),
      description: aiService?.model ? `model: ${aiService.model}` : 'health endpoint snapshot',
      icon: 'hub',
    },
  ]), [workflows, aiService]);

  const toneFromTitle = (title) => {
    if (title.toLowerCase().includes('user')) return 'primary';
    if (title.toLowerCase().includes('trend')) return 'success';
    if (title.toLowerCase().includes('gap')) return 'warning';
    return 'primary';
  };

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Operations Console</p>
          <h1 className="dashboard-title">Platform Overview</h1>
          <p className="dashboard-subtitle">
            Admin-only overview aligned to database aggregates and AI service health.
          </p>
        </div>
        <div className="dashboard-actions">
          <Button
            variant="secondary"
            onClick={loadDashboard}
            loading={loading}
            icon={<span className="material-symbols-outlined text-lg">refresh</span>}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={exportCsv}
            icon={<span className="material-symbols-outlined text-lg">download</span>}
          >
            Export CSV
          </Button>
        </div>
      </section>

      <section className="dashboard-meta-row">
        <p className="dashboard-meta-item">
          <span className="dashboard-dot" />
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Waiting for first sync'}
        </p>
        <p className="dashboard-meta-item">Source: /api/public/admin/overview</p>
      </section>

      {error ? <p className="dashboard-error">{error}</p> : null}

      <section className="dashboard-section">
        {loading ? (
          <div className="dashboard-kpi-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="dashboard-skeleton" />
            ))}
          </div>
        ) : (
          <div className="dashboard-kpi-grid">
            {stats.map((stat, index) => (
              <KpiTile
                key={`${stat.title}-${index}`}
                title={stat.title}
                value={stat.displayValue}
                change={stat.change}
                changeLabel={stat.changeLabel}
                icon={stat.icon}
                tone={toneFromTitle(stat.title)}
                onClick={() => onCardClick(stat.title)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-workflow-grid">
        {workflowTiles.map((item) => (
          <Card key={item.label} className="dashboard-workflow-card">
            <div className="dashboard-workflow-head">
              <p className="dashboard-workflow-label">{item.label}</p>
              <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
            </div>
            <p className="dashboard-workflow-value">{loading ? '...' : item.value}</p>
            <p className="dashboard-workflow-note">{item.description}</p>
          </Card>
        ))}
      </section>

      <section className="dashboard-content-grid">
        <Card className="dashboard-main-card">
          <div className="dashboard-card-head">
            <div>
              <h2 className="dashboard-card-title">Skills by Category</h2>
              <p className="dashboard-card-subtitle">
                Distribution across {totalTrackedSkills} tracked skills
              </p>
            </div>
            <div className="dashboard-range-picker">
              <span className="dashboard-data-badge">DB Snapshot</span>
            </div>
          </div>

          {loading ? <div className="dashboard-skeleton dashboard-chart-skeleton" /> : <SkillsChart data={skillsByCategory} />}

          <div className="dashboard-legend">
            {skillsByCategory.map((item) => (
              <span key={item.name} className="dashboard-legend-item">
                <span className="dashboard-legend-dot" />
                {item.name} ({item.count})
              </span>
            ))}
          </div>
        </Card>

        <div className="dashboard-rail">
          <Card className="dashboard-side-card">
            <div className="dashboard-card-head">
              <div>
                <h2 className="dashboard-card-title">Recent Members</h2>
                <p className="dashboard-card-subtitle">Latest platform actions</p>
              </div>
              <span className="dashboard-live-badge">Live</span>
            </div>

            {loading ? (
              <div className="dashboard-list-skeletons">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="dashboard-skeleton dashboard-row-skeleton" />
                ))}
              </div>
            ) : (
              <div className="dashboard-activity-list">
                {recentUsers.map((user, index) => (
                  <article key={`${user.email}-${index}`} className="dashboard-activity-row">
                    <div className="dashboard-activity-icon">
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {user.role === 'admin' ? 'admin_panel_settings' : 'person_add'}
                      </span>
                    </div>
                    <div className="dashboard-activity-copy">
                      <p className="dashboard-activity-user">{user.name}</p>
                      <p className="dashboard-activity-action">
                        {user.role === 'admin' ? 'joined as administrator' : 'joined as user'}
                      </p>
                    </div>
                    <p className="dashboard-activity-time">
                      {new Date(user.created_at).toLocaleDateString('en-GB')}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </Card>

          <Card className="dashboard-side-card">
            <div className="dashboard-card-head">
              <div>
                <h2 className="dashboard-card-title">Top Gap Domains</h2>
                <p className="dashboard-card-subtitle">Domains with highest current gap records</p>
              </div>
            </div>

            {loading ? (
              <div className="dashboard-list-skeletons">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="dashboard-skeleton dashboard-row-skeleton" />
                ))}
              </div>
            ) : topGapDomains.length === 0 ? (
              <div className="dashboard-empty">No gap domain data available</div>
            ) : (
              <div className="dashboard-domain-list">
                {topGapDomains.map((domain) => (
                  <div key={domain.name} className="dashboard-domain-row">
                    <p className="dashboard-domain-name">{domain.name}</p>
                    <p className="dashboard-domain-count">{domain.count}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

