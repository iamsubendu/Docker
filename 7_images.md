# Docker images

## What am I containerizing?

You are containerizing **whatever your application needs to run**:

- **Your code** — the app (e.g. Python/Node/Go app, static site, script).
- **Runtime** — the engine that runs it (e.g. Python 3.11, Node 18, OpenJDK 17).
- **Dependencies** — libraries, packages, system tools (e.g. `requirements.txt`, `package.json`, apt packages).
- **Config** — environment variables, config files (optional; can be passed at run time with `-e` or volumes).

**Before you start, decide:**

- **Base image** — which official or custom image to start from (e.g. `python:3.11-slim`, `node:18-alpine`, `ubuntu:22.04`).
- **What to copy** — which files or folders from your machine go into the image.
- **What runs** — the command that starts your app (e.g. `python app.py`, `npm start`).

**Examples of what you might containerize:** a web app, an API, a worker/script, a database (usually use an official image), or a small CLI tool.

---

## How to create my own image?

**1. Create a Dockerfile** in your project directory. It describes the image (base image, files to copy, commands to run).

**Layers:** Every instruction in the Dockerfile creates a **layer** when you build. The image is a stack of read-only layers; each instruction adds one. Docker caches each layer. If an instruction and everything before it are unchanged, Docker reuses the cached layer instead of rebuilding it. **Caching layers helps you rebuild faster each time** — only changed layers (and the ones after them) are rebuilt.

**Example — order and caching:**

```dockerfile
# Layer 1: base image
FROM node:18-alpine
WORKDIR /app

# Layer 2: copy only package files
COPY package.json package-lock.json ./
# Layer 3: install dependencies (expensive; rarely changes)
RUN npm ci

# Layer 4: copy the rest of the app (changes often)
COPY . .

CMD ["node", "index.js"]
```

- If you **only change your app code** (e.g. `index.js`), Docker reuses the cached layers for `FROM`, `WORKDIR`, `COPY package*.json`, and `RUN npm ci`. It only rebuilds from `COPY . .` onward. Builds stay fast.
- If you had put `COPY . .` first and then `RUN npm ci`, then **any** code change would invalidate the cache and force `npm ci` to run again every time, which is slow.

**Example (Node.js):**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["node", "index.js"]
```

Or with `npm start`: use `CMD ["npm", "start"]`. If your app listens on a port (e.g. 3000), add `EXPOSE 3000`.

**What `COPY . .` means**

- First **`.`** — source on the **host**: the build-context directory (e.g. your project folder). “Everything from here.”
- Second **`.`** — destination in the **image**: the current working directory set by `WORKDIR` (e.g. `/app`). “Copy into here.”
- So `COPY . .` means: copy all files from the build context into the image’s working directory (e.g. your app code into `/app`).

**2. Build the image:**

```bash
docker build -t my-app:1.0 .
```

Or, if your Dockerfile has another name or path:

```bash
docker build . -f Dockerfile -t appName
```

| Part            | Meaning                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.`             | Build context — directory sent to the Docker daemon (usually the folder with your app and Dockerfile).                                                                   |
| `-f Dockerfile` | Use this file as the Dockerfile (e.g. `Dockerfile`, `Dockerfile.dev`, or `./backend/Dockerfile`). If omitted, Docker looks for a file named `Dockerfile` in the context. |
| `-t appName`    | Tag the built image as `appName` (you can add a version: `-t appName:1.0`).                                                                                              |

- `-t my-app:1.0` — name and tag for the image.
- `.` — build context (current directory when Dockerfile is named `Dockerfile` and in the current folder).

**3. Push the image to a registry** (e.g. Docker Hub) so others or other machines can pull it:

```bash
# Tag the image for your registry (replace yourusername with your Docker Hub username)
docker tag my-app:1.0 yourusername/my-app:1.0

# Log in to the registry (Docker Hub)
docker login

# Push the image
docker push yourusername/my-app:1.0
```

| Step           | Meaning                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------- |
| `docker tag`   | Create a tag that includes the registry (e.g. `yourusername/my-app:1.0` for Docker Hub).     |
| `docker login` | Log in to the registry so you can push (you’ll be prompted for username and password).       |
| `docker push`  | Upload the image to the registry. Others can then run `docker pull yourusername/my-app:1.0`. |

**4. Run a container from your image:**

```bash
docker run -p 8080:5000 my-app:1.0
```

Or, after pushing, from any machine: `docker pull yourusername/my-app:1.0` then `docker run -p 8080:5000 yourusername/my-app:1.0`.

**Common Dockerfile instructions:**

| Instruction | Purpose                                            |
| ----------- | -------------------------------------------------- |
| `FROM`      | Base image (e.g. `python:3.11`, `node:18-alpine`)  |
| `WORKDIR`   | Working directory inside the container             |
| `COPY`      | Copy files from host into the image                |
| `RUN`       | Run a command during build (e.g. install packages) |
| `CMD`       | Default command when the container starts          |
| `EXPOSE`    | Document which port the app uses (optional)        |
| `ENV`       | Set environment variables in the image             |

**Setting environment variables**

**In the Dockerfile (baked into the image):**

```dockerfile
ENV NODE_ENV=production
ENV API_PORT=3000
# or multiple in one line
ENV NODE_ENV=production API_PORT=3000
```

Use for values that are the same for every run of this image.

**When you run the container (override or add at run time):**

```bash
docker run -e NODE_ENV=production -e API_PORT=3000 my-app:1.0
```

Or from a file (e.g. for secrets or many variables):

```bash
docker run --env-file .env my-app:1.0
```

- `-e VAR=value` — set one variable; can be repeated.
- `--env-file .env` — load all `VAR=value` lines from the file. Values set with `-e` override ones from `--env-file`.

**View env vars for a container:** use `docker inspect` and look at the config:

```bash
docker inspect <container_id_or_name>
```

For only the env section:

```bash
docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' <container_id_or_name>
```

## CMD vs ENTRYPOINT

Both tell Docker what to run when the container starts. The main difference:

- **CMD:** The command-line parameters you pass to `docker run` **replace the CMD entirely**.
- **ENTRYPOINT:** The command-line parameters you pass to `docker run` **get appended** (as arguments to ENTRYPOINT).

**Example — same image, different behavior:**

**Case 1: Dockerfile with CMD only (no ENTRYPOINT)**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
CMD ["python", "app.py"]
```

Build and run:

```bash
docker build -t myimg .
docker run myimg
# Runs: python app.py   (uses CMD as-is)

docker run myimg python other.py
# Runs: python other.py   (your args replace CMD entirely — CMD is ignored)

docker run myimg sleep 5
# Runs: sleep 5   (same idea — your command replaces CMD entirely; container runs 5 seconds then exits)
```

**Case 2: Dockerfile with ENTRYPOINT and CMD**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
ENTRYPOINT ["python"]
CMD ["app.py"]
```

Build and run:

```bash
docker build -t myimg .
docker run myimg
# Runs: python app.py   (ENTRYPOINT + CMD)

docker run myimg other.py
# Runs: python other.py   (ENTRYPOINT stays; "other.py" is appended as argument — CMD is replaced by your args)

docker run myimg sleep 5
# Runs: python sleep 5   (ENTRYPOINT stays; "sleep" and "5" are appended — so Python runs with args "sleep" and "5", which is usually not what you want)
```

So: with **CMD only**, CLI args **replace** the default (e.g. `docker run myimg sleep 5` really runs `sleep 5`). With **ENTRYPOINT**, CLI args are **appended** to the executable (e.g. `docker run myimg sleep 5` runs `python sleep 5`).

---

**CMD — default command (easy to override)**

- **What it is:** The default command that runs when you start the container. “If the user doesn’t say what to run, run this.”
- **Exec form:** `CMD ["python", "app.py"]` — first item is the **command** (executable), the rest are **arguments**. So this runs `python` with `app.py`.
- **CLI params replace entirely:** Anything you put after the image name **replaces** the whole CMD.
  - `docker run myimg` → runs `python app.py` (the CMD).
  - `docker run myimg python other.py` → runs `python other.py` (your command replaces CMD).
- **Use when:** You want a sensible default but still allow users to run something else (e.g. a different script, or a shell).

---

**ENTRYPOINT — fixed executable (arguments get appended)**

- **What it is:** The executable that **always** runs. The user cannot replace it by passing a command; whatever they pass is **appended** as arguments to this executable.
- **CLI params get appended:** Only with `--entrypoint` can you change the executable. Normal `docker run myimg something` keeps ENTRYPOINT and passes `something` as an argument.
  - `ENTRYPOINT ["python"]` and `CMD ["app.py"]` → `docker run myimg` runs `python app.py`.
  - `docker run myimg other.py` runs `python other.py` (your `other.py` is **appended** to `python`).
- **Use when:** The image is a single “tool” and you always want the same program (e.g. always `python` or `node`), but allow different arguments (e.g. different scripts).

---

**Summary**

|                | CMD                                      | ENTRYPOINT                                      |
|----------------|------------------------------------------|-------------------------------------------------|
| Role           | Default command (and its arguments)      | Fixed executable; user input = extra arguments  |
| Override       | Yes — `docker run img <cmd>` replaces it | No — use `--entrypoint` to change it            |
| With the other | CMD arguments are passed to ENTRYPOINT   | ENTRYPOINT runs first; CMD gives default args   |

**Why the container exits**

When you run `docker run ubuntu`, then `docker ps` shows nothing; `docker ps -a` shows an exited container. Containers are not meant to run a full OS — they run a **single process**. When that process ends (e.g. the default `bash` exits, or your app finishes), the container exits. The container stays running only while the main process inside it is running. If a web service inside the container crashes, the container exits too.
