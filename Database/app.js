import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import supabase from "./connect.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

/* TEST DATABASE CONNECTION */
app.get("/test-db", async (req, res) => {
  const { data, error } = await supabase.from("test").select("*");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, data });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🔥`);
});
