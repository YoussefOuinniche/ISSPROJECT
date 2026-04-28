const { supabaseAdmin } = require('../config/database');

async function getProfileId(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (error || !data) throw new Error('Profile not found');
  return data.id;
}

// GET /api/user/skills
const getUserSkills = async (req, res) => {
  try {
    const profileId = await getProfileId(req.user.id);

    const { data, error } = await supabaseAdmin
      .from('user_skills')
      .select(`
        id,
        skill_id,
        proficiency_level,
        self_assessed,
        created_at,
        skills!inner (name, slug)
      `)
      .eq('profile_id', profileId);

    if (error) throw error;

    const skills = data.map(s => ({
      id: s.id,
      skill_id: s.skill_id,
      skill_name: s.skills.name,
      skill_slug: s.skills.slug,
      proficiency_level: s.proficiency_level,
      self_assessed: s.self_assessed,
      created_at: s.created_at,
    }));

    res.json({ success: true, data: skills });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/user/skills
const addUserSkill = async (req, res) => {
  try {
    const { skillId, proficiencyLevel = 'beginner' } = req.body;
    if (!skillId) return res.status(400).json({ success: false, error: 'skillId is required' });

    const profileId = await getProfileId(req.user.id);

    const { data, error } = await supabaseAdmin
      .from('user_skills')
      .insert([{ profile_id: profileId, skill_id: skillId, proficiency_level: proficiencyLevel, self_assessed: true }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/user/skills/:skillId
const updateUserSkill = async (req, res) => {
  try {
    const { skillId } = req.params;
    const { proficiencyLevel } = req.body;

    const profileId = await getProfileId(req.user.id);

    const updateData = {};
    if (proficiencyLevel) updateData.proficiency_level = proficiencyLevel;

    const { data, error } = await supabaseAdmin
      .from('user_skills')
      .update(updateData)
      .eq('profile_id', profileId)
      .eq('skill_id', skillId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/user/skills/:skillId
const deleteUserSkill = async (req, res) => {
  try {
    const { skillId } = req.params;
    const profileId = await getProfileId(req.user.id);

    const { data, error } = await supabaseAdmin
      .from('user_skills')
      .delete()
      .eq('profile_id', profileId)
      .eq('skill_id', skillId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getUserSkills, addUserSkill, updateUserSkill, deleteUserSkill };
