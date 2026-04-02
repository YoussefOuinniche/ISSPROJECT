// supabaseClient.js - Frontend Supabase Connection
// Use this file in your React frontend (interface/)
// Ownership note: backend API remains the authoritative data access path.
// Use this helper only for explicit direct-Supabase use cases.

import { createClient } from '@supabase/supabase-js';

// Supabase credentials from environment variables
// Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Example Usage:
// ---------------------------------------------------

// 1. Fetch all users with profiles
export const getUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      profiles (*)
    `);
  
  if (error) throw error;
  return data;
};

// 2. Fetch user skills with skill details
export const getUserSkills = async (userId) => {
  const { data, error } = await supabase
    .from('user_skills')
    .select(`
      *,
      skills (
        id,
        name,
        category
      )
    `)
    .eq('user_id', userId);
  
  if (error) throw error;
  return data;
};

// 3. Fetch recommendations with related data
export const getUserRecommendations = async (userId) => {
  const { data, error } = await supabase
    .from('recommendations')
    .select(`
      *,
      skills (*),
      trends (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

// 4. Fetch skill gaps
export const getSkillGaps = async (userId) => {
  const { data, error } = await supabase
    .from('skill_gaps')
    .select(`
      *,
      skills (*)
    `)
    .eq('user_id', userId)
    .order('gap_level', { ascending: false });
  
  if (error) throw error;
  return data;
};

// 5. Realtime subscription example
export const subscribeToUserChanges = (userId, callback) => {
  return supabase
    .channel(`user-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_skills',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};

export default supabase;
