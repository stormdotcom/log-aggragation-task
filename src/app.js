const app = require("express")();

const logger = require("morgan");
const cors = require("cors");
const dotenv = require("dotenv");
const logRoute = require("./routes/logs");
const express = require("express");

dotenv.config();

app.use(logger("dev"));
app.use(cors());
app.use(express.json());

// health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
app.use("/api", logRoute);


app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  res.status(statusCode).json({ message: err.message || "Internal Server Error" });
});

module.exports = app;
