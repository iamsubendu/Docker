# Docker Demos

Hands-on examples to practice Docker concepts.

> **Note:** For definitions of terms and flags (STDIN, TTY, -it, etc.), see [5_terminology.md](5_terminology.md)

---

## Demo 1: Pull and Explore CentOS

Learn to pull an image, run an interactive container, and explore the OS.

**1. Pull CentOS 7.9 image**

```bash
docker pull centos:centos7.9.2009
```

| Part              | Meaning                           |
| ----------------- | --------------------------------- |
| `docker pull`     | Download an image from Docker Hub |
| `centos`          | Image name                        |
| `:centos7.9.2009` | Tag (specific version)            |

Expected output:

```
centos7.9.2009: Pulling from library/centos
2d473b07cdd5: Pull complete
Digest: sha256:be65f488b776...
Status: Downloaded newer image for centos:centos7.9.2009
docker.io/library/centos:centos7.9.2009
```

**2. Run container interactively with bash**

```bash
docker run -it centos:centos7.9.2009 bash
```

| Part                    | Meaning                                |
| ----------------------- | -------------------------------------- |
| `docker run`            | Create and start a new container       |
| `-i`                    | Interactive mode (keep STDIN open)     |
| `-t`                    | Allocate a pseudo-TTY (terminal)       |
| `-it`                   | Combined: interactive terminal session |
| `centos:centos7.9.2009` | Image to use                           |
| `bash`                  | Command to run inside container        |

Expected output:

```
[root@be65f488b776 /]#
```

- Your terminal switches into the container shell
- The prompt shows `root@<container_id>`

**3. Inside the container, explore**

**Check OS release info:**

```bash
cat /etc/*release*
```

Expected output:

```
CentOS Linux release 7.9.2009 (Core)
NAME="CentOS Linux"
VERSION="7 (Core)"
ID="centos"
ID_LIKE="rhel fedora"
VERSION_ID="7"
PRETTY_NAME="CentOS Linux 7 (Core)"
...
```

---

**Check what user you are:**

```bash
whoami
```

Expected output:

```
root
```

---

**See running processes:**

```bash
ps aux
```

Expected output:

```
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.0  11828  1892 pts/0    Ss   12:00   0:00 bash
root        15  0.0  0.0  51732  1700 pts/0    R+   12:01   0:00 ps aux
```

Notice: Only 2 processes running — `bash` (PID 1) and `ps` itself. Containers are minimal!

---

**Check hostname (container ID):**

```bash
hostname
```

Expected output:

```
be65f488b776
```

The hostname is the container ID.

**4. Exit the container**

```bash
exit
```

Expected output:

```
exit
user@host:~$
```

The container stops when you exit because the main process (bash) ends.

**5. Verify container stopped**

```bash
docker ps -a
```

| Part        | Meaning                                      |
| ----------- | -------------------------------------------- |
| `docker ps` | List containers                              |
| `-a`        | Show ALL containers (including stopped ones) |

Expected output:

```
CONTAINER ID   IMAGE                      COMMAND   CREATED          STATUS                     PORTS   NAMES
be65f488b776   centos:centos7.9.2009      "bash"    2 minutes ago    Exited (0) 5 seconds ago           eager_darwin
```

- `Exited (0)` means it stopped normally (exit code 0 = success)
- The container still exists but is stopped

---

## Demo 2: Detached Mode with Sleep Task

Understand how containers run in the background and exit when their task completes.

**1. Run container in detached mode**

```bash
docker run -d centos:centos7.9.2009 sleep 30
```

| Part       | Meaning                                                  |
| ---------- | -------------------------------------------------------- |
| `-d`       | Detached mode (run in background, don't attach terminal) |
| `sleep 30` | Command to run (sleep for 30 seconds then exit)          |

Expected output:

```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

Returns the full container ID. The container is now running in background.

**2. Check running containers**

```bash
docker ps
```

Expected output:

```
CONTAINER ID   IMAGE                     COMMAND      CREATED          STATUS          PORTS   NAMES
a1b2c3d4e5f6   centos:centos7.9.2009     "sleep 30"   5 seconds ago    Up 4 seconds            quirky_tesla
```

**3. Wait 30 seconds, then check again**

```bash
docker ps
```

Expected output:

```
CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES
```

Empty — container finished and exited.

```bash
docker ps -a
```

Expected output:

```
CONTAINER ID   IMAGE                     COMMAND      CREATED          STATUS                      PORTS   NAMES
a1b2c3d4e5f6   centos:centos7.9.2009     "sleep 30"   45 seconds ago   Exited (0) 15 seconds ago           quirky_tesla
```

`Exited (0)` means the sleep command completed successfully.

---

## Demo 3: Run a Web Server (Nginx)

Deploy a simple web server and access it from your browser.

**1. Pull and run Nginx**

```bash
docker run -d --name my-nginx -p 8080:80 nginx
```

| Part              | Meaning                                          |
| ----------------- | ------------------------------------------------ |
| `--name my-nginx` | Assign custom name to container                  |
| `-p 8080:80`      | Port mapping: host port 8080 → container port 80 |

Expected output:

```
Unable to find image 'nginx:latest' locally
latest: Pulling from library/nginx
a2abf6c4d29d: Pull complete
...
Digest: sha256:c26ae7472d624ba1fafd296e73cecc4f93f853088e6a9c13c0d52f6ca5865107
Status: Downloaded newer image for nginx:latest
f8d9a7b6c5e4d3c2b1a0987654321fedcba098765432
```

**2. Verify container is running**

```bash
docker ps
```

Expected output:

```
CONTAINER ID   IMAGE   COMMAND                  CREATED          STATUS          PORTS                  NAMES
f8d9a7b6c5e4   nginx   "/docker-entrypoint.…"   10 seconds ago   Up 9 seconds    0.0.0.0:8080->80/tcp   my-nginx
```

**3. Access in browser**

Open http://localhost:8080

Expected: Nginx welcome page with "Welcome to nginx!" heading.

**4. View logs**

```bash
docker logs my-nginx
```

| Part          | Meaning                     |
| ------------- | --------------------------- |
| `docker logs` | Fetch logs from a container |
| `my-nginx`    | Container name (or ID)      |

Expected output:

```
/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration
/docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/
...
2024/01/15 12:00:00 [notice] 1#1: start worker processes
```

```bash
docker logs -f my-nginx
```

| Part | Meaning                                        |
| ---- | ---------------------------------------------- |
| `-f` | Follow mode (stream logs live, like `tail -f`) |

Press `Ctrl+C` to stop following.

**5. Explore inside the container**

```bash
docker exec -it my-nginx bash
```

| Part          | Meaning                              |
| ------------- | ------------------------------------ |
| `docker exec` | Run a command in a RUNNING container |

Expected output:

```
root@f8d9a7b6c5e4:/#
```

Inside the container:

```bash
ls /usr/share/nginx/html/
```

Expected output:

```
50x.html  index.html
```

```bash
cat /usr/share/nginx/html/index.html
```

Expected output:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Welcome to nginx!</title>
    ...
  </head>
</html>
```

```bash
exit
```

**6. Stop and cleanup**

```bash
docker stop my-nginx
```

| Part          | Meaning                                                              |
| ------------- | -------------------------------------------------------------------- |
| `docker stop` | Stop a running container (sends SIGTERM, then SIGKILL after timeout) |

Expected output:

```
my-nginx
```

```bash
docker rm my-nginx
```

| Part        | Meaning                    |
| ----------- | -------------------------- |
| `docker rm` | Remove a stopped container |

Expected output:

```
my-nginx
```

---

## Demo 4: Environment Variables

Pass configuration to containers using environment variables.

**1. Run with environment variables**

```bash
docker run -it --rm -e MY_NAME=Docker -e MY_ENV=development alpine sh
```

| Part           | Meaning                                      |
| -------------- | -------------------------------------------- |
| `--rm`         | Automatically remove container when it exits |
| `-e VAR=value` | Set environment variable                     |
| `alpine`       | Lightweight Linux image (~5MB)               |
| `sh`           | Shell command (alpine doesn't have bash)     |

Expected output:

```
/ #
```

You're now inside an Alpine container with env vars set.

**2. Inside the container, check the variables**

```bash
echo "Hello, $MY_NAME!"
```

Expected output:

```
Hello, Docker!
```

```bash
echo "Environment: $MY_ENV"
```

Expected output:

```
Environment: development
```

```bash
env | grep MY_
```

Expected output:

```
MY_NAME=Docker
MY_ENV=development
```

```bash
exit
```

Container is automatically removed (`--rm` flag).

---

## Quick Cleanup Commands

After practicing, clean up all demo resources:

**Stop all running containers**

```bash
docker stop $(docker ps -q)
```

| Part              | Meaning                                 |
| ----------------- | --------------------------------------- |
| `$(docker ps -q)` | Subshell: get IDs of running containers |
| `-q`              | Quiet mode (only IDs)                   |

Expected output: Lists all stopped container IDs (or nothing if none running).

**Remove all containers**

```bash
docker rm $(docker ps -aq)
```

| Part | Meaning |
|------|---------|
| `-aq` | `-a` (all) + `-q` (quiet) = IDs of all containers |

Expected output: Lists all removed container IDs.

**Remove demo images**

```bash
docker rmi centos:centos7.9.2009 nginx alpine python:3.11-slim python:3.11-alpine
```

Expected output:

```
Untagged: centos:centos7.9.2009
Deleted: sha256:...
Untagged: nginx:latest
Deleted: sha256:...
...
```

**Remove unused volumes**

```bash
docker volume prune
```

Expected output:

```
WARNING! This will remove anonymous local volumes not used by at least one container.
Are you sure you want to continue? [y/N] y
Deleted Volumes:
my-data
...
Total reclaimed space: 50MB
```

**Remove unused networks**

```bash
docker network prune
```

Expected output:
```
WARNING! This will remove all custom networks not used by at least one container.
Are you sure you want to continue? [y/N] y
Deleted Networks:
my-network
...
```

**Remove build cache**

```bash
docker builder prune
```

| Part | Meaning |
|------|---------|
| `docker builder prune` | Remove build cache (can be huge!) |

Expected output:
```
WARNING! This will remove all dangling build cache.
Are you sure you want to continue? [y/N] y
Deleted build cache objects:
...
Total reclaimed space: 14.94GB
```

To remove ALL build cache (not just dangling):

```bash
docker builder prune -a
```

Expected output:
```
WARNING! This will remove all build cache.
Are you sure you want to continue? [y/N] y
Deleted build cache objects:
...
Total reclaimed space: 14.94GB
```

**Nuclear option: remove everything unused**

```bash
docker system prune -a --volumes
```

| Part                  | Meaning                       |
| --------------------- | ----------------------------- |
| `docker system prune` | Remove all unused Docker data |
| `--volumes`           | Also remove unused volumes    |

Expected output:

```
WARNING! This will remove:
  - all stopped containers
  - all networks not used by at least one container
  - all volumes not used by at least one container
  - all images without at least one container associated to them
  - all build cache

Are you sure you want to continue? [y/N] y
Deleted Containers:
...
Deleted Networks:
...
Deleted Volumes:
...
Deleted Images:
...
Total reclaimed space: 2.5GB
```

**Check disk usage**

```bash
docker system df
```

| Part               | Meaning                |
| ------------------ | ---------------------- |
| `docker system df` | Show Docker disk usage |

Expected output:

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          5         2         1.2GB     800MB (66%)
Containers      3         1         50MB      30MB (60%)
Local Volumes   2         1         100MB     50MB (50%)
Build Cache     10        0         500MB     500MB (100%)
```
