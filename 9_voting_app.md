# Voting app — learning project

A small multi-service app used to **learn Docker** (Compose, networking, volumes, multiple images). You vote **Cats** or **Dogs**; votes flow through Redis → a worker → PostgreSQL; a separate UI shows the results.

---

## Table of Contents

- [What we are building](#what-we-are-building)
- [Architecture (design)](#architecture-design)
- [How a vote flows](#how-a-vote-flows)
- [PostgreSQL username and password](#postgresql-username-and-password)
- [Many `docker run` commands and linking](#many-docker-run-commands-and-linking)
  - [Full stack with manual commands (no Compose)](#full-stack-with-manual-commands-no-compose)
- [The same stack with `docker-compose.yml`](#the-same-stack-with-docker-composeyml)
  - [Common Compose commands: `down`, `down -v`, `up --build`](#common-compose-commands-down-down--v-up-build)
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

Vote travels **down** the stack; the result screen reads from the bottom. The voting UI is where the user chooses **Cats** or **Dogs** and sends a vote; **Redis** holds new votes in memory; the **worker** (Node.js) reads Redis and writes to **PostgreSQL**; the **result UI** reads counts and shows totals.

```
+------------------+
|    Voting UI     |
|  (JS / React)    |
+--------+---------+
         |
    send vote
         v
+------------------+
|      Redis       |
|   (in-memory)    |
+--------+---------+
         |
  worker picks up
         v
+------------------+
|     Worker       |
|    (Node.js)     |
+--------+---------+
         |
    save vote
         v
+------------------+
|   PostgreSQL     |
|    (real DB)     |
+--------+---------+
         |
   read counts
         v
+------------------+
|    Result UI     |
|  (JS / React)    |
+------------------+
```

**One line:** Voting UI -> Redis -> Worker -> PostgreSQL -> Result UI

**Same flow (API / DB view):** browser **POST**s a vote to the voting service -> vote lands in **Redis** -> worker **BRPOP** (or similar) -> **INSERT** into Postgres -> result app **SELECT**s counts for the results page.

---

## How a vote flows

1. User opens the **Voting UI** and chooses **Cats** or **Dogs**, then submits.
2. The voting service sends the choice to **Redis** (fast, in memory).
3. The **Worker** picks up work from Redis (e.g. a list or stream of votes).
4. The worker **writes** each vote into **PostgreSQL** (durable storage).
5. User opens the **Result UI** (or refreshes it). It **reads** counts from PostgreSQL and shows the score.

---

## PostgreSQL username and password

The official **`postgres`** image **requires** you to define credentials when the data directory is first created — at minimum **`POSTGRES_PASSWORD`**. You should also set **`POSTGRES_USER`** (superuser name) and **`POSTGRES_DB`** (initial database name) so behavior is explicit.

| Variable | Role |
| --- | --- |
| **`POSTGRES_PASSWORD`** | **Required** for a normal setup — the superuser’s password. Without it, the container may refuse to initialize as you expect. |
| **`POSTGRES_USER`** | Database superuser name (this repo uses **`postgres`**, which matches **`result/`** and **`worker/`** code). |
| **`POSTGRES_DB`** | Name of the default database (this repo uses **`postgres`**). |

**Apps must match the database:** **`result`** and **`worker`** read **`POSTGRES_PASSWORD`** from the environment and connect as user **`postgres`** to database **`postgres`**. Whatever password you set on the **`db`** container, pass the **same** value in **`POSTGRES_PASSWORD`** for **`result`** and **`worker`** (see [this repo’s `docker-compose.yml`](docker-compose.yml)).

---

## Many `docker run` commands and linking

Assume your images already exist (`redis`, `postgres`, `voting-app`, `result-app`, `worker`). You might start everything like this:

```bash
docker run -d --name=redis redis
docker run -d --name=db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=example \
  -e POSTGRES_DB=postgres \
  postgres
docker run -d --name=vote -p 5000:80 voting-app
docker run -d --name=result -p 5001:80 -e DB_HOST=db -e POSTGRES_PASSWORD=example result-app
docker run -d --name=worker -e DB_HOST=db -e POSTGRES_PASSWORD=example worker
```

**Problem:** Containers are isolated. By default, `vote` does not know how to reach `redis`, `result` does not know `db`, and `worker` does not know `redis` or `db`. Your app code often uses **hostnames** like `redis` or `db` — those names must resolve inside each container. If you only run the commands above, you will get **connection errors** because nothing is linked yet.

**Old way — `--link`:** Docker can add **DNS entries** so one container sees another under a name you choose.

```bash
docker run -d --name=vote -p 5000:80 --link redis:redis voting-app
docker run -d --name=result -p 5001:80 --link db:db -e POSTGRES_PASSWORD=example result-app
docker run -d --name=worker --link db:db --link redis:redis -e POSTGRES_PASSWORD=example worker
```

| Part                 | Meaning                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| `--link redis:redis` | Inside `vote`, the hostname **`redis`** points to the container named `redis`.         |
| `--link db:db`       | Inside `result` or `worker`, the hostname **`db`** points to the container named `db`. |

**Warning:** `--link` is **deprecated** and may be removed in a future Docker version. Prefer **user-defined networks** or **Docker Compose** (see [8_compose.md](8_compose.md)) — services on the same network can reach each other by **container name** without `--link`.

**Order:** Start **redis** and **db** (and env vars they need) **before** `vote`, `result`, and `worker` so the linked containers already exist.

### Full stack with manual commands (no Compose)

Instead of `--link`, use a **user-defined network**: every container joins the same network, and **container names** become hostnames (`redis`, `db`). That matches what this repo’s apps expect (`REDIS_URL` defaults to `redis://redis:6379`, `DB_HOST` defaults to `db`).

**From the repository root** (the folder that contains `vote/`, `result/`, `worker/`, and `docker-compose.yml`):

**1. Create the network**

```bash
docker network create vote-net
```

**2. Start Redis and PostgreSQL first** (names **`redis`** and **`db`** must match the hostnames your code uses). For Postgres, set **`POSTGRES_USER`**, **`POSTGRES_PASSWORD`**, and **`POSTGRES_DB`** — see [PostgreSQL username and password](#postgresql-username-and-password).

```bash
docker run -d --name redis --network vote-net redis:7-alpine

docker run -d --name db --network vote-net \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=example \
  -e POSTGRES_DB=postgres \
  --mount type=volume,source=pgdata,target=/var/lib/postgresql/data \
  postgres:15-alpine
```

**`-v pgdata:/var/lib/postgresql/data`** is the **short** form of the same volume mount (older style; same effect). See [12_storage.md](12_storage.md).

On **Windows PowerShell**, run the `db` line as a **single line** (or use `` ` `` for line continuation):

```powershell
docker run -d --name db --network vote-net -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=example -e POSTGRES_DB=postgres --mount type=volume,source=pgdata,target=/var/lib/postgresql/data postgres:15-alpine
```

**3. Build the three app images**

```bash
cd vote
docker build -t voting-app .
cd ../result
docker build -t result-app .
cd ../worker
docker build -t worker .
cd ..
```

**4. Run vote, result, and worker** on **`vote-net`** with the same env vars as [this repo’s `docker-compose.yml`](docker-compose.yml). **`POSTGRES_PASSWORD`** must match the value you used for **`db`** in step 2 ([PostgreSQL username and password](#postgresql-username-and-password)).

```bash
docker run -d --name vote -p 5000:80 --network vote-net -e REDIS_URL=redis://redis:6379 voting-app

docker run -d --name result -p 5001:80 --network vote-net -e DB_HOST=db -e POSTGRES_PASSWORD=example result-app

docker run -d --name worker --network vote-net -e REDIS_URL=redis://redis:6379 -e DB_HOST=db -e POSTGRES_PASSWORD=example worker
```

| URL / note | |
| --- | --- |
| Voting UI | `http://localhost:5000` |
| Result UI | `http://localhost:5001` |
| **Worker** | No `-p` — it only talks to Redis and Postgres on the network. |

**Order:** Datastores first, then apps. If **worker** starts before Postgres accepts connections, restart it: `docker start worker` (Compose’s `depends_on` has the same limitation — it does not wait for the DB to be “ready”).

**Cleanup (removes containers; add `-v` to remove the named volume if you want a fresh DB):**

```bash
docker rm -f vote result worker redis db
docker volume rm pgdata
docker network rm vote-net
```

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
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: example
      POSTGRES_DB: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

  vote:
    image: voting-app
    ports:
      - "5000:80"
    environment:
      REDIS_URL: redis://redis:6379
    depends_on:
      - redis

  result:
    image: result-app
    ports:
      - "5001:80"
    environment:
      DB_HOST: db
      POSTGRES_PASSWORD: example
    depends_on:
      - db

  worker:
    image: worker
    environment:
      REDIS_URL: redis://redis:6379
      DB_HOST: db
      POSTGRES_PASSWORD: example
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

### Common Compose commands: `down`, `down -v`, `up --build`

| Command | What it does |
| --- | --- |
| **`docker compose down`** | Stops and removes **containers** and the **Compose project network**. **Named volumes** (e.g. `pgdata` for PostgreSQL in this repo) are **kept** — your database files survive so votes persist across restarts. |
| **`docker compose down -v`** | Same as `down`, plus **removes named volumes** from the compose file. Use for a **clean slate** (empty DB, all data in those volumes deleted) or when you want Postgres to run **init** again on next `up`. |
| **`docker compose up --build`** | **Builds** images (for services with `build:`) then **starts** containers. Use after you change **Dockerfile** or **app code** so running containers use the new image. Often combined with `-d` for detached mode: `docker compose up -d --build`. |

**Typical sequences:**

```bash
# Stop stack but keep Postgres data
docker compose down

# Stop stack and delete named volumes (fresh database next time)
docker compose down -v

# Rebuild app images and start everything (foreground — logs in terminal)
docker compose up --build
```

Run these from the folder that contains **`docker-compose.yml`**. More Compose commands: [8_compose.md — Common commands](8_compose.md#common-commands).

| Idea                          | Meaning                                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Service names**             | `redis`, `db`, `vote`, `result`, `worker` are hostnames inside the network — your app can use `redis` and `db` like with `--link`. |
| **`depends_on`**              | Starts `redis` / `db` before apps that need them (order only; does not wait until DB is “ready”).                                  |
| **`ports`**                   | Same as `-p 5000:80` on `docker run`.                                                                                              |
| **`environment` / `volumes`** | Postgres needs **`POSTGRES_USER`**, **`POSTGRES_PASSWORD`**, and usually **`POSTGRES_DB`**; **`result`** and **`worker`** need the **same** **`POSTGRES_PASSWORD`** (and **`DB_HOST`**) as in [PostgreSQL username and password](#postgresql-username-and-password). `pgdata` keeps DB files after `compose down` (without `-v`). |

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
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: example
      POSTGRES_DB: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

  vote:
    build: ./vote
    ports:
      - "5000:80"
    environment:
      REDIS_URL: redis://redis:6379
    depends_on:
      - redis

  result:
    build: ./result
    ports:
      - "5001:80"
    environment:
      DB_HOST: db
      POSTGRES_PASSWORD: example
    depends_on:
      - db

  worker:
    build: ./worker
    environment:
      REDIS_URL: redis://redis:6379
      DB_HOST: db
      POSTGRES_PASSWORD: example
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
