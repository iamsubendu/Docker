# Voting stack (Cats vs Dogs)

Separate folders at the **repo root** — one directory per service:

| Folder | App |
|--------|-----|
| **`vote/`** | Voting UI + API |
| **`result/`** | Results UI + API |
| **`worker/`** | Redis → PostgreSQL worker |

**`docker-compose.yml`** is also at the **repo root** (same level as those folders). It starts Redis, Postgres, and builds the three apps.

```
  docker compose ── API calls ──▶ Docker Engine ──▶ redis, db, vote, result, worker
```

**Engine (CLI, API, daemon):** [11_engine.md](11_engine.md) · **Voting architecture:** [9_voting_app.md](9_voting_app.md)

## Run

From the **`Docker/`** repo root:

```bash
docker compose up -d --build
```

- Vote: http://localhost:5000  
- Results: http://localhost:5001  

```bash
docker compose down
```

## PostgreSQL username and password

The **`db`** service in **`docker-compose.yml`** sets **`POSTGRES_USER`**, **`POSTGRES_PASSWORD`**, and **`POSTGRES_DB`**. The official PostgreSQL image **requires** a password for a normal first-time setup; the superuser name and database name should be explicit.

**`result`** and **`worker`** use **`POSTGRES_PASSWORD`** (and **`DB_HOST`**) — the password **must match** what you set on **`db`**. This repo uses database user **`postgres`** and database name **`postgres`** in code; if you change **`POSTGRES_USER`** or **`POSTGRES_DB`**, update the apps accordingly.

See [9_voting_app.md — PostgreSQL username and password](9_voting_app.md#postgresql-username-and-password).

## PostgreSQL volumes (why two `volumes` blocks?)

**Under `db:`**

```yaml
volumes:
  - pgdata:/var/lib/postgresql/data
```

Read the line as **`name_on_host_side` `:` `path_inside_container`**:

- **`pgdata`** — A **named volume**: Docker’s name for a piece of persistent storage. Docker creates the actual folder somewhere on **your computer** (the “host”) and keeps track of it; **you** don’t set that path in the compose file. Think of `pgdata` as a **label** Docker uses so the same storage is reattached every time the container starts.

- **`/var/lib/postgresql/data`** — The path **inside the Postgres container** where the database files must live. Postgres is built to use this directory.

So: Docker **mounts** the storage named `pgdata` at that path in the container. Your data lives in that storage, not only inside the disposable container layer.

**What “mount” means here**

- **Mount** = connect a piece of storage to a **folder path** so that anything that reads/writes that path uses that storage.
- In this compose line, you are saying: “At **`/var/lib/postgresql/data`** inside the container, use the storage named **`pgdata`**.” That connection (volume + path) is one **volume mount**.
- Everyday analogy: plugging in a USB drive so that **`E:\`** (or a folder) shows the drive’s files — the OS “mounted” the drive at that letter/folder. Docker does something similar for `pgdata` → `/var/lib/postgresql/data`.

**What “on the host (managed by Docker)” means**

- **Host** = the machine where Docker runs (your PC or server), as opposed to “inside the container.”
- **Managed by Docker** = Docker picks where on disk the files go (on Windows often inside WSL2 or Docker Desktop’s VM). You refer to it only by the name **`pgdata`**, not by a path like `C:\...` or `/home/...`.

If you used a **bind mount** instead, *you* would choose the folder, e.g. `./mydata:/var/lib/postgresql/data`. A **named volume** is the opposite: you only choose the **name**; Docker manages the real location.

---

**At the bottom of the file**

```yaml
volumes:
  pgdata:
```

**Why there is “no value” under `pgdata:`**

- In YAML, `pgdata:` with nothing under it means “`pgdata` exists, with **default options**.” It is the same idea as writing `pgdata: {}` (an empty map).
- The **mount** (which storage + which path inside the container) is defined **only** under `db:` in `pgdata:/var/lib/postgresql/data`. The bottom block does **not** repeat that path; it only names the volume `pgdata` at the **project** level.

**Is the bottom block required?**

- **For this simple case — usually no.** When `db:` already has `pgdata:/var/lib/postgresql/data`, Compose knows `pgdata` is a **named volume** and will **create it** if it does not exist. So you *can* delete the whole bottom `volumes: pgdata:` block and things often still work the same.
- **Then why include it?**
  1. **Clarity** — Anyone reading the file sees “this project defines a named volume called `pgdata`” in one place.
  2. **Official examples** — Many tutorials and `docker-compose` samples use this pattern.
  3. **Room for options** — If you later need volume-level settings, they go here, e.g. `driver`, `driver_opts`, or `external: true` (use a volume Docker did not create in this compose file).
- **When the bottom block *is* required (or you really want it):** if you set **`external: true`** (volume must already exist), or any non-default **driver** / options — those belong under top-level `volumes:` → `pgdata:`.

**Short summary:** The line that **actually** wires Postgres to persistent storage is under **`db:`** (`pgdata:/var/lib/postgresql/data`). The bottom **`volumes: pgdata:`** is mainly **explicit declaration** and a hook for options, not the thing that defines the mount path.

**If you remove the volume mapping:** removing the `db` container would **lose** database files that aren’t in a volume. With `pgdata`, data stays until you remove the volume (e.g. `docker compose down -v`).

## Layout

```
Docker/
  docker-compose.yml
  vote/
    Dockerfile
    package.json
    server.js
    public/index.html
  result/
    Dockerfile
    package.json
    server.js
    public/index.html
  worker/
    Dockerfile
    package.json
    worker.js
```

Architecture: [9_voting_app.md](9_voting_app.md)
