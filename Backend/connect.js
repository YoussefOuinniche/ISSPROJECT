// connect.js
// Supabase connection file (Frontend / Node / React / Vanilla JS)

import { createClient } from "@supabase/supabase-js";

// === YOUR SUPABASE CREDENTIALS ===
const SUPABASE_URL = "https://arqhcwulzddkdcpyqeaf.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_PUBLISHABLE_KEY_HERE"; 
// ⚠️ Use ONLY the publishable (anon) key in frontend

// Create client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================
// Example functions you can use
// ================================

// TEST CONNECTION
export async function testConnection() {
  const { data, error } = await supabase.from("test").select("*");

  if (error) {
    console.error("Connection failed:", error.message);
    return null;
  }

  console.log("Connected ✅ Data:", data);
  return data;
}

// INSERT DATA
export async function insertUser(name) {
  const { data, error } = await supabase
    .from("test")
    .insert([{ name }])
    .select();

  if (error) {
    console.error("Insert error:", error.message);
    return null;
  }

  console.log("Inserted:", data);
  return data;
}

// UPDATE DATA
export async function updateUser(id, newName) {
  const { data, error } = await supabase
    .from("test")
    .update({ name: newName })
    .eq("id", id)
    .select();

  if (error) {
    console.error("Update error:", error.message);
    return null;
  }

  console.log("Updated:", data);
  return data;
}

// DELETE DATA
export async function deleteUser(id) {
  const { error } = await supabase
    .from("test")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete error:", error.message);
    return false;
  }

  console.log("Deleted user with id:", id);
  return true;
}
