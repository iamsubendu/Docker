# What is Docker?

Docker is a platform that lets you **package an application with everything it needs** (code, runtime, dependencies, configs) into a portable container, so it runs the same way on any machine that has Docker installed.

## Table of Contents

- [What is Docker?](#what-is-docker)
- [Why do you need Docker?](#why-do-you-need-docker)
- [What are containers?](#what-are-containers)
- [How OS works](#how-os-works)
- [An app on Windows — how will it run on Mac?](#an-app-on-windows--how-will-it-run-on-mac)
- [Where are containers hosted?](#where-are-containers-hosted-and-how-do-they-manage-so-many-containers)
- [Docker Architecture](#docker-architecture)
- [Docker Engine (CLI, API, daemon) — deeper dive](11_engine.md)
- [Docker storage (volumes, bind mounts)](12_storage.md)
- [Docker containers share the host kernel](#docker-containers-share-the-host-kernel)
- [Docker vs Virtual Machines](#docker-vs-virtual-machines)
- [Docker in Dev + DevOps](#docker-in-dev--devops)

# Why do you need Docker?

Because Docker makes it easy to run your application anywhere without setup issues.

Normally, when you run an app on another computer or server, it might fail because:

- **"It works on my machine" problems** 😅
- Missing dependencies or different versions of Node, Python, etc.
- OS or environment differences
- **Compatibility issues** between different system libraries and tools
- **Dependency conflicts** when multiple projects require different versions
- **Long setup time** — spending hours configuring environments, installing packages, and troubleshooting
- **Different dev/test/prod environments** — what works locally might break in staging or production

Docker fixes all that by packaging your code + dependencies + environment into a container — a small, isolated box that runs the same way everywhere.

With Docker, you get:

- **Consistent environments** across development, testing, and production
- **Fast setup** — just run `docker-compose up` instead of manual configuration
- **Isolated dependencies** — no conflicts between projects
- **Easy deployment** — same container works on any machine that runs Docker

## What are containers?

A **container** is a lightweight, standalone package that includes everything needed to run an application:

- Your application code
- Runtime environment (Node.js, Python, etc.)
- System libraries and dependencies
- Configuration files

Think of it like a **shipping container** — just as physical containers standardize shipping, software containers standardize how applications run. The container isolates your app from the host system, so it runs the same way whether it's on your laptop, a colleague's machine, or a cloud server.

**Key benefits:**

- **Isolation** — containers don't interfere with each other or the host system
- **Portability** — run anywhere Docker is installed
- **Consistency** — same container = same behavior everywhere
- **Lightweight** — containers share the host OS kernel, making them much lighter than virtual machines

## How OS works

An operating system consists of two main parts:

### 1. OS Kernel

The **kernel** is the core component of an operating system that:

- **Interacts directly with hardware** — manages CPU, memory, disk, network cards, etc.
- Acts as a bridge between hardware and software
- Handles low-level operations like process scheduling, memory management, and device drivers
- Provides essential services that all software depends on

Think of the kernel as the **foundation** — it's the layer that talks to your computer's physical components.

### 2. Software Layer

The **software layer** sits above the kernel and includes:

- System utilities and tools
- User interface (command line, desktop environment)
- Package managers
- System libraries
- Default applications and configurations

This software layer is what **differentiates one OS from another**, even when they share the same kernel.

### The Linux Example

All Linux distributions (Ubuntu, Debian, CentOS, Fedora, etc.) share the **same Linux kernel**, but they differ in:

- Package managers (apt, yum, pacman)
- Default software and tools
- Desktop environments (GNOME, KDE, XFCE)
- System configurations and conventions
- Release cycles and update policies

So Ubuntu and Debian both use the Linux kernel, but the software layer above makes them feel like different operating systems. This is why Docker containers work across all Linux distributions — they all share the same kernel interface!

**Note:** Windows and Mac do **not** have the same kernel. Windows uses the **Windows NT kernel** (proprietary, Microsoft), while macOS uses the **XNU kernel** (based on Mach and BSD, Apple). Each operating system family has its own unique kernel, unlike Linux distributions which all share the Linux kernel.

**Why this matters for Docker:** Containers share the host's OS kernel but bring their own software layer (libraries, tools, runtime), which is why they're lightweight and portable.

## An app on Windows — how will it run on Mac?

Since Windows and Mac have **different kernels**, a Windows app can't directly run on Mac (and vice versa). Here are the common solutions:

### Solutions for Cross-Platform Apps:

1. **Cross-platform languages/runtimes**
   - **Java** — compiles to bytecode that runs on the Java Virtual Machine (JVM) on any OS
   - **Python, Node.js, etc.** — interpreted languages that work on any OS with the runtime installed
   - **Web apps** — run in browsers, which work on all platforms

2. **Native compilation**
   - Build separate versions for each platform (Windows `.exe`, Mac `.app`, Linux binary)
   - Requires maintaining multiple builds and testing on each platform

3. **Virtual machines**
   - Run a full OS inside another OS (e.g., Windows VM on Mac)
   - Heavy, slow, and resource-intensive

4. **Containers (Docker)** ⭐
   - Package your app with its dependencies in a container
   - The container runs the same way on Windows, Mac, or Linux (as long as Docker is installed)
   - **This is why Docker is powerful** — one containerized app works everywhere!

### The Docker Advantage:

If you build your app in a Docker container on Windows, it will run identically on Mac, Linux, or any server — because Docker provides a consistent environment regardless of the host OS. The container includes everything needed (code, runtime, libraries), so the underlying OS differences don't matter.

## Where are containers hosted, and how do they manage so many containers?

### Where containers run:

Containers are hosted on:

- **Large servers** — powerful computers in data centers with lots of CPU, RAM, and storage
- **Cloud platforms** — AWS, Google Cloud, Azure, etc. provide virtual servers that run containers
- **Your laptop** — for development and testing (smaller scale)
- **Server clusters** — multiple servers working together to run thousands of containers

Yes, these are typically **very large computers and servers** designed to handle many containers simultaneously!

### How they manage so many containers:

Managing hundreds or thousands of containers manually would be impossible. That's where **orchestration tools** come in:

1. **Docker Compose** (small to medium scale)
   - Manages multiple containers for a single application
   - Defines all services in one file (`docker-compose.yml`)
   - Perfect for: local development, small apps, single-server deployments

2. **Kubernetes** (large scale) ⭐
   - **The industry standard** for managing containers at scale
   - Automatically distributes containers across multiple servers
   - Handles:
     - **Scaling** — automatically starts/stops containers based on traffic
     - **Load balancing** — distributes traffic across containers
     - **Health checks** — restarts failed containers automatically
     - **Updates** — rolls out new versions without downtime
     - **Resource management** — ensures containers get enough CPU/memory

3. **Cloud container services**
   - AWS ECS, Google Cloud Run, Azure Container Instances
   - Managed services that handle orchestration for you
   - You just deploy containers, they handle the rest

### Real-world example:

A company like Netflix might run **thousands of containers** across **hundreds of servers**. Kubernetes automatically:

- Starts more containers when traffic spikes
- Moves containers if a server fails
- Updates containers without service interruption
- Balances load across all containers

**The bottom line:** Orchestration tools like Kubernetes act as the "traffic controller" for containers, automatically managing where they run, how many run, and keeping everything healthy — so humans don't have to manually manage each container!

## Docker Architecture

Docker uses a **client-server architecture** with three main components:

```
+-------------------------------------------------------------------+
|                      Docker Host                                  |
|                                                                   |
|  +-------------------+        +-------------------------------+   |
|  | Docker Client     |        | Docker Daemon (dockerd)       |   |
|  |                   |        |  +---------+  +---------+     |   |
|  | docker build      |------->|  |Container|  |Container|     |   |
|  | docker pull       |        |  |    1    |  |    2    |     |   |
|  | docker run        |        |  +---------+  +---------+     |   |
|  |                   |        |  +-------------------------+  |   |
|  +-------------------+        |  | Images / Volumes        |  |   |
|                               |  +-------------------------+  |   |
|                               +-------------------------------+   |
+-------------------------------------------------------------------+
                                 |
                                 v
                    +---------------------------+
                    | Docker Registry           |
                    | (e.g. Docker Hub)         |
                    +---------------------------+
```

**Same architecture as a flow (CLI → REST API → daemon):**

```
  Docker CLI ---- HTTP ----> REST API ----> Docker daemon
   (docker)                 (Engine API)     (dockerd)
```

For **remote** daemons, the CLI can target another host, e.g. `docker -H tcp://host:2375 ps` — see [11_engine.md — Remote Engine](11_engine.md#remote-engine-cli-on-another-machine).

### 1. Docker Client

The **Docker Client** (`docker`) is the command-line tool you use to interact with Docker:

- Sends commands to the Docker daemon **via the REST API** (Engine HTTP API)
- Can communicate with local or remote Docker daemons (`-H` / `DOCKER_HOST`)
- Examples: `docker build`, `docker pull`, `docker run`, `docker ps`

### 2. Docker Daemon

The **Docker Daemon** (`dockerd`) is the background service that does the heavy lifting:

- Manages Docker objects (images, containers, networks, volumes)
- **Exposes** the Docker Engine **REST API** and listens for requests from the client (and other tools)
- Can communicate with other daemons to manage distributed services
- Handles building, running, and distributing containers

### 3. Docker Registry

A **Docker Registry** stores Docker images:

- **Docker Hub** — the default public registry (like GitHub for images)
- **Private registries** — AWS ECR, Google Container Registry, self-hosted
- Commands like `docker pull` and `docker push` interact with registries

### How they work together:

1. You type `docker run nginx` (client)
2. Client sends the command to the daemon
3. Daemon checks if `nginx` image exists locally
4. If not, daemon pulls it from the registry (Docker Hub)
5. Daemon creates and starts the container
6. You see the output in your terminal

## Docker containers share the host kernel

- Containers run in **user space** and **reuse the host's kernel**; they do not ship their own kernel.
- **Linux containers need a Linux kernel.** On Mac/Windows, Docker Desktop runs a lightweight Linux VM to provide that kernel.
- Isolation is provided by kernel features (**namespaces** and **cgroups**), not by a separate guest OS. Docker creates a **separate set of namespaces** (PID, NET, MNT, UTS, IPC) for each container — see [11_engine.md — Container isolation: Linux namespaces](11_engine.md#container-isolation-linux-namespaces).
- This is why containers are **much lighter than virtual machines** and start in milliseconds.

## Docker vs Virtual Machines

| Aspect        | Docker container (shares host kernel)    | Virtual machine (VM)                         |
| ------------- | ---------------------------------------- | -------------------------------------------- |
| What's inside | App + libraries; **no kernel**           | Full OS with its own kernel                  |
| Startup speed | Seconds to milliseconds                  | Minutes                                      |
| Resource use  | Light (no extra OS)                      | Heavy (full OS per VM)                       |
| Isolation     | Kernel features (namespaces, cgroups)    | Full OS isolation                            |
| Portability   | Same container runs anywhere with Docker | Needs hypervisor + matching VM image         |
| Best for      | Microservices, fast scaling, CI/CD       | Legacy apps, strong isolation, full OS needs |

**Container vs Image:**

| Item      | What it is                                                                 | State        | Mutability              | Storage/Location                        | Example                                   |
| --------- | -------------------------------------------------------------------------- | ------------ | ----------------------- | --------------------------------------- | ----------------------------------------- |
| Image     | Read-only, layered filesystem + metadata (the recipe)                      | Static build | Immutable               | Stored locally or in a registry         | `myapp:1.0` image in a registry           |
| Container | Running instance created from an image (uses a thin writable layer on top) | Running      | Writes to its own layer | Lives on a host; can be started/stopped | `docker run myapp:1.0` starts a container |

Note on mutability: container writes stay in its writable layer; the underlying image remains unchanged. To make changes permanent as a new baseline, build/commit a new image.

## Docker in Dev + DevOps

- Devs write code and a **Dockerfile** (a simple build guide with everything the app needs).
- They **build an image** from that Dockerfile and give that one image to DevOps.
- DevOps runs the image on any server or cluster; it behaves the same because everything it needs is inside.
- Result: no “works on my machine” issues — the Dockerfile is the guide, the image is the handoff, the container runs the same everywhere.
