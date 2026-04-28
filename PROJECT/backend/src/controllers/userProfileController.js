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
    const { domain, title, experienceLevel, bio } = req.body;

    const updateData = {};
    if (bio           !== undefined) updateData.bio             = bio;
    if (experienceLevel !== undefined) {
      updateData.years_experience = EXPERIENCE_TO_YEARS[experienceLevel] ?? 0;
    }

    // Store domain & title inside bio as structured metadata if no dedicated columns
    if ((domain || title) && !bio) {
      const parts = [];
      if (domain) parts.push(`Domain: ${domain}`);
      if (title)  parts.push(`Title: ${title}`);
      if (parts.length) updateData.bio = parts.join('\n');
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('user_id', req.user.id)
      .select()
      .maybeSingle();

    if (error) throw error;

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
