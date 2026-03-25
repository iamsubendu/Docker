# Docker Engine

People often say **“Docker Engine”** to mean **a machine (host) that runs Docker** — i.e. **a host with Docker installed**. Strictly, **Docker Engine** is the **software** (mainly the **daemon**) that runs containers on that host. The `docker` CLI talks to Engine over an API.

## Table of Contents

- [Engine and the Docker host](#engine-and-the-docker-host)
- [Three components on a Linux install](#three-components-on-a-linux-install)
- [Design: local CLI → API → daemon](#design-local-cli--api--daemon)
- [The Docker daemon (`dockerd`)](#the-docker-daemon-dockerd)
- [REST API (Engine API)](#rest-api-engine-api)
- [Remote Engine: CLI on another machine](#remote-engine-cli-on-another-machine)
- [Design: remote client → Engine](#design-remote-client--engine)
- [Engine vs Docker Desktop vs CLI](#engine-vs-docker-desktop-vs-cli)
- [Installing Engine](#installing-engine)
- [Configuration (overview)](#configuration-overview)
- [Container isolation: Linux namespaces](#container-isolation-linux-namespaces)
- [Storage and networking (where Engine fits)](#storage-and-networking-where-engine-fits)
- [Useful checks](#useful-checks)
- [See also](#see-also)

---

## Engine and the Docker host

| Phrase | Meaning |
| --- | --- |
| **Docker host** | A **computer** (VM or bare metal) where Docker is installed and containers can run. |
| **Docker Engine** | The **runtime** on that host — especially the **daemon** (`dockerd`) and what it manages. |

So: **“a server with Docker”** = a **Docker host**; the **Engine** is what actually runs and supervises containers there.

---

## Three components on a Linux install

When you install Docker on a **Linux** host with the official packages, you are effectively getting **three cooperating pieces** (they may be separate packages, but they work as one system):

| # | Component | Role |
| --- | --- | --- |
| **1** | **Docker CLI** | The **`docker`** command-line program. It **does not** run containers itself — it **sends requests** to the Engine. |
| **2** | **REST API** (Docker Engine API) | The **HTTP API** that the **daemon implements**. Clients (CLI, Compose, scripts, IDEs) use it to **give instructions** (create containers, pull images, …). It is the **interface** to the daemon — not a separate long-running “REST server” process you start by hand; it is **exposed by `dockerd`**. |
| **3** | **Docker daemon** (`dockerd`) | A **background process** that **manages Docker objects**: **images**, **containers**, **networks**, **volumes**, etc. It listens for API requests and does the work. |

Flow: **CLI → REST API → daemon → containers / images / networks / volumes**.

---

## Design: local CLI → API → daemon

Default on Linux: the CLI talks to the daemon over a **Unix socket** (still the same Engine API).

```
┌─────────────────┐         ┌──────────────────────────────────────────┐
│   Your machine  │         │        Docker Engine (on host)           │
│                 │         │                                          │
│  ┌───────────┐  │  HTTP   │  ┌──────────┐   ┌─────────┐             │
│  │ Docker CLI│──┼────────▶│  │ REST API │──▶│ dockerd │             │
│  │ (docker)  │  │  Unix   │  │(Engine   │   │ (daemon)│             │
│  └───────────┘  │  socket │  │  HTTP API)│   └────┬────┘             │
│                 │         │  └──────────┘        │                   │
│                 │         │              ┌───────▼────────┐          │
│                 │         │              │ Images,        │          │
│                 │         │              │ containers,    │          │
│                 │         │              │ networks,      │          │
│                 │         │              │ volumes        │          │
│                 │         │              └────────────────┘          │
└─────────────────┘         └──────────────────────────────────────────┘
```

---

## The Docker daemon (`dockerd`)

- **`dockerd`** is the **Docker daemon**: it runs in the background and **owns** container lifecycle and Docker state.
- On Linux it is often a **systemd** service (`docker.service`).
- If the daemon is not running, commands like `docker ps` fail with **“Cannot connect to the Docker daemon”**.

---

## REST API (Engine API)

- The **Docker Engine API** is documented by Docker as a **REST**-style HTTP API (resources and HTTP methods).
- **Any** client that can speak HTTP can talk to the daemon (if allowed): **`docker` CLI**, **`docker compose`**, CI tools, language SDKs, etc.
- Default: **Unix socket** `unix:///var/run/docker.sock`. The CLI uses this unless you set **`-H`** or **`DOCKER_HOST`**.

---

## Remote Engine: CLI on another machine

The **Docker CLI can run on a different host** than the daemon. The CLI sends API calls to **whatever Engine endpoint** you configure — for example a **TCP** URL on the remote host.

**Example — point the CLI at a remote Engine** (unencrypted port **2375** is common in lab/docs; **never expose this to the public internet** without TLS):

```bash
docker -H tcp://remote-docker-engine:2375 ps
```

Equivalent using an environment variable:

```bash
export DOCKER_HOST=tcp://remote-docker-engine:2375
docker ps
```

You can also combine host and command:

```bash
docker -H tcp://192.168.1.50:2375 run --rm hello-world
```

| Port | Typical use |
| --- | --- |
| **2375** | Engine API over **TCP**, often **without** TLS (lab / internal only if firewalled). |
| **2376** | Engine API with **TLS** (common when securing remote access). |

**Security:** Treat remote access like **root access** to the host. Prefer **SSH tunnel**, **VPN**, or **TLS + mutual auth**; do not publish **:2375** on the public internet. See Docker’s docs for **TLS** and **protecting the daemon socket**.

---

## Design: remote client → Engine

```
┌──────────────────┐              ┌──────────────────────────┐
│  Another machine │              │   Remote Docker host     │
│                  │   TCP        │                          │
│  ┌────────────┐  │  :2375      │  ┌──────────┐ ┌────────┐ │
│  │ Docker CLI │──┼────────────▶│  │ REST API │─│dockerd │ │
│  └────────────┘  │  or :2376   │  └──────────┘ └────────┘ │
│                  │  (TLS)      │                          │
└──────────────────┘              └──────────────────────────┘

  docker -H tcp://remote:2375 ps
```

---

## Engine vs Docker Desktop vs CLI

| Piece | Role |
| --- | --- |
| **Docker Engine** | The **daemon + API + runtime** on the host that runs containers. |
| **Docker CLI** | **Client** only — can be local or remote via **`-H`** / **`DOCKER_HOST`**. |
| **Docker Desktop** (Windows / Mac) | Bundles Engine (and tools) — often inside a **Linux VM** or **WSL2**; same CLI idea, different packaging. |

---

## Installing Engine

- **Linux:** [2_installation.md — On Ubuntu](2_installation.md#on-ubuntu) installs packages such as **`docker-ce`** (daemon), **`docker-ce-cli`**, **`containerd.io`**, etc.
- **Windows / Mac:** [Docker Desktop](2_installation.md#on-windows) — see [2_installation.md](2_installation.md).

```bash
docker version
docker info
```

---

## Configuration (overview)

- Daemon options often live in **`daemon.json`** (e.g. Linux: `/etc/docker/daemon.json`).
- Remote TCP (`:2375`) must be **enabled in daemon configuration** if you use it — it is **off by default** on many installs for safety.

---

## Container isolation: Linux namespaces

Docker uses **Linux kernel namespaces** to give each container its own **isolated view** of the system. A namespace wraps a global resource so that the processes inside it see **their own** private copy, while processes outside (or in a different namespace) see theirs.

When Docker creates a container, the daemon asks the kernel to place that container's processes inside **a fresh set of namespaces** — one per resource type. The container **thinks** it is the only thing running; in reality the host kernel is shared, but each container's view is limited to its own namespace.

### The namespaces Docker uses

| Namespace | Flag | What it isolates |
| --- | --- | --- |
| **PID** (Process ID) | `CLONE_NEWPID` | Each container has its own **process tree**. PID 1 inside the container is the main process (e.g. `node server.js`); the host sees it under a different PID. Processes in one container **cannot see or signal** processes in another. |
| **NET** (Network) | `CLONE_NEWNET` | Each container gets its own **network stack**: interfaces, IP addresses, routing table, port space. That is why two containers can both listen on port 80 without a conflict — they are in separate network namespaces. Docker **bridges** these to the host or to each other via virtual interfaces. |
| **MNT** (Mount) | `CLONE_NEWNS` | Each container has its own **filesystem mount tree**. The container sees the image layers (and any volumes you mount) but **cannot** see the host's filesystem unless you explicitly bind-mount it. |
| **UTS** (Unix Timesharing System) | `CLONE_NEWUTS` | Each container can have its own **hostname** and **domain name**, independent of the host and other containers. That is why `hostname` inside a container shows the container ID (or a name you set), not the host's name. |
| **IPC** (Inter-Process Communication) | `CLONE_NEWIPC` | Each container gets its own **shared memory segments, semaphores, and message queues**. Processes in one container cannot use System V IPC or POSIX message queues to communicate with processes in another container (unless you explicitly share the namespace). |
| **USER** (optional) | `CLONE_NEWUSER` | Maps **UIDs/GIDs** inside the container to different ones on the host. Root (UID 0) inside the container can be mapped to a non-root user on the host, adding a security layer. Not always enabled by default. |

### How it looks

```
            Host kernel (shared)
  ┌──────────────────────────────────────────────────┐
  │                                                  │
  │  ┌─────────────────────┐  ┌──────────────────┐   │
  │  │   Container A       │  │  Container B     │   │
  │  │                     │  │                  │   │
  │  │  PID namespace  (1) │  │  PID namespace   │   │
  │  │  NET namespace      │  │  NET namespace   │   │
  │  │  MNT namespace      │  │  MNT namespace   │   │
  │  │  UTS namespace      │  │  UTS namespace   │   │
  │  │  IPC namespace      │  │  IPC namespace   │   │
  │  │                     │  │                  │   │
  │  │  Sees: its own PIDs,│  │  Sees: its own   │   │
  │  │  its own network,   │  │  PIDs, network,  │   │
  │  │  its own mounts     │  │  mounts          │   │
  │  └─────────────────────┘  └──────────────────┘   │
  │                                                  │
  │  Host still sees ALL processes, all networks     │
  └──────────────────────────────────────────────────┘
```

- **Container A** and **Container B** each live inside their **own** set of namespaces.
- They share the **same kernel** but **cannot** see each other's processes, network, mounts, hostname, or IPC objects.
- The **host** (outside all container namespaces) can see everything — that is how `docker ps`, `docker logs`, and monitoring work.

### Namespaces + cgroups = container isolation

Namespaces answer **"what can the container see?"** — cgroups (**control groups**) answer **"how much can it use?"** (CPU, memory, disk I/O limits). Together they give Docker lightweight isolation without needing a full VM.

For more on containers vs VMs, see [1_intro.md — Docker vs Virtual Machines](1_intro.md#docker-vs-virtual-machines).

---

## Storage and networking (where Engine fits)

| Area | Role of Engine |
| --- | --- |
| **Images** | Pulled, built, cached. |
| **Containers** | Created and supervised. |
| **Volumes / bind mounts** | Attached (see [8_compose.md — Volumes](8_compose.md#volumes-in-compose)). |
| **Networks** | Created and attached to containers. |

---

## Useful checks

```bash
docker version
docker info
docker ps
```

---

## See also

- Architecture overview: [1_intro.md — Docker Architecture](1_intro.md#docker-architecture)
- Installation: [2_installation.md](2_installation.md)
- Compose (calls Engine API): [8_compose.md](8_compose.md)
- Registry: [10_registry.md](10_registry.md)
