import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";
import authRoutes from "./routes/auth.js";
import warehouseRoutes from "./routes/warehouse.js";
import directionsRoute from "./routes/direction.js";
import productsRoute from "./routes/products.js";
import { exec } from "child_process";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ API routes
app.get("/", async (req, res) => {
  const result = await pool.query("SELECT current_database()");
  res.send(`Database name is : ${result.rows[0].current_database}`);
});

app.post("/optimize-route", (req, res) => {
  const { start, end } = req.body;
  if (!start || !end)
    return res.status(400).json({ error: "Start and End are required" });

  exec(`python optimizer.py "${start}" "${end}"`, (err, stdout, stderr) => {
    if (err) {
      console.error("Python error:", stderr);
      return res.status(500).json({ error: "Route optimization failed." });
    }
    try {
      const parsed = JSON.parse(stdout);
      if (parsed.error) throw new Error(parsed.error);
      res.json(parsed);
    } catch (parseErr) {
      console.error("JSON Parse Error:", parseErr.message);
      res.status(500).json({ error: "Invalid response from optimizer script." });
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/warehouse", warehouseRoutes);
app.use("/products", productsRoute);
app.use("/api/directions", directionsRoute);

// ✅ Serve React frontend build (for production)
const __dirname = path.resolve();

// If your React app build is in project-root/build
app.use(express.static(path.join(__dirname, "../build")));

// Catch-all route for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
