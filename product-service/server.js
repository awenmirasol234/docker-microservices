const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC NOT NULL
    )
  `);
}

function validateProduct(body) {
  const { name, price } = body ?? {};
  if (typeof name !== "string" || name.trim() === "") return "name is required";
  if (typeof price !== "number" || !Number.isFinite(price)) return "price must be a number";
  return null;
}

app.get("/products", async (req, res) => {
  const { rows } = await pool.query("SELECT id, name, price FROM products ORDER BY id");
  res.json(rows.map((row) => ({ ...row, price: Number(row.price) })));
});

app.get("/products/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT id, name, price FROM products WHERE id = $1", [
    req.params.id,
  ]);
  if (rows.length === 0) return res.status(404).json({ error: "product not found" });
  res.json({ ...rows[0], price: Number(rows[0].price) });
});

app.post("/products", async (req, res) => {
  const error = validateProduct(req.body);
  if (error) return res.status(400).json({ error });
  const { rows } = await pool.query(
    "INSERT INTO products (name, price) VALUES ($1, $2) RETURNING id, name, price",
    [req.body.name.trim(), req.body.price]
  );
  res.status(201).json({ ...rows[0], price: Number(rows[0].price) });
});

app.put("/products/:id", async (req, res) => {
  const error = validateProduct(req.body);
  if (error) return res.status(400).json({ error });
  const { rows } = await pool.query(
    "UPDATE products SET name = $1, price = $2 WHERE id = $3 RETURNING id, name, price",
    [req.body.name.trim(), req.body.price, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "product not found" });
  res.json({ ...rows[0], price: Number(rows[0].price) });
});

app.delete("/products/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: "product not found" });
  res.status(204).end();
});

init().then(() => {
  app.listen(3002, () => {
    console.log("Product service running on port 3002");
  });
});
