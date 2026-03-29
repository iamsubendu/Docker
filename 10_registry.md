# Docker Registry

Store and share Docker images using registries like Docker Hub, GHCR, or a private registry.

## Table of Contents

- [What is a Docker registry?](#what-is-a-docker-registry)
- [Common registries](#common-registries)
- [Image naming and tags](#image-naming-and-tags)
- [Login and logout](#login-and-logout)
- [Push to Docker Hub (step-by-step)](#push-to-docker-hub-step-by-step)
- [Pull and run from a registry](#pull-and-run-from-a-registry)
- [Private repositories](#private-repositories)
- [Tagging strategy (practical)](#tagging-strategy-practical)
  - [`docker tag` and `docker push` (explained)](#docker-tag-and-docker-push-explained)
  - [Other registry-related commands](#other-registry-related-commands)
- [Troubleshooting](#troubleshooting)

---

## What is a Docker registry?

A **Docker registry** is a server that stores Docker images.

| Term           | Meaning                                                                |
| -------------- | ---------------------------------------------------------------------- |
| **Registry**   | Service that stores images (e.g. Docker Hub).                          |
| **Repository** | A named collection of image versions (tags), like `myuser/voting-app`. |
| **Tag**        | A label for a version, like `v1.0.0`, `latest`, `dev`.                 |

Think of it like Git hosting:

- GitHub stores your code repositories
- A Docker registry stores your image repositories

**Pull / push vs Engine:**

```
  +--------------------------+              +--------------------------+
  | Docker Engine (host)     |              | Registry                 |
  |                          | pull         | (Docker Hub / GHCR /     |
  | dockerd                  |<------------ | ECR / ...)               |
  |                          | push         |                          |
  |                          |------------> |                          |
  +--------------------------+              +--------------------------+
```

`docker pull` asks the **daemon** to fetch layers from the registry; `docker push` uploads local image data the daemon manages.

---

## Common registries

| Registry                             | Example image name                                          |
| ------------------------------------ | ----------------------------------------------------------- |
| **Docker Hub**                       | `myuser/voting-app:1.0.0`                                   |
| **GitHub Container Registry (GHCR)** | `ghcr.io/myorg/voting-app:1.0.0`                            |
| **AWS ECR**                          | `<account>.dkr.ecr.<region>.amazonaws.com/voting-app:1.0.0` |
| **Self-hosted registry**             | `registry.mycompany.com/voting-app:1.0.0`                   |

---

## Image naming and tags

General format:

```text
[registry/][namespace/]repository:tag
```

### Full name: `docker.io/library/nginx:alpine`

Read it **left to right** — each piece has a role:

| Part            | What it is                                                                                                                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`docker.io`** | **Registry** — the host that stores images. `docker.io` is **Docker Hub**. If you omit the registry, Docker assumes `docker.io` when you use short names like `nginx`.                                                        |
| **`library`**   | **Namespace** (sometimes called _user_ or _account_ on Docker Hub). For **official, curated images**, Docker Hub uses the fixed namespace **`library`**. It is **not** a personal login — it is reserved for official images. |
| **`nginx`**     | **Repository** — the image name (one product, many tags). Often people say “the image” and mean this name plus a tag.                                                                                                         |
| **`:alpine`**   | **Tag** — a specific build or variant (`alpine`, `1.25`, `latest`, …).                                                                                                                                                        |

So in one line: **registry / namespace / repository : tag** → `docker.io` / `library` / `nginx` : `alpine`.

**Compared to a user image:** `docker.io/myuser/voting-app:1.0.0` uses the same pattern: registry `docker.io`, namespace **`myuser`** (your account or org), repository **`voting-app`**, tag **`1.0.0`**.

### Short names

Examples:

- `nginx:alpine` — short form; Docker fills in **`docker.io/library/`** → same as `docker.io/library/nginx:alpine`.
- `library/nginx:alpine` — still Docker Hub, namespace explicit; registry defaults to `docker.io`.
- `myuser/voting-app:1.0.0` — user/org repo on Docker Hub (implicit `docker.io`).
- `ghcr.io/myorg/worker:main-20260325` — full form with another registry (**GHCR**).

If you omit `:tag`, Docker uses `:latest`.

**Docker Hub namespace rules:**

- **`library/<image>`** — **official** images (curated by Docker / upstream maintainers).
- **`<username-or-org>/<image>`** — **your** account or **organization** repos (e.g. `myuser/voting-app`).

---

## Login and logout

```bash
# Login to Docker Hub (docker.io)
docker login

# Login to a specific registry (e.g. GitHub Container Registry)
docker login ghcr.io

# Logout — Docker Hub default
docker logout

# Logout — named registry only
docker logout ghcr.io
```

**When you need this**

| Situation                                                        | Need `docker login`?                                        |
| ---------------------------------------------------------------- | ----------------------------------------------------------- |
| **Pull** a **public** image (e.g. `nginx`, `redis`)              | **Usually no** — anonymous pull works for public repos.     |
| **Pull** from a **private** registry or a **private** repository | **Yes** — the registry must know who you are.               |
| **Push** an image (almost always to **your** namespace or org)   | **Yes** — publishing requires authentication.               |
| **Use** a private base image in a `Dockerfile` `FROM …`          | **Yes** — build must pull that layer with your credentials. |

So: **`docker login`** (to the right registry) is what you use when you need to **access a private registry** or **private images**, or when you **push**. **`docker logout`** removes saved credentials for that registry on your machine.

More detail on private repos and tokens: [Private repositories](#private-repositories).

---

## Push to Docker Hub (step-by-step)

Assume your Docker Hub username is `myuser` and local image is `voting-app:local`.

### 1) Build locally

```bash
docker build -t voting-app:local ./vote
```

### 2) Tag for the registry repo

```bash
docker tag voting-app:local myuser/voting-app:1.0.0
docker tag voting-app:local myuser/voting-app:latest
```

### 3) Login

```bash
docker login
```

### 4) Push

```bash
docker push myuser/voting-app:1.0.0
docker push myuser/voting-app:latest
```

### 5) Verify

```bash
docker pull myuser/voting-app:1.0.0
docker run --rm -p 5000:80 myuser/voting-app:1.0.0
```

---

## Pull and run from a registry

```bash
# Pull explicit version
docker pull myuser/voting-app:1.0.0

# Run
docker run -d --name vote -p 5000:80 myuser/voting-app:1.0.0
```

Use explicit version tags in production (`1.0.0`, commit SHA, date tag), not only `latest`.

---

## Private repositories

- Private images need authentication before `pull`/`push` — run **`docker login`** to the correct registry first (see [Login and logout](#login-and-logout)).
- CI/CD usually logs in using tokens (not passwords).
- Keep credentials in secret stores (GitHub Actions secrets, cloud secret manager, etc.).

Example (token-based login):

```bash
echo "$REGISTRY_TOKEN" | docker login -u "$REGISTRY_USER" --password-stdin
```

---

## Tagging strategy (practical)

Use at least two tags per release:

- Immutable tag: `1.4.2` or `sha-abc1234`
- Moving tag: `latest` (or `stable`, `main`)

Example:

```bash
docker tag myuser/voting-app:build-20260325 myuser/voting-app:1.4.2
docker tag myuser/voting-app:build-20260325 myuser/voting-app:latest
docker push myuser/voting-app:1.4.2
docker push myuser/voting-app:latest
```

This lets deployments pin exact versions while humans can still use a convenient moving tag.

### `docker tag` and `docker push` (explained)

Assume you already built (or pulled) an image and named it **`myuser/voting-app:build-20260325`**. That tag is just a **label** pointing at an **image ID** (a content hash). The filesystem layers are stored **once** on your machine.

**`docker tag SOURCE TARGET`**

- Adds **another name** for the **same** image — like a hard link or alias. It does **not** rebuild the image and does **not** duplicate layer data.
- **`SOURCE`** — an existing image reference (here: `myuser/voting-app:build-20260325`).
- **`TARGET`** — the new name you want (same registry/repo, different **tag**).

So the two `docker tag` lines mean: “this build is **also** known as **`1.4.2`** and **`latest`**.” After that, `docker images` shows three tags pointing at one image ID (unless you overwrote an old `latest`).

**`docker push NAME:TAG`**

- **Uploads** that tag’s image (its layers and manifest) to the **registry** you are logged into (`docker login`).
- You must **push each tag** you want on the server. Pushing `1.4.2` does **not** automatically push `latest` — they are separate labels unless they point to the same ID and you push both (as in the example).

**Order in practice:** `docker login` → `docker tag` (as needed) → `docker push` for each tag you want published.

### Other registry-related commands

| Command                                        | What it does                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **`docker build -t myuser/app:tag .`**         | Build an image from a `Dockerfile` and name it locally (does not upload).                                           |
| **`docker tag OLD NEW`**                       | Add another local name for an existing image (see above).                                                           |
| **`docker push myuser/app:tag`**               | Upload that tag to the registry (requires `docker login`).                                                          |
| **`docker pull myuser/app:tag`**               | Download that tag from the registry to your machine.                                                                |
| **`docker images`** (or **`docker image ls`**) | List local images; check tags and image IDs.                                                                        |
| **`docker rmi myuser/app:tag`**                | Remove a **local** tag (or image). Does not delete from the registry unless you use registry APIs or the host’s UI. |
| **`docker inspect myuser/app:tag`**            | Show metadata (env, layers, architecture, digest, …).                                                               |
| **`docker login` / `docker logout`**           | Store or remove credentials for pulls/pushes.                                                                       |

**Registry / Hub (browser):** deleting a tag or repo is usually done in **Docker Hub** (or GHCR, ECR, …) — not with a single `docker` subcommand for all providers.

---

## Troubleshooting

| Error                                                | Cause                                             | Fix                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `denied: requested access to the resource is denied` | Not logged in, wrong repo name, or no permission  | `docker login`; check `namespace/repo`; verify repo access                            |
| `unauthorized: authentication required`              | Missing/expired auth                              | Re-login or refresh token                                                             |
| `tag does not exist`                                 | You pushed a different tag than you tried to pull | `docker images`; pull exact existing tag                                              |
| Push is very slow                                    | Large layers                                      | Use smaller base image (`alpine` where appropriate), improve Dockerfile layer caching |

---

For Compose image usage, see [8_compose.md](8_compose.md). For the sample multi-service app flow, see [9_voting_app.md](9_voting_app.md). For how **`docker pull`** / **`docker push`** use Docker Engine, see [11_engine.md](11_engine.md).
