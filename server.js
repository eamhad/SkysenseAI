import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs"; // For file existence check
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Weather routes
["current", "forecast", "astronomy"].forEach(route => {
  app.get(`/api/weather/${route}`, async (req, res) => {
    try {
      const params = new URLSearchParams({ key: process.env.WEATHER_API_KEY, ...req.query });
      const { data } = await axios.get(`https://api.weatherapi.com/v1/${route}.json?${params}`);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
  });
});
// ✅ Chatbase identity token route
app.post("/api/chatbase/token", async (req, res) => {
  try {
    // ❗ You must replace this with your actual user auth logic
    // Example placeholder user — replace with real database / session user
    const user = {
      id: "example-user-id",
      email: "user@example.com",
      stripe_accounts: ["acct_123"]
    };

    const secret = process.env.CHATBOT_IDENTITY_SECRET;

    if (!secret) {
      return res.status(500).json({ error: "CHATBOT_IDENTITY_SECRET not set" });
    }

    const token = jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        stripe_accounts: user.stripe_accounts,
      },
      secret,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Chatbase Token Error:", err);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

app.get("*", (req, res) => {
  const filePath = path.join(__dirname, "public", "index.html");
  console.log("Attempting to send file from:", filePath); // Debug path
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("Index file not found");
  }
});

app.listen(PORT, () => {
  console.log(`Skysense AI → http://localhost:${PORT}`);

});
