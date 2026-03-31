# Docker storage

Containers are **easy to throw away** — but **data** (databases, uploads, config you change at run time) must live somewhere **stable**. This page explains **where files go** on your computer, how the **image** stays read-only, and how to **connect folders** into a container so important data **does not disappear** when the container is removed.

## Table of Contents

- [Why storage matters](#why-storage-matters)
- [Host layout: `/var/lib/docker` (Linux Engine)](#host-layout-varlibdocker-linux-engine)
- [Image layers vs the container writable layer](#image-layers-vs-the-container-writable-layer)
- [Layered architecture: diffs, size, and cache reuse](#layered-architecture-diffs-size-and-cache-reuse)
- [Docker volumes: store files that survive container removal](#docker-volumes-store-files-that-survive-container-removal)
- [Two ways to hook up storage: volume vs bind](#two-ways-to-hook-up-storage-volume-vs-bind)
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
- **Size:** the image’s total size is related to **all layers together**. Use **`docker history <image>`** to list **each layer** and its size (same steps as the **Dockerfile** build, newest layers first — see [7_images.md — docker history](7_images.md#docker-history-build-steps-and-layers)). **`docker images`** shows the **total** size. Bigger layers (big `COPY`, fat `RUN`) push the total up.
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

A **Docker volume** is a **named place to store files** on your computer. **Docker** creates that place and keeps track of it. You pick a **name** like `mydata`.

When you start a container, you **connect** that named place to **one folder inside the container** (for example `/data`). Anything the app saves **in that folder** is really saved **in the volume**. It is **not** stored only in the container’s thin layer (which goes away when the container is deleted).

**Why use it**

- If the app writes **only** to the normal container disk, those files are **lost** when you delete the container.
- If the app writes to a folder that is **connected to a volume**, the files **stay** after the container is gone. The volume stays until **you** delete it (`docker volume rm` or `docker compose down -v`).

**Simple flow**

1. **Create a name** (optional the first time — Docker can create it when you run): `docker volume create mydata`.
2. **Start the container** and **connect** the volume to a folder inside it. The command uses **`--mount`** — see [What the --mount parts mean](#what-the--mount-parts-mean) below.
3. The app writes to **`/data`** (or whatever folder you chose). The files land in **`mydata`** on the host (Docker stores them under its own area — see [`volumes/` under `/var/lib/docker`](#host-layout-varlibdocker-linux-engine)).
4. You **delete** the container. **The volume and its files are still there.**
5. You **start another container** with the **same** volume **connected the same way**. **You still see the same files.**

```
+----------------------------------------------------------------------+
|  Container 1 (deleted)     VOLUME "mydata" on computer (kept)        |
|  saves in /data  --------------------->  stored in mydata            |
|                                                                      |
|  Container 2 (new)      reuse mydata at /data (same files)           |
+----------------------------------------------------------------------+
```

**Volume vs bind:** see [Two ways to hook up storage: volume vs bind](#two-ways-to-hook-up-storage-volume-vs-bind) below.

---

## Two ways to hook up storage: volume vs bind

**“Hook up”** here means: **pick storage on the host** and **show it as a folder inside the container** so the app can read and write there.

There are **two common ways**:

1. **Volume (named volume)** — You give Docker a **short name**. Docker picks **where** on disk to put the files. You usually **do not** need to know the full path.
2. **Bind mount** — You pick a **folder on your computer** (for example your project folder). That **exact** folder appears inside the container. Good when you want to **edit files on your laptop** and see them in the container right away.

**After you delete the container**, files in **both** setups **stay on the host** (until you delete the volume or the folder).

### What the --mount parts mean

The **`--mount`** line is **one flag** with **pieces** separated by commas:

| Part | Simple meaning |
| --- | --- |
| **`type=volume`** or **`type=bind`** | **volume** = use a **named** Docker volume. **bind** = use a **folder path** you choose. |
| **`source=...`** | **Where the data comes from.** For a volume, this is the **name** (e.g. `app-data`). For a bind, this is the **folder on your computer** (e.g. `$(pwd)/demo-data`). |
| **`target=...`** | **Which folder inside the container** should show that storage (e.g. `/data`). |
| **`readonly`** (bind only, optional) | The container can **read** but **not change** the files. |

**Short form `-v`:** many guides use **`-v name:/data`** (volume) or **`-v /my/folder:/data`** (bind). It does the same job; **`--mount`** spells out each piece more clearly.

### 1. Volume (named volume)

**Idea:** create a **name**, then **connect** it to a folder inside the container.

**Example — write a file, read it back**

```bash
# 1) Create storage named app-data
docker volume create app-data

# 2) Run a container: connect app-data to folder /data inside the box
docker run --rm --mount type=volume,source=app-data,target=/data alpine sh -c "echo hello > /data/file.txt"

# 3) Run again with the same connection — the file is still there
docker run --rm --mount type=volume,source=app-data,target=/data alpine cat /data/file.txt
```

**What `--rm` means (not the same as deleting your data):** **`--rm`** is an option on **`docker run`**. It means **remove the container when it exits** — Docker throws away that **container** after the command finishes so you do not collect **stopped** containers. It does **not** mean “remove the volume.” The **`app-data`** volume and its files **stay** until you run **`docker volume rm`**.

You should see:

```text
hello
```

The file is **inside** the **`app-data`** volume. Delete the container — **`app-data`** remains. **`docker volume inspect app-data`** shows you **where** Docker stored it on disk.

**Same thing, shorter:** `-v app-data:/data`

### 2. Bind mount

**Idea:** **point** a folder on **your computer** at a folder **inside** the container.

**Example — file on your computer, read inside the container**

**Linux / macOS (Git Bash):**

```bash
mkdir -p ./demo-data
echo "from host" > ./demo-data/note.txt

# Connect folder demo-data (on your machine) to /data (inside the container)
docker run --rm --mount type=bind,source="$(pwd)/demo-data",target=/data alpine cat /data/note.txt
```

You should see:

```text
from host
```

Change a file **on your computer** in **`demo-data`** — the change shows up **inside** the container at **`/data`**, and the other way around.

**Read-only** (container can look but not change files) — add **`,readonly`**:

```bash
docker run --rm --mount type=bind,source="$(pwd)/demo-data",target=/data,readonly alpine ls /data
```

**Same thing, shorter:** `-v "$(pwd)/demo-data:/data:ro"`

On **Windows**, pick a folder Docker can reach (often your project in **WSL2** or a shared drive).

---

## Bind mounts, named volumes, and tmpfs

**Bind** and **named volume** are explained above in [Two ways to hook up storage](#two-ways-to-hook-up-storage-volume-vs-bind).

**Anonymous volume**

- Sometimes Docker makes a volume **without** a name you chose. Same idea as a named volume for saving files, but **harder to find again** — use a **named** volume when you care about the data.

**tmpfs**

- Data in **memory (RAM)**, not on the disk. **Gone** when the container stops. For **short-lived** or **very temporary** stuff only.

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

In the JSON, open **`Mounts`**: **`Source`** is on your computer, **`Destination`** is inside the container.

---

## Examples with `docker run`

The **full walkthrough** is in [Two ways to hook up storage](#two-ways-to-hook-up-storage-volume-vs-bind). Below are **small copy-paste** commands. **`-v`** is a **short** form of the same thing.

**`--rm` in these examples:** **`docker run --rm`** tells Docker to **delete only the container** after the command stops. Your **volumes** and **bind-mounted folders** are **not** removed. (This is different from typing **`docker rm`** as its own command — here **`rm`** is just a flag name on **`run`**.)

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

**tmpfs** (RAM only — data cleared when the container stops):

```bash
docker run --rm --mount type=tmpfs,target=/tmp alpine
```

**Older short style (`-v`):** same ideas as above, written as **`docker run -v ...`** in many guides.

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
- [13_networking.md](13_networking.md) — default `bridge` / `host` / `none` networks (separate from volumes, but often used together)
