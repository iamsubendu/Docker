const Redis = require("ioredis");
const { Pool } = require("pg");

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
const dbHost = process.env.DB_HOST || "db";
const dbPassword = process.env.POSTGRES_PASSWORD || "example";

const pool = new Pool({
  host: dbHost,
  user: "postgres",
  password: dbPassword,
  database: "postgres",
  port: 5432,
});

const redis = new Redis(redisUrl);

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

async function initDb() {
  await pool.query(VOTES_TABLE_SQL);
  console.log("DB ready (table votes)");
}

async function run() {
  await waitForPostgres();
  await initDb();
  console.log("Worker waiting for votes from Redis (list: votes)…");

  while (true) {
    const out = await redis.brpop("votes", 0);
    if (!out) continue;
    const choice = out[1];
    try {
      await pool.query("INSERT INTO votes (choice) VALUES ($1)", [choice]);
      console.log("Saved to PostgreSQL:", choice);
    } catch (e) {
      console.error("DB insert failed:", e.message);
      await redis.lpush("votes", choice);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
