const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT
    )
  `);
}

function validateReview(body) {
  const { product_id, user_id, rating, comment } = body ?? {};
  if (!Number.isInteger(product_id) || product_id <= 0)
    return "product_id must be a positive integer";
  if (!Number.isInteger(user_id) || user_id <= 0) return "user_id must be a positive integer";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return "rating must be an integer from 1 to 5";
  if (comment !== undefined && typeof comment !== "string") return "comment must be a string";
  return null;
}

app.get("/reviews", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, product_id, user_id, rating, comment FROM reviews ORDER BY id"
  );
  res.json(rows);
});

app.get("/reviews/:id", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, product_id, user_id, rating, comment FROM reviews WHERE id = $1",
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "review not found" });
  res.json(rows[0]);
});

app.post("/reviews", async (req, res) => {
  const error = validateReview(req.body);
  if (error) return res.status(400).json({ error });
  const { rows } = await pool.query(
    "INSERT INTO reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING id, product_id, user_id, rating, comment",
    [req.body.product_id, req.body.user_id, req.body.rating, req.body.comment ?? null]
  );
  res.status(201).json(rows[0]);
});

app.put("/reviews/:id", async (req, res) => {
  const error = validateReview(req.body);
  if (error) return res.status(400).json({ error });
  const { rows } = await pool.query(
    "UPDATE reviews SET product_id = $1, user_id = $2, rating = $3, comment = $4 WHERE id = $5 RETURNING id, product_id, user_id, rating, comment",
    [req.body.product_id, req.body.user_id, req.body.rating, req.body.comment ?? null, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "review not found" });
  res.json(rows[0]);
});

app.delete("/reviews/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM reviews WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: "review not found" });
  res.status(204).end();
});

init().then(() => {
  app.listen(3005, () => {
    console.log("Review service running on port 3005");
  });
});
