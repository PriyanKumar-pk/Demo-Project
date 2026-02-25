import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("emotions.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS user_emotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    emotion TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS playlist_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_type TEXT, -- 'baseline' or 'fairness'
    emotion TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const app = express();
app.use(express.json());

const PORT = 3000;

const EMOTIONS = ["Happy", "Calm", "Focused", "Energetic", "Melancholic"];

// API Routes
app.post("/api/emotions", (req, res) => {
  const { userId, emotion } = req.body;
  if (!EMOTIONS.includes(emotion)) {
    return res.status(400).json({ error: "Invalid emotion" });
  }
  
  // Update or insert emotion for this user
  const existing = db.prepare("SELECT id FROM user_emotions WHERE user_id = ?").get(userId);
  if (existing) {
    db.prepare("UPDATE user_emotions SET emotion = ?, timestamp = CURRENT_TIMESTAMP WHERE user_id = ?").run(emotion, userId);
  } else {
    db.prepare("INSERT INTO user_emotions (user_id, emotion) VALUES (?, ?)").run(userId, emotion);
  }
  
  res.json({ success: true });
});

app.get("/api/emotions/summary", (req, res) => {
  const summary = db.prepare(`
    SELECT emotion, COUNT(*) as count 
    FROM user_emotions 
    WHERE timestamp > datetime('now', '-30 minutes')
    GROUP BY emotion
  `).all();
  res.json(summary);
});

app.get("/api/playlist/next", (req, res) => {
  const activeUsers = db.prepare(`
    SELECT emotion, COUNT(*) as count 
    FROM user_emotions 
    WHERE timestamp > datetime('now', '-30 minutes')
    GROUP BY emotion
  `).all();

  if (activeUsers.length === 0) {
    return res.json({ baseline: null, fairness: null });
  }

  // 1. Baseline: Majority wins
  const baseline = activeUsers.reduce((prev, current) => (prev.count > current.count) ? prev : current).emotion;

  // 2. Fairness-Aware: Starvation-based selection
  // We look at the last 10 tracks played for 'fairness' system
  const history = db.prepare(`
    SELECT emotion FROM playlist_history 
    WHERE system_type = 'fairness' 
    ORDER BY timestamp DESC LIMIT 20
  `).all().map(h => h.emotion);

  // Calculate "starvation" for each active emotion
  // Starvation = (Time since last play) * (Number of users wanting it)
  // For simplicity in this prototype, we'll use (Position in history) * (Count)
  let bestFairnessEmotion = activeUsers[0].emotion;
  let maxScore = -1;

  activeUsers.forEach(group => {
    const lastIndex = history.indexOf(group.emotion);
    const distance = lastIndex === -1 ? 100 : lastIndex; // If never played, high distance
    const score = distance * group.count;
    if (score > maxScore) {
      maxScore = score;
      bestFairnessEmotion = group.emotion;
    }
  });

  // Log the "play"
  db.prepare("INSERT INTO playlist_history (system_type, emotion) VALUES ('baseline', ?)").run(baseline);
  db.prepare("INSERT INTO playlist_history (system_type, emotion) VALUES ('fairness', ?)").run(bestFairnessEmotion);

  res.json({ baseline, fairness: bestFairnessEmotion });
});

app.get("/api/stats", (req, res) => {
  const history = db.prepare("SELECT * FROM playlist_history ORDER BY timestamp DESC LIMIT 100").all();
  const currentEmotions = db.prepare(`
    SELECT emotion, COUNT(*) as count 
    FROM user_emotions 
    WHERE timestamp > datetime('now', '-30 minutes')
    GROUP BY emotion
  `).all();

  res.json({ history, currentEmotions });
});

app.post("/api/reset", (req, res) => {
  db.prepare("DELETE FROM user_emotions").run();
  db.prepare("DELETE FROM playlist_history").run();
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
