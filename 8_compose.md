# Docker Compose

Run multiple containers together with one file and one command.

## Table of Contents

- [What is Docker Compose?](#what-is-docker-compose)
- [Installing Docker Compose](#installing-docker-compose)
- [Docker Compose versions (CLI and compose file)](#docker-compose-versions-cli-and-compose-file)
  - [With `docker compose`: you don’t need `--link` or `links:`](#with-docker-compose-you-dont-need--link-or-links)
- [docker-compose.yml](#docker-composeyml)
- [Common commands](#common-commands)
- [Example](#example)
- [Networking in Compose](#networking-in-compose)
  - [Links not required with Compose V2](#links-not-required-with-compose-v2)
  - [Separate networks for frontend and backend](#separate-networks-for-frontend-and-backend)
- [Volumes in Compose](#volumes-in-compose)

---

## What is Docker Compose?

**Docker Compose** is a tool for defining and running **multi-container** applications. You describe all services (web, API, database, etc.) in a single YAML file, then start everything with one command.

| Without Compose                                          | With Compose                                         |
| -------------------------------------------------------- | ---------------------------------------------------- |
| Run `docker run` many times, remember ports and networks | One file defines everything                          |
| Link containers manually                                 | Compose creates a network and DNS names for services |

- Compose file name is usually **`docker-compose.yml`** or **`compose.yml`**.
- Prefer **`docker compose`** (see [below](#docker-compose-versions-cli-and-compose-file)).

**Design:** Compose is a **client** of the same **Docker Engine API** — it reads the YAML file and sends API calls to create networks, volumes, and containers.

```
  compose.yml --> docker compose --> Engine API --> Docker daemon --> services
  (containers, networks, volumes)
```

Engine background: [11_engine.md](11_engine.md).

---

## Installing Docker Compose

**Compose V2** is the **`docker compose`** command (two words). You get it in one of these ways:

| How you use Docker | What to install |
| --- | --- |
| **Docker Desktop** (Windows or Mac) | **Nothing extra** — Docker Desktop includes the Compose plugin. Install or update [Docker Desktop](https://www.docker.com/products/docker-desktop/), start it, then check [below](#verify-compose). |
| **Docker Engine on Linux** (no Desktop) | Install the **`docker-compose-plugin`** package alongside Docker. It provides **`docker compose`** as part of the Docker CLI. |

**Linux (apt, Ubuntu/Debian)** — if you already followed [2_installation.md — On Ubuntu](2_installation.md#on-ubuntu), you likely have this line, which installs Compose with the engine:

```bash
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

If Docker is already installed but Compose is missing, install only the plugin:

```bash
sudo apt-get update
sudo apt-get install -y docker-compose-plugin
```

Other distributions: see [Install the Docker Compose plugin](https://docs.docker.com/compose/install/linux/) in Docker’s docs (RPM, static binaries, etc.).

### Verify Compose

```bash
docker compose version
```

You should see something like `Docker Compose version v2.x.x`. If the command is not found, ensure Docker itself works (`docker --version`) and that the **Compose plugin** is installed (Desktop or `docker-compose-plugin` on Linux).

**Note:** The old standalone **`docker-compose`** binary (hyphen, often v1) is **deprecated**. Prefer **`docker compose`**. See [Docker Compose versions (CLI and compose file)](#docker-compose-versions-cli-and-compose-file).

---

## Docker Compose versions (CLI and compose file)

Don’t mix these up:

| | What it is |
| --- | --- |
| **`docker compose` vs `docker-compose`** | The **command in the terminal** (hyphen = old tool, space = current). |
| **`version:` in the YAML file** | An **old optional line** at the top of `docker-compose.yml`. **Not required anymore** — see the next subsection. |

---

### The command: use `docker compose`

| | **Old (deprecated)** | **Current (use this)** |
| --- | --- | --- |
| **You type** | `docker-compose` (one word, **hyphen**) | `docker` **space** `compose` (two words) |
| **Example** | `docker-compose up -d` | `docker compose up -d` |

Check: `docker compose version`.

---

### With `docker compose`: you don’t need `--link` or `links:`

This stays true regardless of whether your YAML has a `version:` line or not.

| What people used before | What you do with Compose |
| --- | --- |
| `docker run --link other:alias` | Don’t use `--link`. Put services in **`docker compose`** and talk to them by **service name** (e.g. `redis`, `db`). |
| `links:` under a service in `docker-compose.yml` | **Skip it** for normal apps. Compose attaches every service to the **same project network**; DNS resolves **service names** automatically. |

- **`depends_on:`** only affects **start order** — it does **not** replace networking. DNS between services works **without** `depends_on`.
- More detail: [Links not required with Compose V2](#links-not-required-with-compose-v2). For `docker run` + `--link` vs Compose, see [9_voting_app.md](9_voting_app.md#many-docker-run-commands-and-linking).

---

### Your `docker-compose.yml` — `version:` is not required

**Yes — `version:` is not required at all now.** Just start directly with `services:` — that’s it.

```yaml
# Modern way — no version needed
services:
  web:
    image: nginx:alpine
```

Docker follows the **[Compose Specification](https://docs.docker.com/compose/compose-file/)**, which is **versionless**: you don’t declare a compose “file format version” in YAML anymore.

**Why did old files use `version: "2"`, `version: "3.8"`, etc.?**  
Back then, each number **unlocked different features** in the file. **Now** everything lives in one spec — **all features are available** without declaring a version at the top.

**Why you still see `version:` in tutorials or projects**  
They were written **before** this change. Keeping `version:` **won’t break** anything, but it’s **unnecessary**, and Docker **may warn** you that the key is obsolete.

| | |
| --- | --- |
| **New files** | Start with **`services:`** — no **`version:`** line. |
| **Old files with `version:`** | Fine to run as-is; you can remove the line when you edit the file. |

---

## docker-compose.yml

A minimal example:

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"

  api:
    image: node:18-alpine
    command: node server.js
    ports:
      - "3000:3000"
```

| Key        | Meaning                                                                    |
| ---------- | -------------------------------------------------------------------------- |
| `services` | Each top-level key is a **service** (one or more containers of that type). |
| `image`    | Which image to use.                                                        |
| `ports`    | Host port → container port (`"8080:80"`).                                  |
| `command`  | Overrides the image default command.                                       |

You can also use **`build:`** instead of `image:` to build from a Dockerfile next to the compose file.

---

## Common commands

```bash
# Start all services (foreground — logs in terminal)
docker compose up

# Start in background (detached)
docker compose up -d

# Stop and remove containers, networks created by up
docker compose down

# List running services
docker compose ps

# View logs (all services)
docker compose logs

# Logs for one service
docker compose logs web

# Follow logs live
docker compose logs -f

# Rebuild images after Dockerfile changes
docker compose build
docker compose up -d --build

# Run a one-off command in a service container
docker compose exec web sh
```

---

## Example

**docker-compose.yml**

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    depends_on:
      - api

  api:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./api:/app
    command: node server.js
    ports:
      - "3000:3000"
```

**What these lines mean (simple):**

- **`volumes`** — “Use a folder from **my computer** inside the container.”  
  Example: `./html:/usr/share/nginx/html` means: the `html` folder next to the compose file is shown to Nginx as its website folder. Edit files on your PC → the container sees the changes. `:ro` = read-only (the container cannot change your files).

- **`depends_on`** — “Start **`api` before `web`**.” Compose starts `api` first, then `web`. That avoids `web` starting while `api` is still missing.  
  Note: it only controls **start order**, not “wait until API is ready to answer requests.”

- **`working_dir`** — “When this container runs a command, **first go to this folder** inside the container.”  
  Same idea as `WORKDIR` in a Dockerfile — e.g. `/app` is where `node server.js` runs from.

**Run:**

```bash
docker compose up

docker compose up -d
```

**Stop:**

```bash
docker compose down
```

---

## Networking in Compose

- Compose creates a **default network** for the project. All services can reach each other by **service name** (e.g. `http://api:3000` from the `web` container).
- You do not need to `docker network create` manually for basic setups.

### Links not required with Compose V2

| Old / legacy                             | What to use instead                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `docker run --link other:alias`          | Put both apps in **`docker compose`**; use the **service name** as the hostname (e.g. `redis`, `db`).     |
| `links:` under a service in compose YAML | **Omit it.** The default network already gives each container DNS for every **service** name in the file. |

**Why:** `--link` and compose **`links:`** were for wiring containers together before user-defined networks were common. **Docker Compose V2** attaches every service to the **same project network** automatically, so **`web`** can connect to **`api`** using the hostname **`api`** — no linking step.

**You still use** **`depends_on:`** if you only want **start order** (api before web). That is **not** a substitute for networking; DNS works without `depends_on`.

For the old `docker run` + `--link` story vs Compose, see [9_voting_app.md](9_voting_app.md#many-docker-run-commands-and-linking).

### Separate networks for frontend and backend

Sometimes you want **more than one network**: e.g. a **public-facing** tier (reverse proxy, static site) and an **internal** tier (API, database). Containers on different networks **cannot** talk to each other unless they share a network or you expose a port to the host (not ideal for service-to-service traffic).

**Typical layout:**

| Goal | What you do |
| --- | --- |
| Isolate the database | Put **`db`** (and often **`api`**) only on an **internal** network. |
| Let users reach only the edge | Publish ports on **`web`** (e.g. Nginx), not on **`api`** or **`db`**. |
| Let Nginx proxy to the API | Attach **`web`** to **both** the public-facing network **and** the internal network so it can resolve **`http://api:3000`** (or similar). |

Declare networks under a top-level **`networks:`** block, then list which networks each **`service`** uses. Optional: mark a backend network as **`internal: true`** so it has **no default route to the internet** (containers on that network cannot reach the outside world through Docker’s bridge—useful for tightening internal tiers).

**Example — `web` on two networks, `api` and `db` only on the internal network:**

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - frontend_net
      - backend_net
    depends_on:
      - api

  api:
    image: node:18-alpine
    working_dir: /app
    command: node server.js
    networks:
      - backend_net
    # No host ports: only `web` (and other services on backend_net) can reach this by hostname `api`.

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: example
      POSTGRES_DB: postgres
    networks:
      - backend_net
    volumes:
      - pgdata:/var/lib/postgresql/data

networks:
  frontend_net:
    name: myapp_frontend
  backend_net:
    name: myapp_backend
    internal: true

volumes:
  pgdata:
```

**How to read it:**

- **`frontend_net`** — where **`web`** faces the host (`ports:`). You can add other public services here later.
- **`backend_net`** — **`api`**, **`db`**, and **`web`** share it so Nginx can upstream to **`api`** by service name. **`internal: true`** keeps that network from routing outward (adjust if your API must call external APIs—then use a non-internal network or a sidecar pattern).
- **`web`** lists **two** networks so it is reachable from outside **and** can talk to **`api`** on **`backend_net`**.

**If the frontend is only static files** served by the same **`web`** container that proxies to **`api`**, you don’t need a separate “frontend-only” service on **`frontend_net`** alone—the split is still useful so **`db`** never joins the same network as arbitrary future containers you might add to **`frontend_net`**.

**PostgreSQL:** The official image expects **`POSTGRES_PASSWORD`** (required when the data directory is first initialized). Set **`POSTGRES_USER`** and **`POSTGRES_DB`** too. Application services must use the **same** username/password (via their own **`environment`** or config).

---

## Volumes in Compose

Compose uses two common patterns: **bind mounts** (a folder you choose) and **named volumes** (a name Docker manages).

### Bind mount vs named volume

|                    | **Bind mount**                           | **Named volume**                                                        |
| ------------------ | ---------------------------------------- | ----------------------------------------------------------------------- |
| **Syntax example** | `./html:/usr/share/nginx/html`           | `pgdata:/var/lib/postgresql/data`                                       |
| **Left side**      | Path on **your** machine (`./html`)      | A **name** (`pgdata`) — Docker stores files somewhere under its control |
| **Typical use**    | Dev: edit code on host, see in container | Databases: persist data without caring about host path                  |

### What “mount” means

- **Mount** = connect storage to a **directory path** inside the container so reads/writes at that path use that storage.
- Example: `pgdata:/var/lib/postgresql/data` means: at **`/var/lib/postgresql/data`** in the container, use the storage named **`pgdata`**. That pairing is one **volume mount**.

### Named volume: two `volumes` blocks (service + top-level)

```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: example
      POSTGRES_DB: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

**PostgreSQL username and password:** With the official **`postgres`** image you **must** supply **`POSTGRES_PASSWORD`** when the data directory is first created; also set **`POSTGRES_USER`** and **`POSTGRES_DB`** so the superuser name and default database are explicit. Application services that talk to Postgres need the **same** password (and usually the same user/database) via their own env vars.

Read **`pgdata:/var/lib/postgresql/data`** as **`host_side` `:` `path_inside_container`**:

- **`pgdata`** — Named volume: Docker’s label for persistent storage on the **host** (the machine running Docker). **Managed by Docker** = you don’t set `C:\...` or `/home/...`; you only use the name `pgdata`.
- **`/var/lib/postgresql/data`** — Where PostgreSQL **inside the container** stores database files.

**Why `volumes: pgdata:` at the bottom has “no value”**

- In YAML, `pgdata:` with nothing under it means **default options** (same idea as `pgdata: {}`).
- The **mount path** is only in the **service** (`db:`): `pgdata:/var/lib/postgresql/data`. The bottom block **declares** the named volume for the project and is where you’d add options (`driver`, `external: true`, etc.) if needed.

**Is the bottom block required?**

- For a **simple** named volume with defaults: **often no** — Compose can **create** `pgdata` from the line under `db:` alone.
- **Still useful:** clarity, matching tutorials, and a place for **`external: true`** or custom **drivers** when you need them.

**Removing data**

- `docker compose down` keeps named volumes. Add **`-v`** to remove them: `docker compose down -v`.

### Quick recap

- **Bind mounts** — `./folder:/path` maps a folder **you** choose (good for development).
- **Named volumes** — `name:/path` maps Docker-managed storage by **name** (good for DB persistence).
- **PostgreSQL in Compose** — set **`POSTGRES_PASSWORD`** (required on first init), plus **`POSTGRES_USER`** and **`POSTGRES_DB`**; app services need the **same** credentials (see the **`db:`** example under **Named volume: two `volumes` blocks** above).

For more commands, see [3_basicCommands.md](3_basicCommands.md#docker-compose). For a hands-on demo, see [4_demo.md](4_demo.md) (Demo 9). A full stack with Postgres named volumes is in [VOTING_README.md](VOTING_README.md).
