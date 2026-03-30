# Docker storage

Containers are **easy to throw away** — but **data** (databases, uploads, config you change at run time) must live somewhere **stable**. Docker storage is about **where bytes live** on the **host**, how the **image** stays read-only, and how **volumes** and **bind mounts** attach folders into a container.

## Table of Contents

- [Why storage matters](#why-storage-matters)
- [Host layout: `/var/lib/docker` (Linux Engine)](#host-layout-varlibdocker-linux-engine)
- [Image layers vs the container writable layer](#image-layers-vs-the-container-writable-layer)
- [Layered architecture: diffs, size, and cache reuse](#layered-architecture-diffs-size-and-cache-reuse)
- [Docker volumes: store files that survive container removal](#docker-volumes-store-files-that-survive-container-removal)
- [Two types of mounting: volume vs bind](#two-types-of-mounting-volume-vs-bind)
- [Bind mounts, named volumes, and tmpfs](#bind-mounts-named-volumes-and-tmpfs)
- [Compare at a glance](#compare-at-a-glance)
- [Common commands](#common-commands)
- [Examples with `docker run`](#examples-with-docker-run)
- [Persistence: what survives `docker rm`](#persistence-what-survives-docker-rm)
- [Docker Compose](#docker-compose)
- [See also](#see-also)

---

## Why storage matters

- Everything in the **image** is **read-only** after the image is built (except how you **run** it).
- When you **start** a container (`docker run`), Docker adds a **thin writable layer** on top of the image. **New files** created inside the container and **changes** to files from the image (unless the path is a volume/bind mount) are stored there.
- If you **remove** the container (`docker rm`), that layer is **thrown away** — those writes are **gone** unless you used a **volume** / **bind mount** or **`docker commit`**.
- For **databases**, **uploads**, and **logs you must keep**, you attach **host-backed** storage: **named volumes** or **bind mounts** (or sometimes **tmpfs** for RAM-only temp data).

Mounting is part of the **MNT namespace** story — see [11_engine.md — Container isolation: Linux namespaces](11_engine.md#container-isolation-linux-namespaces).

---

## Host layout: `/var/lib/docker` (Linux Engine)

When you install **Docker Engine** on a **Linux** host, the daemon stores almost all of its **on-disk** state under one root directory. The default is **`/var/lib/docker`**. Under that path Docker creates **several folders**, each aimed at a **different kind** of object — images, containers, volumes, layer storage, and so on. Related files stay **grouped** under the folder that matches their role.

**Typical top-level folders you may see** (exact names depend on **Docker version** and **storage driver**):

```text
/var/lib/docker/
  containers/     per-container metadata, host config, log driver files
  image/          image metadata (manifests, layer references)
  volumes/        data for Docker named volumes
  overlay2/       image and container layer data (common driver today)
  network/        network state Docker manages
```

Older or alternate setups might show **`aufs/`**, **`devicemapper/`**, or another name instead of **`overlay2/`** — that is the **graph driver** / **storage driver** area where image layers and writable layers live. **`overlay2`** is the usual default on current Linux installs; **`aufs`** appears on some older systems.

| Folder (examples) | Role in plain words |
| --- | --- |
| **`containers/`** | One area per container id: config, logs setup, and related small files — **not** your bind-mount data; that stays wherever you pointed it. |
| **`image/`** | Bookkeeping for **images** (what layers exist, how they chain). |
| **`volumes/`** | Files for **named volumes** you create (what `docker volume inspect` maps to on disk). |
| **`overlay2/`** (or **`aufs/`**, etc.) | Large **layer** blobs for images and container writable layers — copy-on-write storage for image stacks. |

**Important**

- Treat this tree as **Engine’s private database**. Prefer **`docker` commands** (`docker image rm`, `docker volume rm`, `docker system prune`, …) instead of **deleting files by hand** under `/var/lib/docker`, or you can **break** Docker’s state.
- **Docker Desktop** on **Windows** or **Mac** does **not** put this on your normal `C:` or Mac disk as `/var/lib/docker` on the host OS; Engine runs in a **Linux VM** (or WSL2), and the same **idea** applies **inside** that environment.

---

## Image layers vs the container writable layer

**Image layers are read-only.** The **container** layer (the thin writable layer on top) is **read-write** — that is where runtime writes go (unless a path is a volume or bind mount).

| Piece | Read / write | What it is |
| --- | --- | --- |
| **Image** | **Read-only** | Stack of layers from the Dockerfile / pull. Shared by many containers; you do not change these layers by running a container. |
| **Container writable layer** | **Read-write** | A **thin** layer Docker adds **when you run** the container (`docker run`, `docker create`, …). It sits **on top of** the image. |

**What goes into the writable layer**

Anything the container **writes** to its filesystem **that is not** redirected to a **volume** or **bind mount** ends up here. That includes:

- **New files** the app or shell creates (logs, caches, temp files, downloaded data, and so on).
- **Changes** to files that **came from the image** (edit a config file, overwrite a script). The image layers stay read-only; **copy-on-write** copies the file into the writable layer and stores the change there.
- **Deletes** of image files (represented in the storage driver so the image file is still unchanged underneath).

So it is **not** only “user edits” and **not** only “generated files” — **both** new files and modifications to existing image files live in this layer **unless** those paths are mounted from the host.

**When the container is destroyed**

When you **remove** the container (`docker rm`, or `docker compose down` without keeping the container), Docker **discards** that writable layer. **Everything in it is gone** — unless you **saved** it elsewhere (e.g. **`docker commit`** to a new image, or the data was in a **volume** / **bind mount**).

**Copy-on-write (short idea):** the first time a running container **changes** a file that came from an image layer, Docker copies that file into the **writable layer** and applies the change there. Unchanged files stay shared with the image.

```
+----------------------------------------------------------------------+
| IMAGE layers: READ-ONLY (shared between containers)                  |
|   +  CONTAINER layer: READ-WRITE (one per running container)         |
|   +  optional VOLUME / BIND at a path -> data on host you control    |
+----------------------------------------------------------------------+
```

---

## Layered architecture: diffs, size, and cache reuse

A Docker **image** is not one big file. It is a **stack of layers**. Each layer is the **result of one Dockerfile instruction** (or one build step). Think of it as **changes on top of the parent**: step 2 builds on step 1, and so on.

- **Each layer adds what changed** compared to the layer below (new files, changed files, packages installed by `RUN`, and so on). Docker stores that step’s **filesystem state** for that layer.
- **Size:** the image’s total size is related to **all layers together**. Use **`docker history <image>`** to see **each layer** and its size; **`docker images`** shows the **total** size. Bigger layers (big `COPY`, fat `RUN`) push the total up.
- **On disk:** shared layers are **stored once** under the Engine storage area (for example **`overlay2/`** under [`/var/lib/docker`](#host-layout-varlibdocker-linux-engine)). When two images reuse the same layer, they **point at** the same stored data — you do **not** pay twice for identical layers.
- **Read-only:** once built, image layers are **read-only**; a **running container** adds a thin writable layer on top (see [Image layers vs the container writable layer](#image-layers-vs-the-container-writable-layer) above).

### Design: one image as a stack

```
+----------------------------------------------------------------------+
| TOP   Layer 4: CMD ["node","index.js"]     (small; metadata)         |
+----------------------------------------------------------------------+
|       Layer 3: COPY . .                    (app files; changes often)|
+----------------------------------------------------------------------+
|       Layer 2: RUN npm ci                  (node_modules; heavy)     |
+----------------------------------------------------------------------+
|       Layer 1: FROM node:18-alpine + WORKDIR  (base; shared by many) |
+----------------------------------------------------------------------+
| BOTTOM  parent chain from registry / cache                           |
+----------------------------------------------------------------------+
```

### Two builds, same Dockerfile prefix: cache reuse

When you **build a second image** whose Dockerfile **matches** an earlier build **from the top down**, Docker **reuses** cached layers until the **first instruction that no longer matches** (different text, different files copied, different build context for that step, and so on). From that line **to the end of the Dockerfile**, Docker **runs again** and builds **new** layers. Everything **above** that line stays **cached**.

**Rule:** If line 3 is the first mismatch, lines 1–2 stay cached; line 3 and **every line after** are rebuilt.

**Example — two images that share the same base steps**

You have two Dockerfiles in the same folder. The **first two instructions** (`FROM`, `RUN`) are **identical**; `COPY` uses a **different file**, and **`CMD`** may look the same in text but still becomes a **new** layer after a new `COPY` parent.

**`Dockerfile.api`**

```dockerfile
FROM alpine:3.19
RUN apk add --no-cache curl
COPY api.sh /app/run.sh
CMD ["/bin/sh", "/app/run.sh"]
```

**`Dockerfile.worker`**

```dockerfile
FROM alpine:3.19
RUN apk add --no-cache curl
COPY worker.sh /app/run.sh
CMD ["/bin/sh", "/app/run.sh"]
```

Assume **`api.sh`** and **`worker.sh`** exist in the build context.

**Build 1 — API image (nothing cached yet):**

```bash
docker build -f Dockerfile.api -t myapi:1 .
```

Docker creates **four new layers** (FROM, RUN, COPY, CMD).

**Build 2 — Worker image (shared prefix is cached):**

```bash
docker build -f Dockerfile.worker -t myworker:1 .
```

- **`FROM`** and **`RUN`** are **unchanged** and the build context for those steps matches — Docker **reuses** the **same cached layers** from build 1.
- **`COPY`** copies a **different file** (`worker.sh` vs `api.sh`) — cache **miss** here. Docker builds a **new** layer for this `COPY` and a **new** layer for **`CMD`** (because it comes after the changed step in the chain).

So you **pay full cost** only for the **new** layers; the **shared** base layers are **stored once** on disk and **reused** by both images.

### Design: shared base, different top (two images)

```
+----------------------------------------------------------------------+
|  myworker:1 (build 2)              myapi:1 (build 1)                 |
+----------------------------------------------------------------------+
|  +------------------------+        +------------------------+        |
|  | CMD (worker image)     |        | CMD (api image)        |  new   |
|  +------------------------+        +------------------------+  each  |
|  | COPY worker.sh         |        | COPY api.sh            |  build |
|  +------------------------+        +------------------------+        |
|  | RUN apk add curl       |--------| RUN apk add curl       | CACHED |
|  +------------------------+        +------------------------+        |
|  | FROM alpine:3.19       |--------| FROM alpine:3.19       | CACHED |
|  +------------------------+        +------------------------+        |
+----------------------------------------------------------------------+
```

**Takeaway:** keep **slow** steps (`RUN npm ci`, `apt install`, …) **above** steps that change often (`COPY` app code). That way **more layers stay cached** across builds and across **different** images that share the same base. Dockerfile examples and ordering are also in [7_images.md — How to create my own image?](7_images.md#how-to-create-my-own-image).

---

## Docker volumes: store files that survive container removal

A **Docker volume** is **storage on the host** that Docker **creates and manages**. You give it a **name** (for example `mydata` or `pgdata`). You **attach** it to a **path inside the container** when you run the container. Anything written **under that path** is stored **in the volume**, **not** in the container’s thin writable layer.

**Why use it**

- If you only write inside the container filesystem **without** a volume or bind mount, those files **disappear** when the container is **removed** (`docker rm`).
- If you write to a **mounted volume path**, the bytes live in the volume’s storage. **Destroying the container does not delete the volume** (unless you remove the volume on purpose with `docker volume rm` or `docker compose down -v`).

**Flow in plain words**

1. Create a volume (optional — Docker can create it on first use): `docker volume create mydata`.
2. Run a container with **`--mount type=volume,source=mydata,target=/data`** (named volume + path **inside** the container).
3. The app saves files under **`/data`** — they are stored in **`mydata`** on the host (under Engine’s area — see [`volumes/` under `/var/lib/docker`](#host-layout-varlibdocker-linux-engine)).
4. **`docker stop`** / **`docker rm`** the container — **files in the volume stay**.
5. Start a **new** container with the **same** **`--mount`** — you see the **same** files again.

```
+----------------------------------------------------------------------+
|  Container A (removed)       VOLUME "mydata" on host (kept)          |
|  writes -> /data ----------------------> stored here                 |
|                                                                      |
|  Container B (new)   same --mount volume mydata -> /data again       |
+----------------------------------------------------------------------+
```

**Named volume vs bind mount:** the full comparison with **examples** is in [Two types of mounting: volume vs bind](#two-types-of-mounting-volume-vs-bind) below.

---

## Two types of mounting: volume vs bind

Mounting means: **attach** storage from the **host** to a **directory path inside the container** so reads/writes at that path use that storage. The two main ways are **volume mounting** (Docker-managed storage) and **bind mounting** (a folder **you** choose).

| | **Volume mounting** (named volume) | **Bind mounting** |
| --- | --- | --- |
| **`--mount` (preferred)** | `type=volume,source=NAME,target=/path/in/container` | `type=bind,source=/host/path,target=/path/in/container` |
| **Shorthand `-v`** | `-v NAME:/path/in/container` | `-v /host/path:/path/in/container` |
| **Who owns the host folder** | **Docker** creates it under **`/var/lib/docker/volumes/...`** (see [Host layout](#host-layout-varlibdocker-linux-engine)) | **You** — any folder on your machine |
| **Good for** | Databases, uploads, **“I don’t care where on disk”** | **Dev** (edit code on the host), **exact path** you need |
| **Survives `docker rm`?** | **Yes** (volume stays until you remove it) | **Yes** (files always stayed on your host) |

### 1. Volume mounting (named volume)

You give a **name**; Docker creates and tracks the real directory. **Preferred pattern:** **`--mount type=volume,source=VOLUME_NAME,target=/path/in/container`**

**Example — create a volume, run a container, write a file**

```bash
docker volume create app-data
docker run --rm --mount type=volume,source=app-data,target=/data alpine sh -c "echo hello > /data/file.txt"
docker run --rm --mount type=volume,source=app-data,target=/data alpine cat /data/file.txt
```

Expected output from the last line:

```text
hello
```

The file lives in the **`app-data`** volume. **`docker rm`** the container — **`app-data`** is still there. Use **`docker volume inspect app-data`** to see **Mountpoint** on the host.

**Shorthand (same mounts):** `-v app-data:/data` — still common in tutorials; **`--mount`** is clearer and easier to extend (read-only, labels, etc.).

### 2. Bind mounting

You give a **host path** (your project folder, a data dir, etc.) and where it should appear in the container. **Preferred pattern:** **`--mount type=bind,source=/path/on/host,target=/path/in/container`** (use an **absolute** `source` when you can; relative paths are resolved from the build/run context).

**Example — project folder on your machine into the container**

**Linux / macOS (Git Bash):**

```bash
mkdir -p ./demo-data
echo "from host" > ./demo-data/note.txt
docker run --rm --mount type=bind,source="$(pwd)/demo-data",target=/data alpine cat /data/note.txt
```

Expected output:

```text
from host
```

Edits on the host in **`demo-data`** show up in **`/data`** in the container, and the other way around.

**Read-only bind** (container can read but not write) — add **`,readonly`** to the **`--mount`**:

```bash
docker run --rm --mount type=bind,source="$(pwd)/demo-data",target=/data,readonly alpine ls /data
```

**Shorthand:** `-v "$(pwd)/demo-data:/data:ro"`

On **Windows**, use a path Docker can see (often the project under WSL2 or a shared drive); **`source=`** must be a path the Engine can read.

---

## Bind mounts, named volumes, and tmpfs

**Bind mount** — same idea as [bind mounting](#two-types-of-mounting-volume-vs-bind) above: **you** pick the host path.

**Named volume** — same idea as [volume mounting](#two-types-of-mounting-volume-vs-bind) above: **you** pick the **name**; Docker picks the host path.

**Anonymous volume**

- A volume with a **random name** Docker creates when you use a **`VOLUME`** in a Dockerfile or a mount with only a destination (anonymous volume). Same persistence idea as a named volume, but **harder to reuse** by name — prefer **named** volumes for anything important.

**tmpfs mount**

- Storage in **RAM**, not on the host disk. **Gone** when the container stops. Use for **sensitive** or **temporary** scratch data when you want **no** disk footprint (and accept size limits).

---

## Compare at a glance

| Kind | You set | Host path | Survives `docker rm`? | Typical use |
| --- | --- | --- | --- | --- |
| **Container writable layer** | nothing extra | Docker-managed, tied to that container | **No** (unless you **commit** to a new image) | Short-lived caches inside the box |
| **Bind mount** | host path + container path | **Your** path | **Yes** (files stay on host) | Dev, config files, “this exact folder” |
| **Named volume** | volume name + container path | Docker chooses under the hood | **Yes** | DB data, durable app storage |
| **tmpfs** | mountpoint + size options | RAM only | **No** | Secrets in RAM, temp files |

---

## Common commands

**Volumes (Docker-managed names)**

```bash
docker volume ls
docker volume create mydata
docker volume inspect mydata
docker volume rm mydata
docker volume prune
```

| Command | Meaning |
| --- | --- |
| `docker volume ls` | List named/anonymous volumes Docker knows about. |
| `docker volume create NAME` | Create an empty named volume. |
| `docker volume inspect NAME` | Show JSON including **Mountpoint** on the host. |
| `docker volume rm NAME` | Remove a volume (**fails** if a container still uses it). |
| `docker volume prune` | Remove **all** unused volumes (careful). |

**Inspect a running container’s mounts**

```bash
docker inspect CONTAINER_NAME
```

Look for **`Mounts`** in the JSON — **Source** is the host side, **Destination** is inside the container.

---

## Examples with `docker run`

Step-by-step **volume** vs **bind** examples are in [Two types of mounting: volume vs bind](#two-types-of-mounting-volume-vs-bind). Below are short **`--mount`** snippets (preferred). **`-v`** is still valid shorthand: `-v SRC:DST` or `-v NAME:/path` for volumes.

**Bind mount** — host folder `./data` appears as `/data` in the container:

```bash
docker run --rm --mount type=bind,source="$(pwd)/data",target=/data alpine ls /data
```

**Named volume** — create once, mount by name:

```bash
docker volume create webuploads
docker run --rm --mount type=volume,source=webuploads,target=/var/www/uploads my-image
```

**Read-only bind mount** (container can read but not write):

```bash
docker run --rm --mount type=bind,source="$(pwd)/config",target=/app/config,readonly my-image
```

**Nginx static site (bind + readonly):**

```bash
docker run --rm --mount type=bind,source="$(pwd)/html",target=/usr/share/nginx/html,readonly nginx:alpine
```

**tmpfs** (RAM only; optional size — syntax may vary by Engine version):

```bash
docker run --rm --mount type=tmpfs,target=/tmp alpine
```

**Legacy `-v` equivalents:** `docker run -v "$(pwd)/data:/data" ...`, `docker run -v webuploads:/var/www/uploads ...`, `docker run -v "$(pwd)/config:/app/config:ro" ...`, `docker run --tmpfs /tmp ...`.

---

## Persistence: what survives `docker rm`

| Situation | Data in writable layer only | Data in bind mount or named volume |
| --- | --- | --- |
| **`docker stop` then `docker rm`** | **Lost** | **Kept** on the host |
| **New container** with same volume/bind | N/A | **Same files** if you mount the same volume or path |

**Rule of thumb:** put anything you **cannot rebuild** from an image (DB files, user uploads) in a **volume** or **bind mount**.

---

## Docker Compose

Compose declares mounts in YAML. You will see **`volumes:`** under services and sometimes a top-level **`volumes:`** block for **named** volumes. Step-by-step patterns (bind vs named, two `volumes` blocks) are in [8_compose.md — Volumes in Compose](8_compose.md#volumes-in-compose). The voting app example uses Postgres with a named volume in [9_voting_app.md](9_voting_app.md) and [VOTING_README.md](VOTING_README.md).

---

## See also

- [7_images.md](7_images.md) — Dockerfiles and building images (ordering for cache)
- [8_compose.md — Volumes in Compose](8_compose.md#volumes-in-compose)
- [11_engine.md — MNT namespace](11_engine.md#container-isolation-linux-namespaces)
- [11_engine.md — Resource limits (cgroups)](11_engine.md#resource-limits-cgroups-cpu-and-memory) — CPU and memory caps
- [10_registry.md](10_registry.md) — where images are stored and pulled from
