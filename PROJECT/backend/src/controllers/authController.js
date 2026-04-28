const { supabase, supabaseAdmin } = require('../config/database');

const ALLOWED_DOMAINS = [
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.fr', 'yahoo.co.uk', 'yahoo.es', 'yahoo.de', 'yahoo.it',
  'outlook.com', 'hotmail.com', 'hotmail.fr', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com',
  'aol.com',
];

function isAllowedEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isAllowedEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, error: 'Please use a Gmail, Yahoo, Outlook, or iCloud email address.' });
    }

    // Use admin API to create user with email auto-confirmed (no confirmation email needed)
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || '' },
    });

    if (createError) {
      return res.status(400).json({ success: false, error: createError.message });
    }

    const user = createData.user;

    // Create profile row
    await supabaseAdmin
      .from('profiles')
      .upsert({ user_id: user.id, full_name: fullName || '', role: 'user' }, { onConflict: 'user_id' });

    // Sign in immediately to get a valid session token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      return res.status(400).json({ success: false, error: signInError.message });
    }

    const { session } = signInData;

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: fullName || '',
          role: 'user',
        },
        token: session.access_token,
        refreshToken: session.refresh_token,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return res.status(401).json({ success: false, error: error.message });
    }

    const { user, session } = data;

    // Fetch profile for role info
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, role')
      .eq('user_id', user.id)
      .single();

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: profile?.full_name || user.user_metadata?.full_name || '',
          role: profile?.role || 'user',
        },
        token: session.access_token,
        refreshToken: session.refresh_token,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// POST /api/auth/refresh-token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'refreshToken is required' });
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: token });

    if (error) {
      return res.status(401).json({ success: false, error: error.message });
    }

    const { session } = data;

    return res.json({
      success: true,
      data: {
        token: session.access_token,
        refreshToken: session.refresh_token,
      },
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const { user } = data;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: profile?.role || 'user',
        },
        profile: profile || null,
      },
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    await supabase.auth.signOut();
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { register, login, refreshToken, getMe, logout };
