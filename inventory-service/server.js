const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL UNIQUE,
      stock INTEGER NOT NULL
    )
  `);
}

function validateInventory(body) {
  const { product_id, stock } = body ?? {};
  if (!Number.isInteger(product_id) || product_id <= 0)
    return "product_id must be a positive integer";
  if (!Number.isInteger(stock) || stock < 0) return "stock must be a non-negative integer";
  return null;
}

app.get("/inventory", async (req, res) => {
  const { rows } = await pool.query("SELECT id, product_id, stock FROM inventory ORDER BY id");
  res.json(rows);
});

app.get("/inventory/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT id, product_id, stock FROM inventory WHERE id = $1", [
    req.params.id,
  ]);
  if (rows.length === 0) return res.status(404).json({ error: "inventory entry not found" });
  res.json(rows[0]);
});

app.post("/inventory", async (req, res) => {
  const error = validateInventory(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const { rows } = await pool.query(
      "INSERT INTO inventory (product_id, stock) VALUES ($1, $2) RETURNING id, product_id, stock",
      [req.body.product_id, req.body.stock]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ error: "product already has inventory" });
    throw err;
  }
});

app.put("/inventory/:id", async (req, res) => {
  const error = validateInventory(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const { rows } = await pool.query(
      "UPDATE inventory SET product_id = $1, stock = $2 WHERE id = $3 RETURNING id, product_id, stock",
      [req.body.product_id, req.body.stock, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "inventory entry not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ error: "product already has inventory" });
    throw err;
  }
});

app.delete("/inventory/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM inventory WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: "inventory entry not found" });
  res.status(204).end();
});

init().then(() => {
  app.listen(3004, () => {
    console.log("Inventory service running on port 3004");
  });
});
