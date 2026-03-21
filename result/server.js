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

app.listen(80, () => console.log("Result app listening on port 80"));
