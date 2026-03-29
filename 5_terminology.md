# Docker Terminology

Quick reference for technical terms, abbreviations, and flags used in Docker.

## Table of Contents

- [Technical Terms](#technical-terms)
- [Docker-Specific Terms](#docker-specific-terms)
- [Common Docker Flags](#common-docker-flags)
  - [Run Flags](#run-flags)
  - [List/Query Flags](#listquery-flags)
  - [Log Flags](#log-flags)
  - [Build Flags](#build-flags)
  - [Cleanup Flags](#cleanup-flags)
- [Common Flag Combinations](#common-flag-combinations)
- [Exit Codes](#exit-codes)
- [Port Mapping Examples](#port-mapping-examples)
- [Volume Mount Examples](#volume-mount-examples)
- [Environment Variable Examples](#environment-variable-examples)

---

## Technical Terms

| Term | Full Form | Meaning |
|------|-----------|---------|
| **STDIN** | Standard Input | Input stream (keyboard input to a program) |
| **STDOUT** | Standard Output | Output stream (program output to terminal) |
| **STDERR** | Standard Error | Error output stream |
| **TTY** | Teletypewriter | Terminal/console interface for interactive input/output |
| **PID** | Process ID | Unique number identifying a running process |
| **PPID** | Parent Process ID | PID of the process that started this process |
| **UID** | User ID | Unique number identifying a user |
| **SIGTERM** | Signal Terminate | Graceful shutdown signal (can be caught/ignored) |
| **SIGKILL** | Signal Kill | Force kill signal (cannot be caught/ignored) |
| **DNS** | Domain Name System | Translates names (like "container1") to IP addresses |
| **IP** | Internet Protocol | Network address (e.g., 172.17.0.2) |
| **TCP** | Transmission Control Protocol | Reliable network communication protocol |
| **UDP** | User Datagram Protocol | Fast but unreliable network protocol |
| **HTTP** | HyperText Transfer Protocol | Web communication protocol |
| **HTTPS** | HTTP Secure | Encrypted web communication |
| **API** | Application Programming Interface | Way for programs to communicate |
| **REST** | Representational State Transfer | API design style using HTTP methods |
| **CLI** | Command Line Interface | Text-based interface (terminal) |
| **GUI** | Graphical User Interface | Visual interface with windows/buttons |
| **ENV** | Environment Variable | Key-value config passed to programs |
| **ro** | Read-Only | Cannot be modified |
| **rw** | Read-Write | Can be read and modified |
| **VM** | Virtual Machine | Full OS running inside another OS |
| **OS** | Operating System | System software (Windows, Linux, macOS) |
| **CI/CD** | Continuous Integration/Deployment | Automated build and deploy pipelines |

---

## Docker-Specific Terms

**Image vs container (relationship):**

```
  +------------------------------+          +------------------------------+
  | Image                        |          | Container                    |
  | (read-only layers)           |--------->| (writable layer on top of    |
  |                              |          |  image layers)               |
  +------------------------------+          +------------------------------+
```

| Term | Meaning |
|------|---------|
| **Image** | Read-only template with instructions to create a container |
| **Container** | Running instance of an image |
| **Dockerfile** | Text file with instructions to build an image |
| **Layer** | Each instruction in Dockerfile creates a layer in the image |
| **Registry** | Storage for Docker images (e.g., Docker Hub) |
| **Docker Hub** | Default public registry for Docker images |
| **Tag** | Version label for an image (e.g., `nginx:1.25` or `nginx:latest`) |
| **Volume** | Persistent storage managed by Docker |
| **Bind Mount** | Mount host directory directly into container |
| **Network** | Virtual network for container communication |
| **Bridge** | Default network driver for containers on same host |
| **Overlay** | Network driver for multi-host communication |
| **Compose** | Tool for defining multi-container applications |
| **Swarm** | Docker's native clustering/orchestration tool |
| **Orchestration** | Automated management of containers at scale |
| **Daemon** | Background service that manages Docker objects (`dockerd`) |
| **Client** | CLI tool that sends commands to the daemon (`docker`) |

---

## Common Docker Flags

### Run Flags

| Flag | Long Form | Meaning |
|------|-----------|---------|
| `-i` | `--interactive` | Keep STDIN open (for input) |
| `-t` | `--tty` | Allocate a pseudo-TTY (terminal) |
| `-d` | `--detach` | Run in background (detached mode) |
| `-p` | `--publish` | Port mapping `host:container` |
| `-P` | `--publish-all` | Publish all exposed ports to random ports |
| `-v` | `--volume` | Mount volume or bind mount |
| `-e` | `--env` | Set environment variable |
| `-w` | `--workdir` | Set working directory inside container |
| `-u` | `--user` | Run as specific user |
| `-m` | `--memory` | Memory limit (e.g., `-m 512m`) |
| | `--rm` | Remove container when it exits |
| | `--name` | Assign a name to the container |
| | `--network` | Connect to a specific network |
| | `--restart` | Restart policy (`no`, `always`, `on-failure`) |
| | `--env-file` | Read environment variables from file |

### List/Query Flags

| Flag | Meaning |
|------|---------|
| `-a` | All (include stopped containers, all images) |
| `-q` | Quiet (only show IDs, no headers) |
| `-f` | Filter results |
| `-l` | Latest (show most recent) |
| `-n` | Number (limit output count) |
| `-s` | Size (show disk usage) |

### Log Flags

| Flag | Meaning |
|------|---------|
| `-f` | Follow (stream live logs) |
| `-t` | Timestamps (show time for each log) |
| `--tail` | Number of lines from end (e.g., `--tail 100`) |
| `--since` | Show logs since timestamp |
| `--until` | Show logs until timestamp |

### Build Flags

| Flag | Meaning |
|------|---------|
| `-t` | Tag the image (`name:tag`) |
| `-f` | Specify Dockerfile path |
| `--no-cache` | Don't use cache when building |
| `--build-arg` | Set build-time variables |
| `--target` | Set target build stage |

### Cleanup Flags

| Flag | Meaning |
|------|---------|
| `-f` | Force (don't prompt for confirmation) |
| `-a` | All (remove all unused, not just dangling) |
| `--volumes` | Also remove volumes |

---

## Common Flag Combinations

Flags can be combined together. Here's what common combinations mean:

| Combination | Flags | Meaning |
|-------------|-------|---------|
| `-it` | `-i` + `-t` | Interactive terminal session (for shell access) |
| `-aq` | `-a` + `-q` | All containers/images, show only IDs |
| `-d` | `-d` | Detached (background) — often used alone |
| `-itd` | `-i` + `-t` + `-d` | Interactive + TTY + Detached (rare) |

### Examples

| Command | What it does |
|---------|--------------|
| `docker ps -aq` | Get IDs of ALL containers (running + stopped) |
| `docker ps -q` | Get IDs of only RUNNING containers |
| `docker images -q` | Get IDs of all images |
| `docker run -it ubuntu bash` | Interactive shell in Ubuntu |
| `docker run -d nginx` | Run nginx in background |
| `docker exec -it container bash` | Open shell in running container |

### Subshell Pattern

| Pattern | Meaning |
|---------|---------|
| `$(docker ps -q)` | Returns IDs of running containers |
| `$(docker ps -aq)` | Returns IDs of ALL containers |
| `$(docker images -q)` | Returns IDs of all images |

**Usage:**

```bash
# Stop all running containers
docker stop $(docker ps -q)

# Remove all containers (running + stopped)
docker rm -f $(docker ps -aq)

# Remove all images
docker rmi $(docker images -q)
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success (container exited normally) |
| `1` | Application error |
| `125` | Docker daemon error |
| `126` | Command cannot be invoked |
| `127` | Command not found |
| `137` | SIGKILL (killed, e.g., `docker kill` or OOM) |
| `143` | SIGTERM (terminated, e.g., `docker stop`) |

---

## Port Mapping Examples

| Command | Meaning |
|---------|---------|
| `-p 8080:80` | Host port 8080 → Container port 80 |
| `-p 80:80` | Same port on both |
| `-p 127.0.0.1:8080:80` | Only accessible from localhost |
| `-p 8080-8090:80-90` | Port range mapping |
| `-P` | Map all exposed ports to random host ports |

---

## Volume Mount Examples

| Command | Meaning |
|---------|---------|
| `-v my-vol:/app` | Named volume "my-vol" mounted at /app |
| `-v /host/path:/container/path` | Bind mount host directory |
| `-v $(pwd):/app` | Bind mount current directory |
| `-v /host/path:/container/path:ro` | Read-only bind mount |

---

## Environment Variable Examples

| Command | Meaning |
|---------|---------|
| `-e VAR=value` | Set single variable |
| `-e VAR1=val1 -e VAR2=val2` | Set multiple variables |
| `--env-file .env` | Load from .env file |
