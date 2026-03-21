const express = require("express");
const { createClient } = require("redis");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
let redisClient;

async function connectRedis() {
  redisClient = createClient({ url: redisUrl });
  redisClient.on("error", (err) => console.error("Redis error:", err));
  await redisClient.connect();
}

app.post("/vote", async (req, res) => {
  const choice = req.body.choice;
  if (choice !== "cats" && choice !== "dogs") {
    return res.status(400).json({ ok: false, error: "Choose cats or dogs" });
  }
  try {
    await redisClient.lPush("votes", choice);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Could not save vote" });
  }
});

connectRedis()
  .then(() => {
    app.listen(80, () => console.log("Vote app listening on port 80"));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
