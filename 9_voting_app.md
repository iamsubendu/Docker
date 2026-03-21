# Voting app — learning project

A small multi-service app used to **learn Docker** (Compose, networking, volumes, multiple images). You vote **Cats** or **Dogs**; votes flow through Redis → a worker → PostgreSQL; a separate UI shows the results.

---

## Table of Contents

- [What we are building](#what-we-are-building)
- [Architecture (design)](#architecture-design)
- [How a vote flows](#how-a-vote-flows)
- [Many `docker run` commands and linking](#many-docker-run-commands-and-linking)
- [The same stack with `docker-compose.yml`](#the-same-stack-with-docker-composeyml)
- [Build from local folders (`build:`)](#build-from-local-folders-build)
- [Runnable code in this repo](#runnable-code-in-this-repo)

---

## What we are building

| Piece          | Role                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------- |
| **Voting UI**  | Web app (JavaScript or React). User picks **Cats** or **Dogs** and submits.                  |
| **Redis**      | In-memory store. Holds new votes quickly so the UI stays fast.                               |
| **Worker**     | Background process (e.g. **Node.js**). Reads votes from Redis and writes them to PostgreSQL. |
| **PostgreSQL** | Permanent database. Stores votes for the long term.                                          |
| **Result UI**  | Second web app. Reads from PostgreSQL and shows totals (e.g. Cats vs Dogs).                  |

---

## Architecture (design)

### Diagram (plain text)

Vote travels **down** the stack; the result screen reads from the bottom.

```
┌────────────────┐
│   Voting UI    │     user chooses Cats or Dogs
│  (JS / React)  │
└───────┬────────┘
        │  send vote
        ▼
┌────────────────┐
│     Redis      │     keeps new votes in memory (fast)
│  (in-memory)   │
└───────┬────────┘
        │  worker picks up
        ▼
┌────────────────┐
│    Worker      │     Node.js: read Redis, write to DB
│   (Node.js)    │
└───────┬────────┘
        │  save vote
        ▼
┌────────────────┐
│  PostgreSQL    │     real database (data stays after restart)
│   (real DB)    │
└───────┬────────┘
        │  read counts
        ▼
┌────────────────┐
│   Result UI    │     shows Cats vs Dogs totals
│  (JS / React)  │
└────────────────┘
```

**One line:** Voting UI → Redis → Worker → PostgreSQL → Result UI

---

## How a vote flows

1. User opens the **Voting UI** and chooses **Cats** or **Dogs**, then submits.
2. The voting service sends the choice to **Redis** (fast, in memory).
3. The **Worker** picks up work from Redis (e.g. a list or stream of votes).
4. The worker **writes** each vote into **PostgreSQL** (durable storage).
5. User opens the **Result UI** (or refreshes it). It **reads** counts from PostgreSQL and shows the score.

---

## Many `docker run` commands and linking

Assume your images already exist (`redis`, `postgres`, `voting-app`, `result-app`, `worker`). You might start everything like this:

```bash
docker run -d --name=redis redis
docker run -d --name=db postgres
docker run -d --name=vote -p 5000:80 voting-app
docker run -d --name=result -p 5001:80 result-app
docker run -d --name=worker worker
```

**Problem:** Containers are isolated. By default, `vote` does not know how to reach `redis`, `result` does not know `db`, and `worker` does not know `redis` or `db`. Your app code often uses **hostnames** like `redis` or `db` — those names must resolve inside each container. If you only run the commands above, you will get **connection errors** because nothing is linked yet.

**Old way — `--link`:** Docker can add **DNS entries** so one container sees another under a name you choose.

```bash
docker run -d --name=vote -p 5000:80 --link redis:redis voting-app
docker run -d --name=result -p 5001:80 --link db:db result-app
docker run -d --name=worker --link db:db --link redis:redis worker
```

| Part                 | Meaning                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| `--link redis:redis` | Inside `vote`, the hostname **`redis`** points to the container named `redis`.         |
| `--link db:db`       | Inside `result` or `worker`, the hostname **`db`** points to the container named `db`. |

**Warning:** `--link` is **deprecated** and may be removed in a future Docker version. Prefer **user-defined networks** or **Docker Compose** (see [8_compose.md](8_compose.md)) — services on the same network can reach each other by **container name** without `--link`.

**Order:** Start **redis** and **db** (and env vars they need) **before** `vote`, `result`, and `worker` so the linked containers already exist.

---

## The same stack with `docker-compose.yml`

**Docker Compose** starts every service on the **same network**. Each service is reachable by its **service name** (`redis`, `db`, `vote`, …) — same idea as `--link`, but supported and recommended. With **`docker compose`** (Compose V2), you **do not** add **`links:`** in the YAML; the default network already resolves **service names**. See [8_compose.md — Links not required with Compose V2](8_compose.md#links-not-required-with-compose-v2).

Put this next to your project as **`docker-compose.yml`** (image names must match what you built locally or pulled):

```yaml
services:
  redis:
    image: redis

  db:
    image: postgres
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - pgdata:/var/lib/postgresql/data

  vote:
    image: voting-app
    ports:
      - "5000:80"
    depends_on:
      - redis

  result:
    image: result-app
    ports:
      - "5001:80"
    depends_on:
      - db

  worker:
    image: worker
    depends_on:
      - redis
      - db

volumes:
  pgdata:
```

**Run everything:**

```bash
docker compose up -d
```

**Stop and remove containers (network is removed too):**

```bash
docker compose down
```

| Idea                          | Meaning                                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Service names**             | `redis`, `db`, `vote`, `result`, `worker` are hostnames inside the network — your app can use `redis` and `db` like with `--link`. |
| **`depends_on`**              | Starts `redis` / `db` before apps that need them (order only; does not wait until DB is “ready”).                                  |
| **`ports`**                   | Same as `-p 5000:80` on `docker run`.                                                                                              |
| **`environment` / `volumes`** | Postgres needs a password; `pgdata` keeps DB files after `compose down` (without `-v`).                                            |

More Compose basics: [8_compose.md](8_compose.md).

### Build from local folders (`build:`)

If your **own** apps are **not** on Docker Hub yet, you do not need an `image:` tag for those services. Use **`build:`** instead: it points to a **folder** that contains your **app code** and a **`Dockerfile`**. Compose will **build** the image when you run `up` (no separate `docker build` required unless you want it).

**Replace `image:` with `build:`** for each app you develop locally:

```yaml
services:
  redis:
    image: redis

  db:
    image: postgres
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - pgdata:/var/lib/postgresql/data

  vote:
    build: ./vote
    ports:
      - "5000:80"
    depends_on:
      - redis

  result:
    build: ./result
    ports:
      - "5001:80"
    depends_on:
      - db

  worker:
    build: ./worker
    depends_on:
      - redis
      - db

volumes:
  pgdata:
```

| Part                   | Meaning                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build: ./vote`        | Path to folder **relative to the `docker-compose.yml` file**. That folder must contain a **`Dockerfile`** (and your source code). Compose runs `docker build` inside that folder. |
| `./result`, `./worker` | Same idea — one folder per service with its own Dockerfile.                                                                                                                       |

**Folder layout example** (each service in its **own** folder next to Compose):

```
<repo-root>/
  docker-compose.yml
  vote/
    Dockerfile
    public/
    ...
  result/
    Dockerfile
    public/
    ...
  worker/
    Dockerfile
    ...
```

There is **no** extra wrapper folder — `vote/`, `result/`, and `worker/` are siblings.

**After you change Dockerfile or app code**, rebuild and start:

```bash
docker compose up -d --build
```

Or build first, then start: `docker compose build` then `docker compose up -d`.

---

## Runnable code in this repo

A full sample app uses **three separate directories** at the **repository root** (same level as `docker-compose.yml`):

- **`vote/`** — voting UI and API (`public/index.html`, `server.js`, `Dockerfile`).
- **`result/`** — results UI and API (`public/index.html`, `server.js`, `Dockerfile`).
- **`worker/`** — Redis → PostgreSQL worker (`worker.js`, `Dockerfile`).
- **`docker-compose.yml`** — at the **repo root**, next to `vote/`, `result/`, and `worker/` (not nested inside any of them).

---
