const express = require("express");
const app = express();

app.get("/products", (req, res) => {
  res.json([
    { id: 1, name: "Laptop", price: 50000 },
    { id: 2, name: "Mouse", price: 500 }
  ]);
});

app.listen(3002, () => {
  console.log("Product service running on port 3002");
});
