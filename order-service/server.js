const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL
    )
  `);
}

function validateOrder(body) {
  const { user_id, product_id, quantity } = body ?? {};
  if (!Number.isInteger(user_id) || user_id <= 0) return "user_id must be a positive integer";
  if (!Number.isInteger(product_id) || product_id <= 0)
    return "product_id must be a positive integer";
  if (!Number.isInteger(quantity) || quantity <= 0) return "quantity must be a positive integer";
  return null;
}

app.get("/orders", async (req, res) => {
  const { rows } = await pool.query("SELECT id, user_id, product_id, quantity FROM orders ORDER BY id");
  res.json(rows);
});

app.get("/orders/:id", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, user_id, product_id, quantity FROM orders WHERE id = $1",
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "order not found" });
  res.json(rows[0]);
});

app.post("/orders", async (req, res) => {
  const error = validateOrder(req.body);
  if (error) return res.status(400).json({ error });
  const { rows } = await pool.query(
    "INSERT INTO orders (user_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING id, user_id, product_id, quantity",
    [req.body.user_id, req.body.product_id, req.body.quantity]
  );
  res.status(201).json(rows[0]);
});

app.put("/orders/:id", async (req, res) => {
  const error = validateOrder(req.body);
  if (error) return res.status(400).json({ error });
  const { rows } = await pool.query(
    "UPDATE orders SET user_id = $1, product_id = $2, quantity = $3 WHERE id = $4 RETURNING id, user_id, product_id, quantity",
    [req.body.user_id, req.body.product_id, req.body.quantity, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "order not found" });
  res.json(rows[0]);
});

app.delete("/orders/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM orders WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: "order not found" });
  res.status(204).end();
});

init().then(() => {
  app.listen(3003, () => {
    console.log("Order service running on port 3003");
  });
});
