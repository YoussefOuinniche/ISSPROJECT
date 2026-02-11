// connect.js
// Supabase connection file (Frontend / Node / React / Vanilla JS)

import { createClient } from "@supabase/supabase-js";

// === LOCAL SUPABASE CREDENTIALS ===
// These are your local development credentials from 'npx supabase start'
const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"; 
// ⚠️ Use ONLY the publishable (anon) key in frontend

// Create client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================
// Example functions you can use
// ================================

// TEST CONNECTION
export async function testConnection() {
  const { data, error } = await supabase.from("users").select("*").limit(1);

  if (error) {
    console.error("Connection failed:", error.message);
    return null;
  }

  console.log("Connected ✅ to local Supabase");
  return data;
}

// GET ALL USERS
export async function getUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("*, profiles(*)");

  if (error) {
    console.error("Error fetching users:", error.message);
    return null;
  }

  return data;
}

// GET USER SKILLS
export async function getUserSkills(userId) {
  const { data, error } = await supabase
    .from("user_skills")
    .select("*, skills(*)")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user skills:", error.message);
    return null;
  }

  return data;
}

// GET RECOMMENDATIONS
export async function getRecommendations(userId) {
  const { data, error } = await supabase
    .from("recommendations")
    .select("*, skills(*), trends(*)")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching recommendations:", error.message);
    return null;
  }

  return data;
}

// Default export for convenience
export default supabase;