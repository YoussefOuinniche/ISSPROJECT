const { supabaseAdmin } = require('../config/database');
const { generateAdminToken } = require('../middlewares/auth');

// POST /api/admin/login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    // Simple dev-mode credential check against env vars
    if (
      email.toLowerCase() !== (process.env.ADMIN_EMAIL || '').toLowerCase() ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = generateAdminToken({ email });
    res.json({ success: true, token, admin: { email } });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// GET /api/admin/stats
const getDashboardStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      { count: totalUsers },
      { count: activeSubscriptions },
      { count: totalRoadmaps },
      { count: totalCourses },
      { count: newUsers },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).in('status', ['active', 'trialing']),
      supabaseAdmin.from('ai_roadmaps').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('courses').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers:           totalUsers           || 0,
        activeSubscriptions:  activeSubscriptions  || 0,
        totalRoadmaps:        totalRoadmaps        || 0,
        totalCourses:         totalCourses         || 0,
        newUsersLast30Days:   newUsers             || 0,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
};

module.exports = { adminLogin, getDashboardStats };
