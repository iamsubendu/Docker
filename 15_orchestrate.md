# Orchestration (running many containers reliably)

**Orchestration** means: **a tool decides for you** where containers run, how many copies run, how they connect, and what happens when one **crashes** or a **server** goes down. You describe **what you want**; the system keeps trying to match that.

This page uses **short sentences** and **simple examples**. It does **not** replace full Kubernetes or Swarm courses — it gives you a **map**.

## Table of Contents

- [What is container orchestration? (production picture)](#what-is-container-orchestration-production-picture)
- [Why not only `docker run`?](#why-not-only-docker-run)
- [Docker Compose — one computer, many containers](#docker-compose--one-computer-many-containers)
- [Docker Swarm — Docker’s built-in cluster mode](#docker-swarm--dockers-built-in-cluster-mode)
- [Example: `docker service create` with many replicas](#example-docker-service-create-with-many-replicas)
- [Kubernetes — industry-standard orchestration](#kubernetes--industry-standard-orchestration)
- [Compare at a glance](#compare-at-a-glance)
- [Swarm vs Kubernetes vs Apache Mesos](#swarm-vs-kubernetes-vs-apache-mesos)
- [Where each one came from](#where-each-one-came-from)
- [More differences (features and ecosystem)](#more-differences-features-and-ecosystem)
- [Simple real-life examples](#simple-real-life-examples)
- [See also](#see-also)

---

## What is container orchestration? (production picture)

**Container orchestration** is a **solution** — not one button, but a **set of tools, scripts, and config files** (for example YAML, CLI commands, and APIs) that help you run containers in a **production** environment: **reliably**, **repeatedly**, and **at scale**.

**What the solution usually includes:**

- **More than one Docker host** — that means **more than one machine** (VM or bare metal) with **Docker Engine** (or a compatible runtime) installed. Each host **can** run containers.
- **A control layer** — **Kubernetes**, **Docker Swarm**, or a cloud service — that **schedules** which container runs **on which host**, **how many copies** you want, and **what to do** when something fails.
- **Wiring** — **networks**, **load balancers**, **secrets**, **storage** — so traffic reaches the right containers and data is not lost by accident.

**Why people care:** If **one** server **stops**, the app can **stay reachable** because **another** host still runs **another copy** of the same service (or the orchestrator **starts** a new one). Users see **continued access** (maybe retry, maybe slower), not a **permanent** “everything is down” unless the whole cluster is gone.

### Simple examples

**Example 1 — Not production orchestration:** You run **`docker compose up`** on **one laptop**. That is great for **development**. There is still **only one computer**. If the laptop sleeps, **everything** stops — no second host to take over.

**Example 2 — Multiple Docker hosts:** You rent **three cloud VMs**. Each has **Docker**. You join them into a **Swarm** or you install **Kubernetes**. You say: “Run **two** copies of my **API** container.” The tool puts them on **different** hosts. If **Host A** crashes, **Host B** (and **C**) can still serve traffic — the **application stays accessible** for many users.

**Example 3 — Tools and scripts:** In **Kubernetes**, you keep a **Deployment** YAML file in git. A **CI/CD script** runs **`kubectl apply`**. That is **automation** on top of the orchestrator — still part of the **solution** in real companies.

**Example 4 — Load:** Black Friday traffic **spikes**. An orchestrator can **scale out** — run **more** container copies on **more** hosts — so the **site stays up** instead of one box **running out of CPU**.

---

## Why not only `docker run`?

**One container** on **one machine**: `docker run` is enough.

**Many containers** on **one machine** (web + database + cache): you *can* run many `docker run` commands, but **starting order**, **network names**, and **updates** get painful. **Compose** helps here.

**Many containers** on **many machines** (several servers, or cloud): you need something that knows **which server** runs **which container**, **restarts** failed ones, and **scales** when load grows. That is **orchestration** at cluster scale.

---

## Docker Compose — one computer, many containers

**What it is:** A **file** (`compose.yaml` / `docker-compose.yml`) lists **services** (containers), **networks**, **volumes**, and **ports**. You run **`docker compose up`** — Docker starts **everything** in the right order (with sane defaults).

**Good for:** Local dev, small deployments, **one host** or a small fixed set of machines where you still control each box.

**Not the same as:** A full **cluster orchestrator** that moves work across **dozens** of servers by itself (Compose can be used with Swarm stacks in some setups, but “Compose alone” usually means **one machine** in learning docs).

**Learn more:** [8_compose.md](8_compose.md), sample app [9_voting_app.md](9_voting_app.md).

---

## Docker Swarm — Docker’s built-in cluster mode

**What it is:** Turns several Docker daemons into a **Swarm**: **managers** and **workers**. You deploy **services**; Swarm **schedules** **tasks** (containers) on nodes, can **scale** replicas, and has basic **load balancing** between services.

**Good for:** Teams already on Docker who want a **lighter** cluster than Kubernetes, or learning cluster ideas on a few VMs.

**CLI:** `docker swarm init`, `docker service create`, `docker stack deploy` (often with a Compose file as **stack file**).

### Example: `docker service create` with many replicas

This only works after the node is in **Swarm mode** (for example **`docker swarm init`** on a manager).

You might see:

```bash
docker service create --replicas=100 nodejs
```

**What it means:** “Create a **Swarm service** and try to run **100** copies (**tasks**) of the same container image.”

**Fixes you almost always need:**

| Part | Note |
|------|------|
| **Image name** | There is no official image called **`nodejs`** on Docker Hub. The usual **Node.js** image is **`node`** (e.g. `node:20`, `node:20-alpine`). |
| **Service name** | Add **`--name your-service`** so you can find it with `docker service ls`. |

**Realistic example:**

```bash
# 100 replicas of the official Node image (adjust tag to what you need)
docker service create --name api --replicas=100 node:20-alpine
```

**What `--replicas=100` does:** Swarm tries to keep **100** running **tasks** (containers) for this **service**, spread across **workers** in the cluster. If you only have **one** small machine, many tasks may stay **pending** until you add **more nodes** or **lower** `--replicas` — you cannot magically run 100 heavy containers on one tiny VM.

**Check services:**

```bash
docker service ls
docker service ps api
```

**Learn more:** [3_commands.md — Swarm and other advanced commands](3_commands.md#swarm-and-other-advanced-commands), [Docker Swarm docs](https://docs.docker.com/engine/swarm/).

---

## Kubernetes — industry-standard orchestration

**What it is:** **Kubernetes** (often **K8s**) runs **Pods** (usually one or more containers that share network/storage rules), **Deployments**, **Services**, **Ingress**, and more. It is **vendor-neutral** and very common in **production** cloud setups.

**Good for:** Large or growing systems, **many teams**, **auto-scaling**, **rolling updates**, **self-healing** when nodes die.

**Trade-off:** **Steeper learning curve** than Compose-only workflows.

**Learn more in this repo:** [16_kubernetes.md](16_kubernetes.md) — **Pods**, **`kubectl`**, tiny **YAML** example.

**Official docs:** [Kubernetes documentation](https://kubernetes.io/docs/home/).

---

## Compare at a glance

| Tool | Main idea | Typical scale (simple story) |
|------|-----------|------------------------------|
| **`docker run`** | One container, you type the command | One box, one-off |
| **Docker Compose** | One file, many services on **one host** (usual learning path) | Dev laptop, small server |
| **Docker Swarm** | Docker-native **cluster**, services and replicas | Small to medium clusters |
| **Kubernetes** | Rich **orchestration**, ecosystem huge | Many companies, cloud production |

---

## Swarm vs Kubernetes vs Apache Mesos

The **Compare at a glance** table above also includes **`docker run`** and **Compose**. **This section** compares **only** these three **cluster** orchestrators.

All three can run **containers** on **many machines**, but they are **not** the same product.

### What each one is (one line)

| Name | In simple words |
|------|------------------|
| **Docker Swarm** | **Extra mode** inside **Docker Engine**. You turn a set of machines into a **Swarm** and use **`docker service`**, **`docker stack`**, same **images** you already know. |
| **Kubernetes** | A **separate system** focused on **containers** (and **Pods**, **Deployments**, **Services**, …). You talk to it with **`kubectl`** and **YAML**. It does **not** ship inside `docker` — you **install** it (or use a **managed** cloud Kubernetes). |
| **Apache Mesos** | A **cluster manager** that **hands out** CPU and RAM on the cluster. **Other software** (“**frameworks**”) **decide** what to run — for example **Marathon** for **long-running** apps, or **Spark** for **batch** jobs. **Docker** is **one** kind of task, not the **only** thing Mesos was built for. |

### How they differ (quick)

| Topic | Docker Swarm | Kubernetes | Apache Mesos |
|--------|--------------|------------|--------------|
| **Easiest if you already…** | …know **`docker`** and **Compose** | …have time to learn **many** new words | …run **mixed** workloads (not only containers) |
| **Docker CLI** | **Yes** — Swarm commands are part of **Docker** | **No** — you use **`kubectl`** | **No** — you use **Mesos APIs** + a **framework** |
| **How common for new cloud apps today** | **Some** teams | **Very common** | **Less common** for **greenfield** container-only projects |

### Where each one came from

| Name | Started from (simple history) | Companies / groups you often hear today |
|------|------------------------------|----------------------------------------|
| **Docker Swarm** | **Docker, Inc.** added **Swarm mode** to **Docker Engine** (around 2016) so the **same `docker`** CLI could run a **cluster**. Before that, “Swarm” was a **separate** product; today people usually mean **Swarm mode** built into **Engine**. | **Docker** maintains **Docker Engine** (open source) with help from the **Moby** community. **Mirantis** sells **Docker-compatible** products and training; Swarm is still **in** the Engine you download from Docker. |
| **Kubernetes** | **Google** built it using ideas from **Borg** (Google’s internal scheduler). **Open-sourced** in **2014**, then **donated** to the **CNCF** (**Cloud Native Computing Foundation**), part of the **Linux Foundation**. | **CNCF** hosts the project. **Many vendors** contribute: **Google**, **Red Hat** (OpenShift), **VMware**, **Microsoft**, **Amazon**, **SUSE**, cloud providers, etc. **Managed** Kubernetes: **EKS** (AWS), **AKS** (Azure), **GKE** (Google), and others. |
| **Apache Mesos** | **UC Berkeley AMPLab** research; became an **Apache Software Foundation** project. **Mesosphere** (later **D2iQ**) built a **commercial** platform on top (**DC/OS**, Marathon, etc.). | **Apache** community maintains **Mesos**. **D2iQ** (formerly Mesosphere) still offers **Kubernetes**-focused products today; **new** Mesos-only sales are **rare** compared to the **2010s**. |

**One line:** **Swarm** = **Docker-first**. **Kubernetes** = **Google seed** + **CNCF** + **industry**. **Mesos** = **Berkeley** + **Apache** + **Mesosphere/D2iQ** history.

### More differences (features and ecosystem)

| Topic | Docker Swarm | Kubernetes | Apache Mesos |
|--------|--------------|------------|--------------|
| **Main object you deploy** | **Service** → **tasks** (containers) | **Pod** → often **Deployment** / **StatefulSet** | **Framework** decides (e.g. **Marathon** **app**, **Spark** **job**) |
| **Networking** | **Overlay** network between nodes; **routing mesh** for published ports | **Service**, **Ingress**, **many CNI plugins** (Calico, Flannel, …) | Depends on **framework** and setup |
| **Secrets / config** | **Docker secrets** (Swarm), **configs** | **Secrets**, **ConfigMaps** | **Framework-specific** |
| **Storage for apps** | **Volumes** (Docker plugins) | **PersistentVolume** / **Claim**, **CSI** drivers | **Framework-specific** |
| **Updates without big downtime** | **`docker service update`** rolling | **Deployment** **rolling update** / **rollout** | **Marathon** (or other) **rolling** deploy |
| **Extra tools (monitoring, mesh, …)** | **Smaller** ecosystem than K8s | **Huge**: **Prometheus**, **Grafana**, **Istio**, **Helm**, **operators**, … | **Varies**; **Spark** / **Hadoop** ecosystems historically |
| **Learning curve** | **Lowest** if you know **Docker** | **Highest** for full platform | **High** (Mesos **+** a **framework**) |

**Not a full feature matrix** — each row is a **typical** picture; **versions** and **plugins** change details.

### Examples (stories)

**Swarm:** You run **`docker swarm init`**, join two more servers, then **`docker service create --replicas=3 myimage`** — Swarm **places** three **tasks** on the cluster.

**Kubernetes:** You write a **Deployment** YAML: “**3** replicas of **this** container image.” You run **`kubectl apply`**. The **control plane** keeps **three** **Pods** running and **replaces** failed ones.

**Mesos:** You install **Mesos** on the cluster, then install a **framework** like **Marathon**. Marathon **asks Mesos** for resources and **starts** **Docker** (or other) **tasks**. **Batch** or **Big Data** teams sometimes used Mesos for **non-Docker** jobs too.

### Note on Mesos today

**Kubernetes** became the **usual** choice for **new** **container** platforms in many companies. **Mesos** is still an **Apache** project and appears in **older** or **special** deployments — new learners often focus on **Swarm** or **Kubernetes** first.

**Official docs:** [Docker Swarm](https://docs.docker.com/engine/swarm/) · [Kubernetes](https://kubernetes.io/docs/home/) · [Apache Mesos](https://mesos.apache.org/)

---

## Simple real-life examples

**Example 1 — You:** You run **website + database** on your laptop for a course. **Compose** is enough: one `docker compose up`, both containers start with **DNS names** between them.

**Example 2 — Startup:** You have **three servers**. You want **two copies** of the API and **automatic restart** if one dies. **Swarm** or **Kubernetes** fits; **Compose alone** on one machine does **not** replace that.

**Example 3 — Big cloud:** Your product runs in **AWS / Azure / GCP** with **auto-scaling** and **zero-downtime** deploys. Teams usually use **Kubernetes** (or the cloud’s managed version) **or** that cloud’s own orchestration (different names, same idea: **something** schedules containers).

---

## See also

- **Kubernetes first steps (Pods, `kubectl`):** [16_kubernetes.md](16_kubernetes.md)
- **Single-host multi-container:** [8_compose.md](8_compose.md)
- **Engine / daemon (what orchestrators talk to):** [11_engine.md](11_engine.md)
- **CLI overview:** [3_commands.md](3_commands.md)
- **What containers are:** [1_intro.md](1_intro.md)
