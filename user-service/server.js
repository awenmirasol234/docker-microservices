const express = require("express");
const app = express();

app.get("/users", (req, res) => {
  res.json([
    { id: 1, name: "John" },
    { id: 2, name: "Maria" }
  ]);
});

app.listen(3001, () => {
  console.log("User service running on port 3001");
});
