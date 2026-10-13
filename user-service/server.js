const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);
}

app.get("/users", async (req, res) => {
  const { rows } = await pool.query("SELECT id, name FROM users ORDER BY id");
  res.json(rows);
});

app.get("/users/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT id, name FROM users WHERE id = $1", [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: "user not found" });
  res.json(rows[0]);
});

app.post("/users", async (req, res) => {
  const { name } = req.body ?? {};
  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "name is required" });
  }
  const { rows } = await pool.query("INSERT INTO users (name) VALUES ($1) RETURNING id, name", [
    name.trim(),
  ]);
  res.status(201).json(rows[0]);
});

app.put("/users/:id", async (req, res) => {
  const { name } = req.body ?? {};
  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "name is required" });
  }
  const { rows } = await pool.query("UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name", [
    name.trim(),
    req.params.id,
  ]);
  if (rows.length === 0) return res.status(404).json({ error: "user not found" });
  res.json(rows[0]);
});

app.delete("/users/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: "user not found" });
  res.status(204).end();
});

init().then(() => {
  app.listen(3001, () => {
    console.log("User service running on port 3001");
  });
});
