const { supabase } = require('../config/database');
const { recomputeUserAnalysis } = require('../services/analysisService');

async function getAiServiceHealth() {
  const aiServiceUrl = process.env.AI_SERVICE_URL;
  if (!aiServiceUrl) {
    return {
      enabled: false,
      status: 'disabled',
      model: null,
    };
  }

  const token = process.env.AI_SERVICE_TOKEN;
  const timeoutMs = Number(process.env.AI_HEALTH_TIMEOUT_MS || 2500);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${aiServiceUrl.replace(/\/$/, '')}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: token ? { 'x-ai-service-token': token } : {},
    });

    const payload = await response.json().catch(() => null);
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        enabled: true,
        status: 'degraded',
        model: null,
        detail: payload?.detail || `AI health check failed with status ${response.status}`,
      };
    }

    return {
      enabled: true,
      status: payload?.success ? 'connected' : 'degraded',
      model: payload?.model || null,
      services: payload?.services || {},
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      enabled: true,
      status: 'down',
      model: null,
      detail: error.message,
    };
  }
}

// PublicController serves endpoints the frontend expects for dashboard data
class PublicController {
  static async getDashboard(req, res) {
    try {
      // Fetch all real-time counts and recent data in parallel
      const [
        usersResult,
        skillsResult,
        trendsResult,
        gapsResult,
        recentUsersResult,
        skillCategoryResult,
        userSkillsResult
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('skills').select('*', { count: 'exact', head: true }),
        supabase.from('trends').select('*', { count: 'exact', head: true }),
        supabase.from('skill_gaps').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('id, full_name, email, role, created_at').order('created_at', { ascending: false }).limit(8),
        supabase.from('skills').select('name, category'),
        supabase.from('user_skills').select('*', { count: 'exact', head: true })
      ]);

      const totalUsers    = usersResult.count    ?? 0;
      const totalSkills   = skillsResult.count   ?? 0;
      const totalTrends   = trendsResult.count   ?? 0;
      const totalGaps     = gapsResult.count     ?? 0;
      const totalUserSkills = userSkillsResult.count ?? 0;
      const recentUsers   = recentUsersResult.data || [];

      // Build skills-by-category breakdown for the chart
      const categoryMap = {};
      (skillCategoryResult.data || []).forEach(s => {
        const cat = s.category || 'Other';
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      });
      const skillsByCategory = Object.entries(categoryMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      const stats = [
        {
          title: 'Total Users',
          value: totalUsers,
          displayValue: totalUsers.toLocaleString(),
          change: '+12.5%', changeLabel: 'vs last month',
          icon: 'group', positive: true, color: 'blue'
        },
        {
          title: 'Skills Tracked',
          value: totalSkills,
          displayValue: totalSkills.toLocaleString(),
          change: `${skillsByCategory.length} categories`,
          changeLabel: 'in system',
          icon: 'psychology', positive: true, color: 'purple'
        },
        {
          title: 'Active Trends',
          value: totalTrends,
          displayValue: totalTrends.toLocaleString(),
          change: 'industry insights',
          changeLabel: 'tracked',
          icon: 'trending_up', positive: true, color: 'green'
        },
        {
          title: 'Skill Gaps',
          value: totalGaps,
          displayValue: totalGaps.toLocaleString(),
          change: `${totalUserSkills} skills mapped`,
          changeLabel: 'pending review',
          icon: 'warning_amber', positive: false, color: 'orange'
        }
      ];

      // Map recent users as activity feed
      const recentActivities = recentUsers.map(u => ({
        icon: u.role === 'admin' ? 'admin_panel_settings' : 'person_add',
        color: u.role === 'admin' ? 'orange' : 'blue',
        user: u.full_name || u.email.split('@')[0],
        email: u.email,
        action: u.role === 'admin' ? 'joined as administrator' : 'joined the platform',
        time: new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      }));

      res.status(200).json({
        success: true,
        data: {
          stats,
          recentActivities,
          skillsByCategory,
          totals: { users: totalUsers, skills: totalSkills, trends: totalTrends, gaps: totalGaps }
        }
      });
    } catch (err) {
      console.error('PublicController.getDashboard error', err);
      res.status(500).json({ success: false, message: 'Unable to load dashboard data' });
    }
  }

  // Admin: list all users
  static async listUsers(req, res) {
    try {
      const q = typeof req.query?.q === 'string' ? req.query.q.trim().toLowerCase() : '';
      const role = typeof req.query?.role === 'string' ? req.query.role.trim().toLowerCase() : 'all';
      const page = Math.max(1, parseInt(req.query?.page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query?.pageSize, 10) || 8));

      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const filtered = (data || []).filter((user) => {
        const roleMatch = role === 'all' ? true : String(user.role || '').toLowerCase() === role;
        const queryMatch =
          !q ||
          String(user.full_name || '').toLowerCase().includes(q) ||
          String(user.email || '').toLowerCase().includes(q) ||
          String(user.role || '').toLowerCase().includes(q);
        return roleMatch && queryMatch;
      });

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);

      res.status(200).json({
        success: true,
        data: {
          items,
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      });
    } catch (err) {
      console.error('PublicController.listUsers error', err);
      res.status(500).json({ success: false, message: 'Unable to load users' });
    }
  }

  static async getAdminAccount(req, res) {
    try {
      const userId = req.user?.id;
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error) throw error;
      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error('PublicController.getAdminAccount error', err);
      res.status(500).json({ success: false, message: 'Unable to load admin account' });
    }
  }

  static async updateAdminAccount(req, res) {
    try {
      const userId = req.user?.id;
      const { full_name, email, role } = req.body || {};
      const updates = {};

      if (typeof full_name === 'string') updates.full_name = full_name.trim();
      if (typeof email === 'string') updates.email = email.trim().toLowerCase();
      if (typeof role === 'string' && ['admin', 'user'].includes(role)) updates.role = role;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select('id, full_name, email, role, created_at, updated_at')
        .single();

      if (error) throw error;
      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error('PublicController.updateAdminAccount error', err);
      res.status(500).json({ success: false, message: 'Unable to update admin account' });
    }
  }

  static async updateAdminSettings(req, res) {
    try {
      const userId = req.user?.id;
      const currentProfile = req.body?.currentProfile || req.body || {};
      const updates = {};

      if (typeof currentProfile.domain === 'string') updates.domain = currentProfile.domain.trim();
      if (typeof currentProfile.title === 'string') updates.title = currentProfile.title.trim();
      if (typeof currentProfile.experience_level === 'string') updates.experience_level = currentProfile.experience_level.trim();

      if (Object.keys(updates).length > 0) {
        const profileQuery = supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', userId)
          .select('domain, title, experience_level, last_analysis_at, updated_at');

        const { data: updatedRows, error: updateError } = await profileQuery;
        if (updateError) throw updateError;

        if (!updatedRows || updatedRows.length === 0) {
          const { error: insertError } = await supabase.from('profiles').insert({ user_id: userId, ...updates });
          if (insertError) throw insertError;
        }
      }

      return PublicController.getSettingsData(req, res);
    } catch (err) {
      console.error('PublicController.updateAdminSettings error', err);
      res.status(500).json({ success: false, message: 'Unable to update settings' });
    }
  }

  static async updateAdminUser(req, res) {
    try {
      const { id } = req.params;
      const { full_name, email, role } = req.body || {};
      const updates = {};

      if (typeof full_name === 'string') updates.full_name = full_name.trim();
      if (typeof email === 'string') updates.email = email.trim().toLowerCase();
      if (typeof role === 'string' && ['admin', 'user'].includes(role)) updates.role = role;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields to update' });
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select('id, full_name, email, role, created_at, updated_at')
        .single();

      if (error) throw error;
      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error('PublicController.updateAdminUser error', err);
      res.status(500).json({ success: false, message: 'Unable to update user' });
    }
  }

  static async deleteAdminUser(req, res) {
    try {
      const { id } = req.params;

      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;

      res.status(200).json({ success: true, message: 'User deleted' });
    } catch (err) {
      console.error('PublicController.deleteAdminUser error', err);
      res.status(500).json({ success: false, message: 'Unable to delete user' });
    }
  }

  static async getNotifications(req, res) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const notifications = (data || []).map((user, index) => ({
        id: `user-${user.id}-${index}`,
        title: `${user.full_name || user.email} joined as ${user.role || 'user'}`,
        read: false,
        time: user.created_at,
      }));

      res.status(200).json({ success: true, data: notifications });
    } catch (err) {
      console.error('PublicController.getNotifications error', err);
      res.status(500).json({ success: false, message: 'Unable to load notifications' });
    }
  }

  static async markAllNotificationsRead(req, res) {
    res.status(200).json({ success: true, data: [] });
  }

  static async getContentData(req, res) {
    try {
      const [
        skillsCount,
        trendsCount,
        gapsCount,
        recommendationsCount,
        skillsResult,
        trendsResult,
        gapsResult,
      ] = await Promise.all([
        supabase.from('skills').select('*', { count: 'exact', head: true }),
        supabase.from('trends').select('*', { count: 'exact', head: true }),
        supabase.from('skill_gaps').select('*', { count: 'exact', head: true }),
        supabase.from('recommendations').select('*', { count: 'exact', head: true }),
        supabase.from('skills').select('id, name, category, created_at').order('created_at', { ascending: false }).limit(12),
        supabase.from('trends').select('id, title, domain, source, created_at').order('created_at', { ascending: false }).limit(12),
        supabase.from('skill_gaps').select('id, skill_name, domain, gap_level, created_at').order('created_at', { ascending: false }).limit(12),
      ]);

      const skillItems = (skillsResult.data || []).map((item) => ({
        id: item.id,
        title: item.name,
        type: 'Skill',
        category: item.category || 'Other',
        meta: item.category || 'Uncategorized',
        created_at: item.created_at,
      }));

      const trendItems = (trendsResult.data || []).map((item) => ({
        id: item.id,
        title: item.title,
        type: 'Trend',
        category: item.domain || 'General',
        meta: item.source || 'No source',
        created_at: item.created_at,
      }));

      const gapItems = (gapsResult.data || []).map((item) => ({
        id: item.id,
        title: item.skill_name,
        type: 'Skill Gap',
        category: item.domain || 'General',
        meta: `Gap level ${item.gap_level ?? 'N/A'}`,
        created_at: item.created_at,
      }));

      const items = [...skillItems, ...trendItems, ...gapItems]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const stats = {
        totalContent: (skillsCount.count || 0) + (trendsCount.count || 0) + (gapsCount.count || 0),
        skills: skillsCount.count || 0,
        trends: trendsCount.count || 0,
        skillGaps: gapsCount.count || 0,
        recommendations: recommendationsCount.count || 0,
      };

      res.status(200).json({
        success: true,
        data: {
          stats,
          items,
        },
      });
    } catch (err) {
      console.error('PublicController.getContentData error', err);
      res.status(500).json({ success: false, message: 'Unable to load content data' });
    }
  }

  static async getAnalyticsData(req, res) {
    try {
      const [
        usersCount,
        profilesCount,
        userSkillsCount,
        trendsCount,
        roleRows,
        proficiencyRows,
        skillCategoryRows,
        gapDomainRows,
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_skills').select('*', { count: 'exact', head: true }),
        supabase.from('trends').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('role'),
        supabase.from('user_skills').select('proficiency_level'),
        supabase.from('skills').select('category'),
        supabase.from('skill_gaps').select('domain, gap_level'),
      ]);

      const totalUsers = usersCount.count || 0;
      const totalUserSkills = userSkillsCount.count || 0;
      const avgSkillsPerUser = totalUsers > 0 ? Number((totalUserSkills / totalUsers).toFixed(2)) : 0;

      const roleMap = {};
      (roleRows.data || []).forEach((row) => {
        const role = row.role || 'user';
        roleMap[role] = (roleMap[role] || 0) + 1;
      });

      const proficiencyMap = {};
      (proficiencyRows.data || []).forEach((row) => {
        const level = row.proficiency_level || 'unknown';
        proficiencyMap[level] = (proficiencyMap[level] || 0) + 1;
      });

      const categoryMap = {};
      (skillCategoryRows.data || []).forEach((row) => {
        const category = row.category || 'Other';
        categoryMap[category] = (categoryMap[category] || 0) + 1;
      });

      const gapDomainMap = {};
      (gapDomainRows.data || []).forEach((row) => {
        const domain = row.domain || 'General';
        gapDomainMap[domain] = (gapDomainMap[domain] || 0) + 1;
      });

      const topSkillCategories = Object.entries(categoryMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      const topGapDomains = Object.entries(gapDomainMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      const roleBreakdown = Object.entries(roleMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      const proficiencyBreakdown = Object.entries(proficiencyMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            users: totalUsers,
            profiles: profilesCount.count || 0,
            userSkills: totalUserSkills,
            trends: trendsCount.count || 0,
            avgSkillsPerUser,
          },
          roleBreakdown,
          proficiencyBreakdown,
          topSkillCategories,
          topGapDomains,
        },
      });
    } catch (err) {
      console.error('PublicController.getAnalyticsData error', err);
      res.status(500).json({ success: false, message: 'Unable to load analytics data' });
    }
  }

  static async getAdminOverview(req, res) {
    try {
      const [
        usersCount,
        adminsCount,
        profilesCount,
        skillsCount,
        userSkillsCount,
        trendsCount,
        gapsCount,
        recommendationsCount,
        aiGapsCount,
        recentUsersResult,
        skillCategoryRows,
        gapDomainRows,
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('skills').select('*', { count: 'exact', head: true }),
        supabase.from('user_skills').select('*', { count: 'exact', head: true }),
        supabase.from('trends').select('*', { count: 'exact', head: true }),
        supabase.from('skill_gaps').select('*', { count: 'exact', head: true }),
        supabase.from('recommendations').select('*', { count: 'exact', head: true }),
        supabase.from('skill_gaps').select('*', { count: 'exact', head: true }).ilike('reason', 'AI:%'),
        supabase
          .from('users')
          .select('id, full_name, email, role, created_at')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('skills').select('category'),
        supabase.from('skill_gaps').select('domain'),
      ]);

      const totals = {
        users: usersCount.count || 0,
        admins: adminsCount.count || 0,
        profiles: profilesCount.count || 0,
        skills: skillsCount.count || 0,
        userSkills: userSkillsCount.count || 0,
        trends: trendsCount.count || 0,
        skillGaps: gapsCount.count || 0,
        recommendations: recommendationsCount.count || 0,
        aiGeneratedGaps: aiGapsCount.count || 0,
      };

      const profileCoveragePct = totals.users > 0
        ? Number(((totals.profiles / totals.users) * 100).toFixed(1))
        : 0;
      const avgSkillsPerUser = totals.users > 0
        ? Number((totals.userSkills / totals.users).toFixed(2))
        : 0;

      const skillCategoryMap = {};
      (skillCategoryRows.data || []).forEach((row) => {
        const category = row.category || 'Other';
        skillCategoryMap[category] = (skillCategoryMap[category] || 0) + 1;
      });

      const gapDomainMap = {};
      (gapDomainRows.data || []).forEach((row) => {
        const domain = row.domain || 'General';
        gapDomainMap[domain] = (gapDomainMap[domain] || 0) + 1;
      });

      const skillsByCategory = Object.entries(skillCategoryMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      const topGapDomains = Object.entries(gapDomainMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      const recentUsers = (recentUsersResult.data || []).map((u) => ({
        id: u.id,
        name: u.full_name || u.email?.split('@')?.[0] || 'Unknown',
        email: u.email,
        role: u.role || 'user',
        created_at: u.created_at,
      }));

      const aiService = await getAiServiceHealth();

      res.status(200).json({
        success: true,
        data: {
          summary: totals,
          workflows: {
            profileCoveragePct,
            avgSkillsPerUser,
            aiGeneratedGaps: totals.aiGeneratedGaps,
          },
          distributions: {
            skillsByCategory,
            topGapDomains,
          },
          recentUsers,
          aiService,
        },
      });
    } catch (err) {
      console.error('PublicController.getAdminOverview error', err);
      res.status(500).json({ success: false, message: 'Unable to load admin overview data' });
    }
  }

  static async recomputeAdminProfileAnalysis(req, res) {
    try {
      const userId = req.user?.id;
      const targetRole = typeof req.body?.targetRole === 'string' ? req.body.targetRole.trim() : undefined;
      const result = await recomputeUserAnalysis(userId, { targetRole: targetRole || undefined });

      res.status(200).json({
        success: true,
        message: 'Admin profile analysis recomputed and persisted',
        data: result,
      });
    } catch (err) {
      console.error('PublicController.recomputeAdminProfileAnalysis error', err);
      res.status(500).json({ success: false, message: 'Unable to recompute profile analysis' });
    }
  }

  static async getSettingsData(req, res) {
    try {
      const userId = req.user?.id;
      const [
        currentUser,
        currentProfile,
        usersResult,
        adminsResult,
        skillsResult,
        trendsResult,
        gapsResult,
        recentUsersResult,
      ] = await Promise.all([
        supabase.from('users').select('id, email, full_name, role, created_at, updated_at').eq('id', userId).single(),
        supabase.from('profiles').select('domain, title, experience_level, last_analysis_at, updated_at').eq('user_id', userId).maybeSingle(),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('skills').select('*', { count: 'exact', head: true }),
        supabase.from('trends').select('*', { count: 'exact', head: true }),
        supabase.from('skill_gaps').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('id, full_name, email, role, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      res.status(200).json({
        success: true,
        data: {
          currentUser: currentUser.data || null,
          currentProfile: currentProfile.data || null,
          system: {
            totalUsers: usersResult.count || 0,
            totalAdmins: adminsResult.count || 0,
            totalSkills: skillsResult.count || 0,
            totalTrends: trendsResult.count || 0,
            totalSkillGaps: gapsResult.count || 0,
          },
          recentUsers: recentUsersResult.data || [],
        },
      });
    } catch (err) {
      console.error('PublicController.getSettingsData error', err);
      res.status(500).json({ success: false, message: 'Unable to load settings data' });
    }
  }
}

module.exports = PublicController;
