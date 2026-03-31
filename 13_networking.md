# Docker networking

This page explains how Docker connects containers to the network. It uses **simple words** and **small examples** you can copy and run.

## Table of Contents

- [The three default networks](#the-three-default-networks)
- [Bridge — default for most containers](#bridge--default-for-most-containers)
- [Internal IPs and talking container-to-container](#internal-ips-and-talking-container-to-container)
- [Embedded DNS — resolve containers by name](#embedded-dns--resolve-containers-by-name)
- [Reaching containers from outside the host](#reaching-containers-from-outside-the-host)
- [Host — the host’s network stack](#host--the-hosts-network-stack)
- [None — no external network](#none--no-external-network)
- [Listing and inspecting](#listing-and-inspecting)
- [See container name and IP — docker inspect](#see-container-name-and-ip--docker-inspect)
- [Isolating containers on the host (user-defined bridge networks)](#isolating-containers-on-the-host-user-defined-bridge-networks)
- [Compose and custom networks](#compose-and-custom-networks)
- [See also](#see-also)

---

## The three default networks

When Docker starts, it already has **three networks**. You did not create them; Docker did.

Run this to see them:

```bash
docker network ls
```

You should see names like **`bridge`**, **`host`**, and **`none`**.

| Name | What it is for (in plain words) |
|------|----------------------------------|
| **`bridge`** | The normal choice. Each container gets its **own IP inside Docker**. Containers can talk to the internet and (on the same network) to each other. |
| **`host`** | The container **shares the computer’s network** (Linux). No separate Docker IP inside the container. Behaves differently on Docker Desktop (Mac/Windows). |
| **`none`** | **No real network** inside the container — only loopback. Good when you want the container cut off from the outside world. |

You might see **other** networks later (for example after Swarm or plugins). The three above are the usual starting set.

---

## Bridge — default for most containers

If you run a container and **do not** pass `--network`, Docker puts it on **`bridge`**:

```bash
# These two lines do the same thing for networking:
docker run -d --name web nginx
docker run -d --name web --network bridge nginx
```

On Linux, Docker connects this network to a special interface on the host (often called **`docker0`**). You do not need to manage that for basic use.

---

### Internal IPs and talking container-to-container

**What happens:** Every container on the default `bridge` gets an **IP address inside Docker**. Often the range looks like **`172.17.x.x`** (for example `172.17.0.2`, `172.17.0.3`). The exact range can change, so do not rely on memory — **check** when you need the real IP.

**Step 1 — See the range Docker uses for `bridge`:**

```bash
docker network inspect bridge --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

**Step 2 — Start two containers on the default bridge (no `--network`):**

```bash
docker run -d --name web nginx
docker run -d --name client alpine sleep 3600
```

**Step 3 — Read `web`’s IP and call it from `client`:**

```bash
# Save web's IP into a variable (works when web has one Docker network)
WEB_IP=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' web)
echo "IP of container 'web': $WEB_IP"

# Inside 'client', open nginx using that IP (port 80 is nginx inside the container)
docker exec client wget -qO- "http://${WEB_IP}/"
```

So: **same bridge → use the other container’s IP** to talk to it (like two computers on the same Wi‑Fi).

---

### Embedded DNS — resolve containers by name

**Idea:** On a **network you create yourself** (`docker network create …`), Docker can help with **names**. One container can open another using **the container name** instead of copying an IP.

**Example — create a network, then use the name `web`:**

```bash
# 1) Create a private network
docker network create app-net

# 2) Run nginx on that network and give it the name "web"
docker run -d --name web --network app-net nginx

# 3) Run another container on the SAME network and call "http://web"
docker run --rm --network app-net curlimages/curl:latest curl -s http://web/
```

Here **`web`** works like a hostname. Docker’s **built-in DNS** (often wired through **`127.0.0.11`** inside the container) turns that name into the right IP **on that network**.

**On the default network named `bridge`**, name-to-name DNS **does not work the same way** as in the example above. For “call by name”, use a **custom network** (like `app-net`) or **Docker Compose**.

**Extra names:** You can add more names for one container with **`--network-alias`** (optional; look up when you need it).

**`host` network:** There is no Docker “name list” between containers like above — the container uses the host’s networking.

**`none` network:** There is nothing to resolve; the container is not on a normal Docker network.

---

### Reaching containers from outside the host

People on **another PC** or on the **internet** cannot use the **`172.17.x.x`** address directly. That address lives **inside Docker**. To open your app from outside, use one of these patterns.

**Option A — Map a port on the host to a port in the container (`-p`)**

This is the usual way.

```bash
# Computer port 8080  →  container port 80
docker run -d -p 8080:80 --name public-web nginx
```

Then:

- On **this computer**: open **`http://127.0.0.1:8080`** (or `http://localhost:8080`).
- On **another computer on the same LAN**: use **this computer’s IP** and port **8080**, for example `http://192.168.1.50:8080` (replace with your real IP; firewall must allow it).

```bash
# Quick check on the same machine
curl http://127.0.0.1:8080
```

You can map more than one port, for example `-p 80:80 -p 443:443`.

**Option B — Use `--network host` (Linux)**

The app listens on **the host’s ports** directly. You often **do not** use `-p` here. See the [Host](#host--the-hosts-network-stack) section. On **Docker Desktop** (Mac/Windows) this is **not** the same as on Linux.

For many setups, **Option A** is easier to understand and move to another server.

---

## Host — the host’s network stack

```bash
docker run --rm --network host nginx
```

**In short:** On **Linux**, the container uses the **same network as the operating system**. Published ports (`-p`) are **not** used in the usual way.

On **Docker Desktop**, read Docker’s docs — it is **not** identical to Linux here.

---

## None — no external network

```bash
docker run --rm --network none alpine ip addr
```

You usually see only **`lo`** (loopback). Use this when you want the container **off the normal Docker network** (for example maximum isolation).

---

## Listing and inspecting

```bash
# All networks (defaults + ones you created)
docker network ls

# Details about the default bridge
docker network inspect bridge
```

More commands: [3_commands.md — Networking](3_commands.md#networking).

### See container name and IP — docker inspect

Use the container **name** or **ID** (short ID is OK if it is unique).

```bash
# Everything about the container (long JSON)
docker inspect web

# Just the name (may start with "/" in the output — that is normal)
docker inspect -f '{{.Name}}' web

# IP address when the container has one Docker network
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' web
```

If the container joins **more than one** network, list each network name and IP:

```bash
docker inspect -f '{{range $name, $net := .NetworkSettings.Networks}}{{$name}} → {{$net.IPAddress}}{{"\n"}}{{end}}' web
```

More examples: [3_commands.md — Container Inspection](3_commands.md#container-inspection).

---

## Isolating containers on the host (user-defined bridge networks)

**Default:** All containers without `--network` land on the **same** built-in network **`bridge`**. They can reach each other by **IP** (see [above](#internal-ips-and-talking-container-to-container)).

**If you want groups that do not share one network:** create **another** bridge network. Containers on **`app-net`** are not on **`db-net`** unless you attach them there.

**Create networks:**

```bash
docker network create --driver bridge app-net
docker network create db-net
```

`--driver bridge` is the normal choice; you can shorten to `docker network create app-net` in many cases.

**Optional (advanced):** pick a subnet so ranges do not clash with your home network:

```bash
docker network create --driver bridge --subnet 172.28.0.0/16 isolated-net
```

**Put a container on a specific network:**

```bash
docker run -d --name web --network app-net nginx
docker run -d --name api --network db-net alpine sleep 3600
```

**List networks again:**

```bash
docker network ls
```

**If one container must talk to two networks**, connect it to the second network:

```bash
docker network connect db-net web
```

(or design the app so one shared network is enough).

**Example — two separate groups:**

```bash
docker network create stack-a
docker network create stack-b

docker run -d --name svc-a --network stack-a nginx
docker run -d --name svc-b --network stack-b nginx
# svc-a and svc-b are on different networks — they are not in the same group by default
```

---

## Compose and custom networks

**Docker Compose** often creates a network for your project **for you**. Service names in `docker-compose.yml` become **names other containers can use** (similar to the `web` name in the custom-network example). Step-by-step: [8_compose.md](8_compose.md) and the voting app [9_voting_app.md](9_voting_app.md).

**Swarm / multiple servers:** there is also an **`overlay`** driver for clusters. You do not need it for a normal single-machine Compose project.

---

## See also

- **Commands:** [3_commands.md — Networking](3_commands.md#networking)
- **How the Engine isolates containers:** [11_engine.md — Linux namespaces](11_engine.md#container-isolation-linux-namespaces)
- **Compose networking:** [8_compose.md — Networking in Compose](8_compose.md#networking-in-compose)
- **Install Docker:** [2_installation.md](2_installation.md)
