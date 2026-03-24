const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const dbHost = process.env.DB_HOST || "db";
const dbPassword = process.env.POSTGRES_PASSWORD || "example";

const pool = new Pool({
  host: dbHost,
  user: "postgres",
  password: dbPassword,
  database: "postgres",
  port: 5432,
});

const VOTES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    choice VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

async function waitForPostgres(maxAttempts = 60, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch {
      console.log(`Waiting for Postgres (attempt ${attempt}/${maxAttempts})…`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("Postgres did not become ready in time");
}

const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/results", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT choice, COUNT(*)::int AS count FROM votes GROUP BY choice`
    );
    let cats = 0;
    let dogs = 0;
    for (const row of rows) {
      if (row.choice === "cats") cats = row.count;
      if (row.choice === "dogs") dogs = row.count;
    }
    res.json({ cats, dogs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "database" });
  }
});

async function start() {
  await waitForPostgres();
  await pool.query(VOTES_TABLE_SQL);
  app.listen(80, () => console.log("Result app listening on port 80"));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
