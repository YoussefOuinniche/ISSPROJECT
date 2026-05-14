const { supabaseAdmin } = require('../config/database');

const EXPERIENCE_TO_YEARS = {
  student: 0,
  junior:  1,
  mid:     3,
  senior:  6,
};

const YEARS_TO_EXPERIENCE = (years) => {
  if (years === 0) return 'student';
  if (years <= 2)  return 'junior';
  if (years <= 5)  return 'mid';
  return 'senior';
};

// GET /api/user/profile
const getUserProfile = async (req, res) => {
  try {
    let { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) throw error;

    // Auto-create profile if it doesn't exist (new user)
    if (!profile) {
      const { data: created, error: createErr } = await supabaseAdmin
        .from('profiles')
        .insert([{ user_id: req.user.id, full_name: req.user.user_metadata?.full_name || '', role: 'user' }])
        .select()
        .single();
      if (createErr) throw createErr;
      profile = created;
    }

    return res.json({
      success: true,
      data: {
        ...profile,
        experienceLevel: YEARS_TO_EXPERIENCE(profile.years_experience ?? 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/user/profile  (also handles POST)
const upsertUserProfile = async (req, res) => {
  try {
    const { full_name, fullName, domain, title, experienceLevel, bio } = req.body;
    const nextFullName = full_name ?? fullName;

    // Build profile-table updates. `full_name` lives on `profiles` here
    // (see authController register flow). `users` is auth.users (managed by
    // Supabase Auth) and we mirror display name into auth metadata too.
    const profileUpdates = {};
    if (typeof nextFullName === 'string' && nextFullName.trim()) {
      profileUpdates.full_name = nextFullName.trim();
    }
    if (bio !== undefined) profileUpdates.bio = bio;
    if (domain !== undefined) profileUpdates.domain = domain;
    if (title !== undefined) profileUpdates.title = title;
    if (experienceLevel !== undefined) {
      profileUpdates.experience_level = experienceLevel;
    }

    // Store domain & title inside bio if no dedicated columns were provided.
    if ((domain || title) && bio === undefined && profileUpdates.bio === undefined) {
      const parts = [];
      if (domain) parts.push(`Domain: ${domain}`);
      if (title)  parts.push(`Title: ${title}`);
      if (parts.length) profileUpdates.bio = parts.join('\n');
    }

    let profile = null;
    if (Object.keys(profileUpdates).length > 0) {
      // Upsert ensures a row exists even for users who never finished onboarding.
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .upsert(
          { user_id: req.user.id, ...profileUpdates },
          { onConflict: 'user_id' },
        )
        .select()
        .maybeSingle();
      if (error) throw error;
      profile = data;
    }

    if (!profile) {
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', req.user.id)
        .maybeSingle();
      profile = existing || {};
    }

    // Mirror display name into Supabase Auth user_metadata (best-effort).
    if (profileUpdates.full_name) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
          user_metadata: { full_name: profileUpdates.full_name },
        });
      } catch { /* non-critical */ }
    }

    return res.json({
      success: true,
      message: 'Profile updated',
      data: {
        ...profile,
        experienceLevel: YEARS_TO_EXPERIENCE(profile.years_experience ?? 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getUserProfile, upsertUserProfile };
