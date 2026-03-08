const { supabase } = require('../config/database');

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
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error('PublicController.listUsers error', err);
      res.status(500).json({ success: false, message: 'Unable to load users' });
    }
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
