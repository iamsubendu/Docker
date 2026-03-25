# Docker Commands

## Table of Contents

- [How commands reach Docker Engine](#how-commands-reach-docker-engine)
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

---

## How commands reach Docker Engine

Every `docker …` command uses the **CLI** to call the Engine **REST API** on the **daemon** (unless you use context / remote `-H`). The daemon performs the work.

```
  You type                                Docker Engine
  docker run / ps / ...  ──▶  Docker CLI  ── Engine API ──▶  daemon
```

Details: [11_engine.md](11_engine.md).

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

# Show image history (layers)
docker history <image>

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

```bash
# Create a volume
docker volume create <name>

# List volumes
docker volume ls

# Inspect volume
docker volume inspect <name>

# Remove volume
docker volume rm <name>

# Mount a volume
docker run -v <volume>:<container_path> <image>
docker run -v my-data:/app/data nginx

# Bind mount (host directory)
docker run -v /host/path:/container/path <image>
docker run -v $(pwd):/app node-app           # current directory
docker run -v ./src:/app/src node-app        # relative path

# Read-only mount
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
