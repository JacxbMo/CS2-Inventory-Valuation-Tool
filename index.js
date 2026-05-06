const express = require("express");
const path = require("path");

const apiRoutes = require("./src/routes/api-routes");

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.use("/api", apiRoutes);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

app.get("/", (req, res) => {
  res.redirect("/public/index.html");
});
