# Docker commands

Hands-on CLI reference for Docker Engine. For **concepts** (containers vs VMs, terminology), see [1_intro.md](1_intro.md) and [5_terminology.md](5_terminology.md). For **how the CLI talks to the daemon**, see [11_engine.md](11_engine.md).

## Table of Contents

- [Learn more in this repo](#learn-more-in-this-repo)
- [How commands reach Docker Engine](#how-commands-reach-docker-engine)
- [CLI layout: common, management, and global options](#cli-layout-common-management-and-global-options)
- [Command index (by category)](#command-index-by-category)
- [Image Commands](#image-commands)
- [Container Lifecycle](#container-lifecycle)
- [Running Containers](#running-containers)
- [Container Inspection](#container-inspection)
- [Logs and Debugging](#logs-and-debugging)
- [Networking](#networking)
- [Volumes and Storage](#volumes-and-storage)
- [Docker Compose](#docker-compose)
- [Cleanup Commands](#cleanup-commands)
- [Building Images](#building-images)
- [Swarm and other advanced commands](#swarm-and-other-advanced-commands)
- [Quick Reference](#quick-reference)
- [Important Notes](#important-notes)

---

## Learn more in this repo

| Topic | File |
|--------|------|
| What Docker is, architecture overview | [1_intro.md](1_intro.md) |
| Installing Docker | [2_installation.md](2_installation.md) |
| Demos (pull, run, nginx, env vars) | [4_demo.md](4_demo.md) |
| Terms and flags glossary | [5_terminology.md](5_terminology.md) |
| `docker run` in depth (ports, volumes, logs) | [6_run.md](6_run.md) |
| Images, Dockerfile, `CMD` vs `ENTRYPOINT`, `docker history` | [7_images.md](7_images.md) |
| Docker Compose files and workflows | [8_compose.md](8_compose.md) |
| Multi-service voting app (Compose + volumes) | [9_voting_app.md](9_voting_app.md), [VOTING_README.md](VOTING_README.md) |
| Registries, `login` / `push` / `pull` / tagging | [10_registry.md](10_registry.md) |
| Engine, API, daemon, remote hosts | [11_engine.md](11_engine.md) |
| Layers, volumes, bind mounts, `--mount` vs `-v` | [12_storage.md](12_storage.md) |
| Default networks (`bridge`, `host`, `none`), DNS on user-defined networks | [13_networking.md](13_networking.md) |

---

## How commands reach Docker Engine

Every `docker …` command uses the **CLI** to call the Engine **REST API** on the **daemon** (unless you use context / remote `-H`). The daemon performs the work.

```
  You type                                Docker Engine
  docker run / ps / ...  -->  Docker CLI  --> Engine API -->  daemon
```

Details: [11_engine.md](11_engine.md).

---

## CLI layout: common, management, and global options

Run `docker --help` for the list your install exposes. **Common** commands include `run`, `exec`, `ps`, `build`, `pull`, `push`, `images`, `login`, `logout`, `search`, `version`, `info`.

**Management** commands group related APIs: `docker container …`, `docker image …`, `docker network …`, `docker volume …`, `docker system …`, `docker builder …`, `docker buildx …`, `docker compose …`, `docker context …`, `docker plugin …`, and others. They are **not** different features — often the same as the short form (e.g. `docker ps` and `docker container ls` are equivalent).

**Global options** (see `docker --help`): `-c, --context` (which daemon/context), `-H, --host` (override socket URL), `-D, --debug`, TLS flags for encrypted remote access. Contexts: [11_engine.md](11_engine.md) (remote Engine).

---

## Command index (by category)

Short descriptions and examples. For patterns and pitfalls, follow the links to sections below or to other files.

### Common commands (`docker --help` → Common)

| Command | What it does | Example | Learn more |
|---------|----------------|---------|------------|
| `run` | Create and start a container from an image | `docker run -d -p 8080:80 --name web nginx` | [Running Containers](#running-containers), [6_run.md](6_run.md) |
| `exec` | Run a process inside a **running** container | `docker exec -it web sh` | [Logs and Debugging](#logs-and-debugging) |
| `ps` | List containers (`docker container ls`) | `docker ps -a` | [Container Inspection](#container-inspection) |
| `build` | Build an image from a Dockerfile (BuildKit) | `docker build -t myapp:1 .` | [Building Images](#building-images), [7_images.md](7_images.md) |
| `bake` | Build from a bake file (often via Buildx) | `docker buildx bake` | [Building Images](#building-images) |
| `pull` | Download an image from a registry | `docker pull nginx:1.25` | [Image Commands](#image-commands), [10_registry.md](10_registry.md) |
| `push` | Upload an image to a registry | `docker push user/myapp:1.0` | [Image Commands](#image-commands), [10_registry.md](10_registry.md) |
| `images` | List local images (`docker image ls`) | `docker images` | [Image Commands](#image-commands) |
| `login` / `logout` | Authenticate to a registry | `docker login`, `docker logout` | [10_registry.md](10_registry.md) |
| `search` | Search Docker Hub (limited; many teams use hub UI or CLI elsewhere) | `docker search nginx` | [10_registry.md](10_registry.md) |
| `version` | Client and server versions | `docker version` | [2_installation.md](2_installation.md) |
| `info` | Daemon storage, CPUs, plugins, etc. (`docker system info`) | `docker info` | [11_engine.md](11_engine.md) |

### Images (`docker image …` or short forms)

| Command | What it does | Example | Learn more |
|---------|----------------|---------|------------|
| `images` / `image ls` | List images | `docker image ls` | [Image Commands](#image-commands) |
| `pull` | Pull from registry | `docker image pull redis:7` | [10_registry.md](10_registry.md) |
| `push` | Push to registry | `docker image push my/repo:v2` | [10_registry.md](10_registry.md) |
| `rmi` / `image rm` | Remove images | `docker rmi myapp:old` | [Image Commands](#image-commands) |
| `tag` / `image tag` | Add another name:tag for the same image ID | `docker tag myapp:latest myapp:2024-01-01` | [10_registry.md](10_registry.md) |
| `inspect` | JSON metadata for an image | `docker image inspect nginx` | [7_images.md](7_images.md) |
| `history` | Layers / Dockerfile steps (newest first) | `docker history myapp:1` | [7_images.md](7_images.md#docker-history-build-steps-and-layers), [12_storage.md](12_storage.md) |
| `save` / `load` | Tarball image to/from disk (air-gapped / backup) | `docker save -o nginx.tar nginx:latest` then `docker load -i nginx.tar` | below |
| `import` | Create image from a tarball **filesystem** (not always same as load) | `docker import myfs.tar myimg:imported` | [7_images.md](7_images.md) |
| `prune` | Remove unused images | `docker image prune -a` | [Cleanup Commands](#cleanup-commands) |

### Containers (short forms and `docker container …`)

| Command | What it does | Example | Learn more |
|---------|----------------|---------|------------|
| `create` | Create container without starting | `docker create --name c nginx` | [Container Lifecycle](#container-lifecycle) |
| `start` / `stop` / `restart` | Lifecycle | `docker stop c` | [Container Lifecycle](#container-lifecycle) |
| `kill` | SIGKILL | `docker kill c` | [Container Lifecycle](#container-lifecycle) |
| `pause` / `unpause` | Freeze / resume cgroup processes | `docker pause c` | [Container Lifecycle](#container-lifecycle) |
| `rm` / `container rm` | Remove stopped (or `-f`) | `docker rm -f c` | [Container Lifecycle](#container-lifecycle) |
| `rename` | Rename a container | `docker rename old new` | — |
| `cp` | Copy host ↔ container | `docker cp c:/etc/hosts .` | [Logs and Debugging](#logs-and-debugging) |
| `commit` | New image from container writable layer | `docker commit c mysnapshot:v1` | [7_images.md](7_images.md) |
| `export` | Tar of container filesystem (no history) | `docker export -o rootfs.tar c` | — |
| `diff` | Changed files vs image | `docker diff c` | — |
| `inspect` | JSON for container/network/volume/etc. | `docker inspect -f '{{.State.Status}}' c` | [Container Inspection](#container-inspection) |
| `logs` | Container stdout/stderr | `docker logs -f --tail 100 c` | [Logs and Debugging](#logs-and-debugging) |
| `attach` | Attach to main process stdio | `docker attach c` | [Logs and Debugging](#logs-and-debugging) |
| `wait` | Block until exit; print exit code | `docker wait c` | — |
| `stats` | Live CPU/memory/network | `docker stats` | [Container Inspection](#container-inspection) |
| `top` | Processes inside container | `docker top c` | [Container Inspection](#container-inspection) |
| `port` | Published ports | `docker port c` | [Container Inspection](#container-inspection) |
| `update` | Change limits on running container | `docker update --cpus=1.5 c` | [Running Containers](#running-containers) |
| `events` | Stream daemon events | `docker events` | [11_engine.md](11_engine.md) |

### Networks and volumes

| Command | What it does | Example | Learn more |
|---------|----------------|---------|------------|
| `network ls/create/rm/inspect/connect/disconnect/prune` | User-defined bridges, overlays, etc. | `docker network create app-net` | [Networking](#networking) |
| `volume create/ls/inspect/rm/prune/update` | Named volumes | `docker volume create data` | [Volumes and Storage](#volumes-and-storage), [12_storage.md](12_storage.md) |

### System and disk

| Command | What it does | Example | Learn more |
|---------|----------------|---------|------------|
| `system df` | Disk used by images/containers/volumes/build cache | `docker system df -v` | [Cleanup Commands](#cleanup-commands) |
| `system prune` | Remove unused data (careful with `-a` / `--volumes`) | `docker system prune` | [Cleanup Commands](#cleanup-commands) |
| `system events` | Same as `docker events` | `docker system events` | — |

### Build

| Command | What it does | Example | Learn more |
|---------|----------------|---------|------------|
| `build` | Dockerfile build | `docker build -t app .` | [Building Images](#building-images), [7_images.md](7_images.md) |
| `builder prune` | Drop build cache | `docker builder prune -a` | [Cleanup Commands](#cleanup-commands) |
| `buildx` | Builders, multi-platform, bake | `docker buildx build --platform linux/arm64 -t x .` | [Building Images](#building-images) |

### Compose

| Command | What it does | Example | Learn more |
|---------|----------------|---------|------------|
| `compose up/down/logs/ps/exec/build/...` | Multi-service from YAML | `docker compose up -d` | [Docker Compose](#docker-compose), [8_compose.md](8_compose.md) |

### Context and plugins

| Command | What it does | Example | Learn more |
|---------|----------------|---------|------------|
| `context ls/use/create/rm/...` | Switch CLI between daemons (local, SSH, etc.) | `docker context use remote` | [11_engine.md](11_engine.md) |
| `plugin ls/install/enable/rm` | Engine plugins | `docker plugin ls` | [11_engine.md](11_engine.md) |

### Manifest (multi-arch / registry inspection)

| Command | What it does | Example | Learn more |
|---------|----------------|---------|------------|
| `manifest inspect/create/push` | Inspect or publish manifest lists | `docker manifest inspect nginx:latest` | [10_registry.md](10_registry.md) |

---

## Image Commands

```bash
# Pull an image from Docker Hub
docker pull <image>
docker pull nginx              # pulls latest
docker pull nginx:1.25         # pulls specific version

# List all local images
docker images
docker images -a               # include intermediate images

# Remove an image
docker rmi <image>
docker rmi nginx               # remove by name
docker rmi abc123              # remove by ID
docker rmi -f <image>          # force remove (even if tagged multiple times)

# Search for images on Docker Hub
docker search nginx

# Tag an image
docker tag <source> <target>
docker tag myapp:latest myapp:v1.0

# Push image to registry
docker push <image>
docker push myusername/myapp:v1.0

# Show how the image was built: one row per layer (Dockerfile steps), sizes — newest at top
docker history <image>
docker history my-app:1.0

# Inspect image details
docker inspect <image>
```

**Note:** You cannot remove an image if ANY container (running OR stopped) is using it. You must remove ALL containers using that image first.

```bash
# This will fail if any container exists using nginx
docker rmi nginx
# Error: conflict: unable to remove repository reference "nginx" 
# (must force) - container abc123 is using its referenced image

# Step 1: Find ALL containers using the image
docker ps -a --filter ancestor=nginx

# Step 2: Remove ALL those containers
docker rm <container1> <container2> ...    # remove stopped containers
docker rm -f <container>                   # force remove if running

# Or remove all containers using the image in one command
docker rm -f $(docker ps -aq --filter ancestor=nginx)

# Step 3: Now you can remove the image
docker rmi nginx
```

**Save / load (offline or backup):** `docker save -o images.tar img:tag` writes image layers to a tar file; `docker load -i images.tar` loads them back. **Import:** `docker import` creates an image from a tarball of a root filesystem (different workflow than `load`). Registry workflows: [10_registry.md](10_registry.md).

---

## Container Lifecycle

```bash
# Create a container (without starting)
docker create <image>

# Start a stopped container
docker start <container>

# Stop a running container (graceful, SIGTERM)
docker stop <container>

# Kill a container (force, SIGKILL)
docker kill <container>

# Restart a container
docker restart <container>

# Pause a container
docker pause <container>

# Unpause a container
docker unpause <container>

# Remove a stopped container
docker rm <container>

# Remove a running container (force)
docker rm -f <container>

# Remove container when it exits
docker run --rm <image>
```

**Exit codes:**
- `0` — Container exited normally (success)
- `1` — Application error
- `137` — Container killed (SIGKILL, e.g., `docker stop` or `docker kill`)
- `143` — Container terminated (SIGTERM)

---

## Running Containers

### Basic Run

```bash
# Run a container
docker run <image>
docker run nginx

# Run in detached mode (background)
docker run -d <image>
docker run -d nginx

# Run with a custom name
docker run --name my-nginx nginx

# Run interactively with terminal
docker run -it <image> <command>
docker run -it ubuntu bash           # interactive shell
docker run -it python:3.11 python    # interactive Python
```

**Flags explained:**
- `-d` — Detached mode (runs in background)
- `-it` — Interactive mode with TTY (for shell access)
- `--name` — Assign a custom name to the container
- `--rm` — Automatically remove container when it exits

### Port Mapping

```bash
# Map host port to container port
docker run -p <host_port>:<container_port> <image>
docker run -p 8080:80 nginx        # access nginx at localhost:8080
docker run -p 3000:3000 node-app   # same port mapping

# Map multiple ports
docker run -p 80:80 -p 443:443 nginx

# Map to random host port
docker run -P nginx                # Docker assigns random ports

# Bind to specific interface
docker run -p 127.0.0.1:8080:80 nginx
```

### Environment Variables

```bash
# Set environment variable
docker run -e <VAR>=<value> <image>
docker run -e NODE_ENV=production node-app
docker run -e DB_HOST=localhost -e DB_PORT=5432 myapp

# Load from .env file
docker run --env-file .env myapp
```

### Resource Limits

```bash
# Limit memory
docker run -m 512m nginx           # max 512MB RAM
docker run --memory=1g nginx       # max 1GB RAM

# Limit CPU
docker run --cpus=0.5 nginx        # use max 50% of one CPU
docker run --cpus=2 nginx          # use max 2 CPUs
```

---

## Container Inspection

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Show only container IDs
docker ps -q

# Show latest created container
docker ps -l

# Get detailed container info (JSON)
docker inspect <container>

# Get specific field from inspect
docker inspect --format='{{.State.Status}}' <container>
docker inspect --format='{{.NetworkSettings.IPAddress}}' <container>

# Show container resource usage (live)
docker stats
docker stats <container>

# Show running processes in container
docker top <container>

# Show port mappings
docker port <container>
```

**Tip:** You can use just the first few characters of a container ID if it's unique (e.g., `docker stop be65` instead of `docker stop be65f488b776`).

---

## Logs and Debugging

```bash
# View container logs
docker logs <container>

# Follow logs (live stream)
docker logs -f <container>

# Show last N lines
docker logs --tail 100 <container>

# Show timestamps
docker logs -t <container>

# Combine options
docker logs -f --tail 50 -t <container>

# Execute command in running container
docker exec <container> <command>
docker exec my-nginx cat /etc/nginx/nginx.conf

# Get interactive shell in running container
docker exec -it <container> bash
docker exec -it <container> sh      # if bash not available

# Attach to running container (see live output)
docker attach <container>
# Detach with Ctrl+P, Ctrl+Q (keeps container running)
# Ctrl+C will stop the container!

# Copy files between host and container
docker cp <container>:/path/file ./local/path    # from container
docker cp ./local/file <container>:/path/        # to container
```

---

## Networking

On a fresh Docker install, the daemon creates **three built-in networks**: **`bridge`** (default for new containers), **`host`**, and **`none`**. What each means and when to use them: [13_networking.md](13_networking.md).

```bash
# List networks
docker network ls

# Create a network
docker network create <name>
docker network create my-network

# Run container on specific network
docker run --network my-network nginx

# Connect container to network
docker network connect <network> <container>

# Disconnect container from network
docker network disconnect <network> <container>

# Inspect network
docker network inspect <network>

# Remove network
docker network rm <network>
```

**Network types:**
- `bridge` — Default, containers on same bridge can communicate
- `host` — Container uses host's network directly
- `none` — No networking
- `overlay` — Multi-host networking (Swarm mode)

---

## Volumes and Storage

For **`docker run`**, **`--mount`** is the **clear** way to attach storage (volume or bind). **`-v`** / **`--volume`** is an **older short form** you still see in many examples — same job, less explicit. Full explanation and examples: [12_storage.md](12_storage.md).

```bash
# Create a volume
docker volume create <name>

# List volumes
docker volume ls

# Inspect volume
docker volume inspect <name>

# Remove volume
docker volume rm <name>

# Mount a named volume (preferred)
docker run --mount type=volume,source=my-data,target=/app/data nginx
# Short form (same idea)
docker run -v my-data:/app/data nginx

# Bind mount — host directory (preferred)
docker run --mount type=bind,source=/host/path,target=/container/path <image>
docker run --mount type=bind,source=$(pwd),target=/app <image>           # current directory
docker run --mount type=bind,source=./src,target=/app/src <image>      # relative path
# Short form
docker run -v /host/path:/container/path <image>
docker run -v $(pwd):/app <image>
docker run -v ./src:/app/src <image>

# Read-only bind
docker run --mount type=bind,source=/host/path,target=/container/path,readonly <image>
docker run -v /host/path:/container/path:ro <image>

# Named volume with specific driver
docker volume create --driver local my-volume
```

**Volume vs Bind Mount:**
- **Volume** — Managed by Docker, stored in Docker's directory, best for production
- **Bind mount** — Maps host directory directly, best for development

---

## Docker Compose

```bash
# Start services (from docker-compose.yml)
docker compose up
docker compose up -d              # detached mode

# Stop services
docker compose down

# Stop and remove volumes
docker compose down -v

# View logs
docker compose logs
docker compose logs -f            # follow
docker compose logs <service>     # specific service

# List running services
docker compose ps

# Execute command in service
docker compose exec <service> <command>
docker compose exec web bash

# Build images
docker compose build

# Pull images
docker compose pull

# Restart services
docker compose restart

# Scale a service
docker compose up -d --scale web=3
```

Concepts, file format, and more subcommands (`config`, `down`, `build`, …): [8_compose.md](8_compose.md). Sample app: [9_voting_app.md](9_voting_app.md).

---

## Cleanup Commands

```bash
# Remove all stopped containers
docker container prune

# Remove all unused images
docker image prune
docker image prune -a             # including unused tagged images

# Remove all unused volumes
docker volume prune

# Remove all unused networks
docker network prune

# Remove build cache (can be HUGE - often 10GB+)
docker builder prune              # remove dangling build cache
docker builder prune -a           # remove ALL build cache
docker builder prune -a --filter "until=24h"  # older than 24 hours

# Remove everything unused (containers, images, networks, volumes)
docker system prune
docker system prune -a            # including unused images
docker system prune --volumes     # including volumes

# Show disk usage
docker system df
docker system df -v               # verbose
```

**Tip:** Build cache grows quickly with frequent builds. Check `docker system df` regularly and run `docker builder prune -a` to reclaim space.

---

## Building Images

```bash
# Build image from Dockerfile
docker build -t <name>:<tag> <path>
docker build -t myapp:1.0 .              # current directory
docker build -t myapp:latest ./app       # specific directory

# Build with specific Dockerfile
docker build -f Dockerfile.dev -t myapp:dev .

# Build without cache
docker build --no-cache -t myapp:1.0 .

# Build with build arguments
docker build --build-arg NODE_ENV=production -t myapp:1.0 .

# Multi-platform build (requires buildx)
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:1.0 .
```

Dockerfile details and layer caching: [7_images.md](7_images.md). Storage and layers: [12_storage.md](12_storage.md).

---

## Swarm and other advanced commands

**Swarm mode** (cluster orchestration): `docker swarm init|join|leave`, `docker service`, `docker stack deploy`, `docker node`, `docker config`, `docker secret`. These are used when you run a multi-host cluster; most local development uses Compose instead. Official reference: [Docker Swarm](https://docs.docker.com/engine/swarm/).

**Checkpoint / live migration** (where supported): `docker checkpoint create|ls|rm` — niche; see Engine docs.

**Docker Desktop** may add extra CLI groups (`desktop`, `scout`, extensions, etc.); run `docker --help` on your machine to see them.

---

## Quick Reference

| Task | Command |
|------|---------|
| Run container | `docker run <image>` |
| Run in background | `docker run -d <image>` |
| Run with port mapping | `docker run -p 8080:80 <image>` |
| Run interactively | `docker run -it <image> bash` |
| List running | `docker ps` |
| List all | `docker ps -a` |
| Stop container | `docker stop <container>` |
| Remove container | `docker rm <container>` |
| View logs | `docker logs <container>` |
| Shell into container | `docker exec -it <container> bash` |
| List images | `docker images` |
| Pull image | `docker pull <image>` |
| Remove image | `docker rmi <image>` |
| Build image | `docker build -t <name> .` |
| Clean up | `docker system prune -a` |

---

## Important Notes

1. **Container naming:** Use `--name` for easier reference instead of auto-generated names
2. **Short IDs:** Use first few unique characters of container/image IDs
3. **Ubuntu exits immediately:** `docker run ubuntu` exits because its default command (`/bin/bash`) has no TTY. Use `docker run -it ubuntu bash` for interactive shell
4. **Containers are ephemeral:** Data is lost when container is removed unless using volumes
5. **One process per container:** Containers are designed to run a single process
6. **Can't delete image with containers:** Must remove ALL containers (running + stopped) using an image before you can delete it. Use `docker ps -a --filter ancestor=<image>` to find them, then `docker rm -f $(docker ps -aq --filter ancestor=<image>)` to remove all at once.
