# Docker Engine

People often use **“Docker Engine”** to mean **a computer that has Docker on it** (a **Docker host**). More exactly, **Docker Engine** is the **program** on that computer — mainly the **daemon** — that runs your containers. The `docker` command does not do the work itself; it **asks Engine over an API**.

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
  - [Linux boot and process IDs](#linux-boot-and-process-ids)
  - [Container as a child system: the PID problem](#container-as-a-child-system-the-pid-problem)
  - [Design: host view vs container PID view](#design-host-view-vs-container-pid-view)
  - [Example: one process, two PIDs](#example-one-process-two-pids)
  - [Resource limits (cgroups): CPU and memory](#resource-limits-cgroups-cpu-and-memory)
- [Storage and networking](#storage-and-networking)
- [Useful checks](#useful-checks)
- [See also](#see-also)

---

## Engine and the Docker host

| Phrase | Meaning |
| --- | --- |
| **Docker host** | A **computer** (real machine or VM) with Docker installed, where containers can run. |
| **Docker Engine** | The **runtime** on that host — mainly the **daemon** (`dockerd`) and what it manages. |

So: **“a server with Docker”** is a **Docker host**. The **Engine** is what **runs and looks after** containers on that machine.

---

## Three components on a Linux install

When you install Docker on **Linux** with the official packages, you get **three parts** that work together (they may be separate packages):

| # | Component | Role |
| --- | --- | --- |
| **1** | **Docker CLI** | The **`docker`** program in the terminal. It **does not** run containers by itself. It **sends requests** to Engine. |
| **2** | **REST API** (Docker Engine API) | **HTTP calls** that **`dockerd` answers**. The CLI, Compose, scripts, and tools use this API to **tell Docker what to do** (start containers, pull images, and so on). You do not start a separate “REST server”; the API is **built into `dockerd`**. |
| **3** | **Docker daemon** (`dockerd`) | A **background program** that **owns** Docker’s work: **images**, **containers**, **networks**, **volumes**. It waits for API calls and does the real work. |

Flow: **CLI → REST API → daemon → containers / images / networks / volumes**.

---

## Design: local CLI → API → daemon

On Linux by default, the CLI talks to the daemon through a **Unix socket** (it is still the same Engine API).

```
+----------------------------------------------------------------------+
|                    Your machine                                      |
|                                                                      |
|  +----------------------+                                            |
|  |    Docker CLI        |                                            |
|  |     (docker)         |                                            |
|  +----------+-----------+                                            |
+--------------+-------------------------------------------------------+
|               |                                                      |
|  HTTP (Engine API on Unix socket)                                    |
|               v                                                      |
+----------------------------------------------------------------------+
|               Docker Engine (on host)                                |
|                                                                      |
|  +----------------------+        +----------------------+            |
|  |      REST API        |------->|      dockerd         |            |
|  | (Engine HTTP API)    |        |     (daemon)         |            |
|  +----------------------+        +----------+-----------+            |
|                                    |                                 |
|                                    v                                 |
|              +-------------------------------------------+           |
|              | Images, containers, networks, volumes     |           |
|              +-------------------------------------------+           |
+----------------------------------------------------------------------+
```

---

## The Docker daemon (`dockerd`)

- **`dockerd`** is the **Docker daemon**: a program that stays in the background and **controls** container start/stop and Docker’s state.
- On Linux it is usually a **systemd** service (`docker.service`).
- If it is not running, commands like `docker ps` show **“Cannot connect to the Docker daemon”**.

---

## REST API (Engine API)

- The **Docker Engine API** is an **HTTP API** (REST-style: URLs and verbs like GET/POST).
- **Any** program that can send HTTP can use it (if allowed): **`docker`**, **`docker compose`**, CI jobs, code libraries, etc.
- By default the CLI uses the **Unix socket** `unix:///var/run/docker.sock`. Use **`-H`** or **`DOCKER_HOST`** to point somewhere else.

---

## Remote Engine: CLI on another machine

The **Docker CLI can run on one machine** and the **daemon on another**. You tell the CLI **where** Engine listens — often a **TCP** address on the remote host.

**Example — use a remote Engine** (port **2375** without encryption is common in labs; **do not** put this on the public internet without TLS):

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
| **2375** | Engine API over **TCP**, often **without** TLS (labs or private networks only). |
| **2376** | Engine API with **TLS** (better for real remote access). |

**Security:** Remote Engine access is very powerful — like **root on the host**. Use an **SSH tunnel**, **VPN**, or **TLS**; do not leave **:2375** open on the internet. See Docker’s docs on **TLS** and **securing the socket**.

---

## Design: remote client → Engine

```
+----------------------------------------------------------------------+
|                  Another machine                                     |
|                                                                      |
|  +----------------------+                                            |
|  |    Docker CLI        |                                            |
|  +----------+-----------+                                            |
+--------------+-------------------------------------------------------+
|               |                                                      |
|  TCP port 2375 (no TLS) or 2376 (TLS)                                |
|               v                                                      |
+----------------------------------------------------------------------+
|                  Remote Docker host                                  |
|                                                                      |
|  +----------------------+        +----------------------+            |
|  |      REST API        |------->|      dockerd         |            |
|  +----------------------+        +----------------------+            |
+----------------------------------------------------------------------+
```

```bash
docker -H tcp://remote:2375 ps
```

---

## Engine vs Docker Desktop vs CLI

| Piece | Role |
| --- | --- |
| **Docker Engine** | On the host: **daemon + API + runtime** that actually runs containers. |
| **Docker CLI** | **Client only** — runs on your machine or another; use **`-H`** / **`DOCKER_HOST`** to choose Engine. |
| **Docker Desktop** (Windows / Mac) | Ships Engine (and tools), often in a **Linux VM** or **WSL2**. Same idea as Linux; different install. |

---

## Installing Engine

- **Linux:** [2_installation.md — On Ubuntu](2_installation.md#on-ubuntu) — packages like **`docker-ce`** (daemon), **`docker-ce-cli`**, **`containerd.io`**, and more.
- **Windows / Mac:** [Docker Desktop](2_installation.md#on-windows) — details in [2_installation.md](2_installation.md).

```bash
docker version
docker info
```

---

## Configuration (overview)

- Many daemon settings go in **`daemon.json`** (on Linux often `/etc/docker/daemon.json`).
- Remote TCP (`:2375`) must be **turned on in config** if you use it — many installs leave it **off** for safety.

---

## Container isolation: Linux namespaces

Docker uses **Linux kernel namespaces** so each container sees a **separate slice** of the system. A namespace splits a shared thing (like the process list or the network) so **this** container’s processes see **one** view and **that** container sees **another**.

When Docker starts a container, **`dockerd`** asks the kernel for a **new set of namespaces** — one kind per resource (processes, network, mounts, and so on). Inside the container it **feels** like a small machine. On the real machine, **one kernel** is shared; each container only sees what its namespaces allow.

### Linux boot and process IDs

When a **Linux** system **boots**, the kernel starts **one first process**. That process gets **PID 1**. People often call it the **init** process (the **root of the process tree** — not the same thing as the **root user**). It is the ancestor of almost everything else (`systemd`, `sshd`, your shell, and so on).

Then the system starts **more processes**: children of PID 1, then their children, and so on. Those processes get **PID 2, 3, 4, …** (numbers are handed out by the kernel; the exact order depends on the distro and services).

- On the host you can list processes with **`ps`** (for example `ps -e` or `ps aux`). Each row is **one** process, and **no two rows use the same PID** at the same time on that host.

So far, everything lives in **one global PID space** — the normal view of the machine.

### Container as a child system: the PID problem

Think of a **container** as a **small system inside** your current system: it should **feel** like its **own** machine, with its **own** process tree starting from **PID 1** (the main process you started in the image, e.g. `nginx` or your app).

But there is **no separate CPU** and **no second kernel**: those processes are **still** normal processes on the **same** Linux kernel as the host. **Two processes cannot share one PID** in the **same** PID namespace.

**PID namespaces** fix this: **one real process** can show up with **one PID on the host** and **another PID inside the container** — usually **PID 1** inside the box for the container’s “init” process. From **inside** the container, `ps` only sees that **namespace’s** list. From the **host**, `ps` sees the **global** list. Same processes; **two different views**.

### Design: host view vs container PID view

```
+----------------------------------------------------------------------+
| One kernel, one set of real tasks                                    |
|                                                                      |
| HOST (global PIDs)              CONTAINER (PID namespace)            |
| pid 1   -> systemd (init)       pid 1   -> your app (e.g. nginx)     |
| pid 2   -> ...                  pid 12  -> helper inside box         |
| pid 456 -> same process as ---->  shown as pid 1 or 12 here          |
|            container init       (not the host pid 1)                 |
|                                                                      |
| The host always knows the real PIDs; the box sees a fresh tree.      |
+----------------------------------------------------------------------+
```

### Example: one process, two PIDs

Run a small container that only sleeps (Alpine image is tiny). **Replace** `ns-demo` with another name if that name is already taken.

```bash
docker run -d --name ns-demo alpine sleep 3600
```

**1) Host: the real PID** — ask Docker which **host** PID is the main process of the container (the first process in the box):

```bash
docker inspect -f '{{.State.Pid}}' ns-demo
```

Example (your number will differ):

```text
45642
```

That value is **one** process on the **host** — the container’s main process as the kernel sees it.

**2) Inside the container: PID 1** — list processes **inside** the same container:

```bash
docker exec ns-demo ps -o pid,comm
```

Example:

```text
PID   COMMAND
    1 sleep
   12 ps
```

So **`sleep`** is **PID 1** inside the box (and `ps` gets another PID). **One** kernel task: the host PID from `docker inspect`, **1** inside the namespace.

**3) Host: confirm the same task** — on the host, that PID exists in the global list (example path; your number will differ):

```bash
ps -p 45642 -o pid,comm
```

(Use the number you got from `docker inspect`, not `45642`.) Example:

```text
    PID COMMAND
  45642 sleep
```

The **command** matches what runs as PID 1 inside the box (`sleep` in this demo).

**4) Cleanup**

```bash
docker rm -f ns-demo
```

**Takeaway:** namespaces do **not** duplicate the kernel; they **reshape what you see**. PID namespace gives the container a **clean process tree** with its **own** PID 1, while the host still tracks the **real** PIDs.

### The namespaces Docker uses

| Namespace | Flag | What it isolates |
| --- | --- | --- |
| **PID** (Process ID) | `CLONE_NEWPID` | Each container has its own **list of processes**. PID **1** inside the box is your main app (e.g. `node server.js`); on the host that process has a **different** PID. One container **cannot see or signal** another’s processes. |
| **NET** (Network) | `CLONE_NEWNET` | Each container gets its own **network stack** (interfaces, IPs, routes, ports). Two containers can both use **port 80** inside their own view without fighting — different namespaces. Docker **connects** them to the host or each other with virtual network gear. |
| **MNT** (Mount) | `CLONE_NEWNS` | Each container has its own **mount tree**. It sees the image (and volumes you add). It **does not** see the host’s disks unless you **bind-mount** a path on purpose. |
| **UTS** (hostname) | `CLONE_NEWUTS` | Each container can have its own **hostname** (and related name fields), different from the host and from other containers. So `hostname` inside the container often shows the **container id** or a name you set. |
| **IPC** (between processes) | `CLONE_NEWIPC` | Each container has its own **IPC tools** (shared memory, semaphores, message queues). Processes in box A **cannot** use those Linux IPC channels to talk to box B unless you **share** the namespace on purpose. |
| **USER** (optional) | `CLONE_NEWUSER` | Maps **user ids** inside the container to **different** ids on the host. **root** inside the box can map to a **non-root** user on the host for extra safety. Not always on by default. |

### How it looks

```
                        Host kernel (shared)
+----------------------------------------------------------------------+
|                                                                      |
| +------------------------+      +------------------------+           |
| |      Container A       |      |      Container B       |           |
| |                        |      |                        |           |
| | PID, NET, MNT, UTS, IPC|      | PID, NET, MNT, UTS, IPC|           |
| | namespaces (own view)  |      | namespaces (own view)  |           |
| |                        |      |                        |           |
| | Own PIDs, network,     |      | Own PIDs, network,     |           |
| | mounts, hostname, IPC  |      | mounts, hostname, IPC  |           |
| +------------------------+      +------------------------+           |
|                                                                      |
| Host still sees all processes and all networks                       |
+----------------------------------------------------------------------+
```

- **Container A** and **Container B** each use their **own** namespaces.
- They share the **one host kernel** but **cannot** see each other’s processes, networks, mounts, hostnames, or IPC.
- The **host** (outside those namespaces) can see **all** of it — that is how `docker ps`, `docker logs`, and monitoring work.

### Namespaces + cgroups = container isolation

**Namespaces** = **what** the container can **see**. **cgroups** (**control groups**) = **how much** it can **use** (CPU, memory, disk I/O caps). Together they give strong isolation **without** a full virtual machine.

### Resource limits (cgroups): CPU and memory

By default, a container **does not** get a fixed slice of the hardware. Unless you set limits, it can **compete for all** CPU, memory, and I/O on the **host** like any other process — a busy or buggy container can **slow down** or **stress** the whole machine.

**Linux cgroups** are what enforce **caps** (maximum use). Docker turns your flags into cgroup settings when you **create** the container.

**CPU — `--cpus`**

Use **`--cpus`** (note the **s** — there is no **`--cpu`** flag in the usual `docker run` help). The value is **how many CPUs’ worth** of processing the container may use. For example **`--cpus=0.5`** caps it at **half of one CPU** worth of time (Docker maps this to cgroup CPU limits; on a **multi-core** host it is **not** the same as “50% of every core at once” — it is a **ceiling** on CPU share).

```bash
docker run --cpus=0.5 my-image
```

You can raise it to **`1.0`**, **`1.5`**, … up to what the machine can grant.

**Memory — `--memory` (or `-m`)**

Cap **RAM** for the container so it cannot grow past that limit (the process may be **killed** by the kernel if it tries to use more).

```bash
docker run --memory=100m my-image
```

Here **`100m`** means **100 megabytes** of memory for that container (suffixes like **`g`** / **`m`** follow Docker’s usual rules — see `docker run --help`).

| Flag | Meaning |
| --- | --- |
| **`--cpus=<n>`** | Upper bound on CPU use, in “CPU units” (e.g. **`0.5`** ≈ half a CPU worth). |
| **`--memory=<size>`** or **`-m <size>`** | Hard cap on memory (e.g. **`100m`**). |

**Takeaway:** **Namespaces** hide other workloads; **cgroups** **bound** how hard this container can hit the host. Set **`--cpus`** and **`--memory`** when you care about **fair sharing** or **safety** on shared machines.

For more on containers vs VMs, see [1_intro.md — Docker vs Virtual Machines](1_intro.md#docker-vs-virtual-machines).

---

## Storage and networking

| Area | What Engine does |
| --- | --- |
| **Images** | Pull, build, cache. |
| **Containers** | Create and run. |
| **Volumes / bind mounts** | Hook storage into containers — see [12_storage.md](12_storage.md); Compose patterns in [8_compose.md — Volumes](8_compose.md#volumes-in-compose). |
| **Networks** | Create networks and plug containers in. |

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
- CLI reference: [3_commands.md](3_commands.md)
- Default Docker networks (`bridge`, `host`, `none`): [13_networking.md](13_networking.md)
- Installation: [2_installation.md](2_installation.md)
- Compose (talks to Engine API): [8_compose.md](8_compose.md)
- Registry: [10_registry.md](10_registry.md)
