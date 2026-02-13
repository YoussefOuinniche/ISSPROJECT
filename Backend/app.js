import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import supabase, { testConnection, getUsers, getUserSkills, getRecommendations } from "./connect.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running 🚀 - Connected to local Supabase");
});

/* TEST DATABASE CONNECTION */
app.get("/test-db", async (req, res) => {
  const result = await testConnection();

  if (!result) {
    return res.status(500).json({ error: "Connection failed" });
  }

  res.json({ success: true, message: "Connected to local Supabase ✅" });
});

/* GET ALL USERS WITH PROFILES */
app.get("/api/users", async (req, res) => {
  const users = await getUsers();

  if (!users) {
    return res.status(500).json({ error: "Failed to fetch users" });
  }

  res.json({ success: true, data: users });
});

/* GET USER SKILLS */
app.get("/api/users/:userId/skills", async (req, res) => {
  const { userId } = req.params;
  const skills = await getUserSkills(userId);

  if (!skills) {
    return res.status(500).json({ error: "Failed to fetch user skills" });
  }

  res.json({ success: true, data: skills });
});

/* GET USER RECOMMENDATIONS */
app.get("/api/users/:userId/recommendations", async (req, res) => {
  const { userId } = req.params;
  const recommendations = await getRecommendations(userId);

  if (!recommendations) {
    return res.status(500).json({ error: "Failed to fetch recommendations" });
  }

  res.json({ success: true, data: recommendations });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🔥`);
  console.log(`Supabase local: http://127.0.0.1:54321`);
  console.log(`Supabase Studio: http://127.0.0.1:54323`);
});
