# Kubernetes (K8s) — first steps

**Kubernetes** (people often write **K8s**) is an **open-source system** that **runs and manages containers** for you across **many machines**. You describe **what** you want (for example: “**three** copies of my **web** app”); Kubernetes tries to **keep** that true when **servers fail** or **traffic** grows.

This page is a **short map**. The **official docs** go much deeper — see [See also](#see-also).

## Table of Contents

- [Why Kubernetes exists](#why-kubernetes-exists)
- [How it connects to Docker](#how-it-connects-to-docker)
- [Big ideas: cluster, nodes, control plane](#big-ideas-cluster-nodes-control-plane)
- [Control plane and "master" — how orchestration works](#control-plane-and-master--how-orchestration-works)
- [What is a Node? (more detail)](#what-is-a-node-more-detail)
- [Container runtimes: Docker, containerd, CRI-O, and others](#container-runtimes-docker-containerd-cri-o-and-others)
- [Pods, Deployments, Services](#pods-deployments-services)
- [The `kubectl` command](#the-kubectl-command)
- [Tiny example (YAML + apply)](#tiny-example-yaml--apply)
- [Run Kubernetes on your laptop](#run-kubernetes-on-your-laptop)
- [See also](#see-also)

---

## Why Kubernetes exists

**One server** with **`docker run`** is simple. **Many servers** and **many apps** need:

- **Scheduling** — which container runs **where**
- **Scaling** — more copies when **load** is high
- **Healing** — **restart** or **replace** failed containers
- **Networking** — stable **names** and **load balancing** between parts of your app
- **Updates** — **rolling** deploys with less downtime

Kubernetes gives you **one way** to do that, with a **large ecosystem** (tools, cloud services, training).

**Orchestration overview (Swarm vs K8s vs Mesos):** [15_orchestrate.md](15_orchestrate.md).

---

## How it connects to Docker

- Kubernetes runs **containers** from **images**.
- Images are often **built with Docker** (`docker build`) and **pushed** to a **registry** — same idea as in [10_registry.md](10_registry.md).
- On the cluster, the **container runtime** (often **containerd** today, not always the `docker` daemon inside every node) **pulls** the image and **starts** the container.
- So: you still **package** apps as **images**; Kubernetes **orchestrates** **where** and **how many** they run.

---

## Big ideas: cluster, nodes, control plane

| Word | Plain meaning |
|------|----------------|
| **Cluster** | Your **Kubernetes** installation — **one** logical system made of **many** computers (physical or VMs). |
| **Node** | **One machine** in the cluster. **Worker nodes** run your **workloads**. **Control plane** nodes run the **brains** (API server, scheduler, etc.). On small clusters, **control plane** and **workers** can be combined (for learning). |
| **Control plane** | Decides **what** should run and **talks** to nodes to make it happen. You usually **do not** SSH into it for daily app work — you use **`kubectl`**. |

---

## Control plane and "master" — how orchestration works

### "Master" vs control plane

Older books and blog posts say **master** for the machines that run the **brains** of the cluster. **Today** the official word is **control plane** (same idea, clearer naming). **Worker** nodes are **not** the control plane — they run **your** apps.

**Control plane** = the part that **stores** what you **want**, **decides** **where** Pods go, and **keeps fixing** drift (crashes, scaling, updates).

### Main pieces (names you will see)

| Piece | Plain job |
|-------|-----------|
| **kube-apiserver** (**API server**) | The **front door**. **`kubectl`**, dashboards, and other tools talk to **this**. It **validates** requests and **saves** the **desired state** (what you asked for). |
| **etcd** | A small **database** that stores **cluster state** — what **Deployments**, **Pods**, **Secrets**, etc. **should** exist. **Very important** — losing **etcd** without backup is bad. |
| **kube-scheduler** | Watches for **new** Pods **without** a node yet. **Picks** a **worker** that fits **CPU/RAM** and **rules** (taints, affinity, …). |
| **kube-controller-manager** | Runs **controllers** — loops that **compare** “**wanted**” vs “**actual**” and **fix** gaps. Example: **Deployment** controller sees “**want 3** replicas, **have 2**” → **creates** another Pod. |
| **cloud-controller-manager** | On **AWS / Azure / GCP**, hooks for **load balancers**, **routes**, **volumes** — optional on bare metal. |

On a **big** cluster these can be **several** machines for **high availability**. On **minikube** / **Docker Desktop**, they are **hidden** inside **one** node.

### How orchestration happens (simple story)

1. You run **`kubectl apply -f deployment.yaml`**. The **API server** **accepts** it and **writes** the **Deployment** (and what it **means**) into **etcd**.
2. **Controllers** read that **desired state**. The **Deployment** controller sees: “**three** Pod copies needed.” It **creates** **Pod** objects that are **not** yet **scheduled**.
3. The **scheduler** **assigns** each **Pod** to a **worker** node and **writes** “run on **Node B**” into the **API** (stored in **etcd**).
4. **kubelet** on **Node B** **watches** the API for “**my** Pods,” **pulls** the **image**, and **starts** the **container** with the **runtime** (**containerd** / **CRI-O**).
5. If a **container** **dies**, **kubelet** **restarts** it. If a **whole node** **dies**, **controllers** see **missing** Pods and **schedule** **new** ones on **healthy** nodes.

So **orchestration** here means: **store** intent → **schedule** work → **run** on workers → **continuously reconcile** when reality changes.

---

## What is a Node? (more detail)

In **Kubernetes**, a **Node** is **one computer** (physical server or VM) that is **joined** to the cluster.

- **Worker node** — runs your **application** **Pods**. On each worker you typically find:
  - **`kubelet`** — small agent that **talks** to the control plane and **starts/stops** containers on **this** machine.
  - **Container runtime** — software that **actually runs** the container (see [next section](#container-runtimes-docker-containerd-cri-o-and-others)).
  - **`kube-proxy`** — helps with **network** rules for **Services** on that node.

- **Control plane node** (or **control plane** spread across machines) — runs the **API server**, **scheduler**, **controllers**, **etcd** (the cluster’s **data store**), etc. That is **not** where your app containers usually run in a **big** cluster; on a **single-node** learning cluster, **everything** can live on **one** node.

When you run **`kubectl get nodes`**, each **line** is **one** Node (one machine in the pool).

---

## Container runtimes: Docker, containerd, CRI-O, and others

**Kubernetes does not “run Docker” inside the cluster the same way you run `docker run` on your laptop.** The **kubelet** on each node talks to a **container runtime** through a **standard API** called the **CRI** (**Container Runtime Interface**). That runtime **pulls** the **image** and **creates** the container.

| Runtime | In simple words | Where you often see it |
|---------|-----------------|-------------------------|
| **containerd** | A **CNCF** project: a **daemon** that runs **containers** and **pulls** **OCI** images. **Stable** and **very common** on Linux nodes. | **Default** on many cloud and on-prem clusters. **Docker Desktop** and **Docker Engine** also use **containerd** under the hood today for **running** containers. |
| **CRI-O** | A **light** runtime **built for Kubernetes** and **CRI** from day one. **OCI**-compatible images. | Common in **Red Hat** / **OpenShift** style setups. |
| **Docker Engine** (the **`docker` daemon**) | Used to be wired into Kubernetes through a **shim**. **Modern** Kubernetes expects a **CRI** runtime directly (**containerd** or **CRI-O**). You still use **`docker build`** and **`docker push`** on your **dev machine** — that does **not** mean each **node** must run the **Docker daemon** for **Pods**. |

**Other** runtimes (less “default 101”, but real): **Kata Containers** (stronger isolation with **lightweight VMs**), **gVisor** (user-space kernel), etc. — used when **security** or **policy** needs more than a **normal** Linux container.

**Short line:** **Node** = **machine** in the cluster. **containerd** or **CRI-O** = what often **starts** your **Pod** containers. **Docker** = still **#1** for **building** and **pushing** **images** in many teams.

More on **Docker Engine** vs **containers**: [11_engine.md](11_engine.md).

---

## Pods, Deployments, Services

These names show up in **every** tutorial.

| Word | Plain meaning |
|------|----------------|
| **Pod** | The **smallest deployable unit** in Kubernetes. Usually **one** main container (sometimes **sidecar** containers in the same Pod). Pods share **network** (same IP inside the Pod) and **storage** rules. |
| **Deployment** | **Declares** “I want **N** copies of **this** Pod template.” Kubernetes **creates** Pods and **replaces** them if a node dies. **Rolling updates** are tied to Deployments. |
| **Service** | A **stable name** and **IP/DNS** inside the cluster that **points to** a **set** of Pods (load balancing across them). Other parts of your app call the **Service name**, not one Pod’s IP. |

**Namespace** — a **folder-like** split inside one cluster (for example `dev` vs `prod`). Optional for your first hour; important later for **teams** and **RBAC**.

---

## The `kubectl` command

**`kubectl`** is the **CLI** you use to talk to the cluster **API**.

```bash
# See nodes (machines) that joined the cluster
kubectl get nodes

# See pods in the default namespace
kubectl get pods

# See everything common in one namespace
kubectl get all
```

More commands appear in the official **kubectl** cheat sheet (linked below).

---

## Tiny example (YAML + apply)

**Goal:** run **one** **nginx** Pod from a public image.

**1) Save** this as `pod.yaml` (example only):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: demo-nginx
spec:
  containers:
    - name: nginx
      image: nginx:alpine
```

**2) Send** it to the cluster:

```bash
kubectl apply -f pod.yaml
```

**3) Check:**

```bash
kubectl get pods
kubectl describe pod demo-nginx
```

**4) Delete** when done:

```bash
kubectl delete -f pod.yaml
```

In **real** projects you almost always use a **Deployment** (not a bare **Pod**) so Kubernetes **restarts** failed containers and **scales** replicas. The pattern is the same: **YAML** + **`kubectl apply`**.

---

## Run Kubernetes on your laptop

You need **a cluster** to practice. Common **local** options:

| Tool | Idea |
|------|------|
| **minikube** | Runs a **small Kubernetes** in a VM or container on your PC. |
| **kind** (Kubernetes in Docker) | Runs cluster **nodes** as **Docker containers** on your machine. |
| **Docker Desktop** | Can **enable** Kubernetes for a **single-node** cluster (good for **trying** `kubectl`). |

Follow the install page for your OS on [kubernetes.io](https://kubernetes.io/docs/tasks/tools/).

---

## See also

- **Orchestration comparison:** [15_orchestrate.md](15_orchestrate.md)
- **Docker images and registry:** [7_images.md](7_images.md), [10_registry.md](10_registry.md)
- **Docker Engine (runtime ideas):** [11_engine.md](11_engine.md)
- **Official Kubernetes documentation:** [https://kubernetes.io/docs/home/](https://kubernetes.io/docs/home/)
- **kubectl quick reference:** [https://kubernetes.io/docs/reference/kubectl/quick-reference/](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
