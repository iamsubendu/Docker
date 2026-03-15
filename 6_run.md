# Run

---

```bash
docker run redis
```

- Gets the latest image if not available locally and starts it

```bash
docker run redis:4.0
```

- Gets a specific version and runs it

Docker doesn't listen to standard input because it runs in non-interactive mode. For interactive mode, add the `-i` parameter.

```bash
docker run -i kodekloud/simple-prompt-docker
```

To attach to the Docker pseudo-terminal, use `-t` as well.

```bash
docker run -it kodekloud/simple-prompt-docker
```

## PORT Mapping

```bash
docker run kodekloud/webapp
```

- The app runs on **http://0.0.0.0:5000/** inside the container. That address is not reachable from your browser until you map a host port (e.g. `-p 80:5000`).

To expose it on the host:

```bash
docker run -p 80:5000 kodekloud/webapp
```

- Host port 80 → container port 5000. Access on the same machine: **http://localhost**. From another device, use **http://YOUR_IP** (e.g. 192.168.1.5).
- Check your IP with `ipconfig` (Windows) or `ip a` (Linux).
- You can run multiple instances and map them to different host ports.
- You cannot map two containers to the same host port.

## Volume Mapping

```bash
docker run mysql
```

- When you run MySQL and add data, it is stored in `/var/lib/mysql` inside the container.
- As soon as you stop and remove the container, all that data is lost.

```bash
docker stop mysql
docker rm mysql
```

To persist data, map a host directory into the container:

```bash
docker run -v /opt/datadir:/var/lib/mysql mysql
```

- Data is stored in the host directory `/opt/datadir` and persists even if you remove the container.

## Inspect Container

To list running containers:

```bash
docker ps
```

To get detailed information about a container:

```bash
docker inspect <container_id_or_name>
```

- Returns data about that container in JSON format.

## Container Logs

```bash
docker run -d <image>
```

- Runs the container in detached mode (background).

```bash
docker logs <container_id_or_name>
```

- View logs for that container.

## Demo

**Get exact OS version**

When you run an image, you often want to know the **exact OS version** inside the container (e.g. Ubuntu 22.04, Debian 11). The release info is in files under `/etc/` such as `os-release`, `lsb-release`.

**Why use `sh -c "..."` or `bash -c "..."`?**

- If you run `docker run ubuntu cat /etc/*release*`, Docker runs only `cat` with the literal path `/etc/*release*`. The `*` is a glob and is expanded by a **shell**; `cat` does not expand it, so you get "No such file or directory".
- By running `sh -c "cat /etc/*release*"`, the **shell** runs inside the container, expands `*release*` to the real file names, then runs `cat` on those files.

**Commands:**

```bash
docker run ubuntu sh -c "cat /etc/*release*"
```

Or, if the image has bash:

```bash
docker run ubuntu bash -c "cat /etc/*release*"
```

- **`sh -c "..."`** — run the quoted string as a command in the default shell (`sh`). Works in minimal images (e.g. Alpine, Ubuntu).
- **`bash -c "..."`** — same idea but using bash. Use when the image has bash (e.g. Ubuntu, CentOS).
- The container starts, runs the command, prints the output, then exits. You see the OS name and version (e.g. `PRETTY_NAME="Ubuntu 22.04.x LTS"`).

**To check a specific image version**, use the image tag:

```bash
docker run ubuntu:<tag> bash -c "cat /etc/*release*"
```

Example: `docker run ubuntu:22.04 bash -c "cat /etc/*release*"`

---

**Run a command for a fixed time (e.g. sleep):**

```bash
docker run ubuntu sleep 15
```

- You stay attached to the container; it exits after 15 seconds. You cannot exit earlier while it is running.
- To stop it from another terminal: `docker stop <container_id_or_name>`.

**To run in the background (detached mode), use `-d`:**

```bash
docker run -d ubuntu sleep 15
```

- The container runs in the background. You get the prompt back immediately. Use `docker ps` to see it, `docker stop <container_id_or_name>` to stop it.

**To attach to the container again** (see its output in your terminal):

```bash
docker attach <container_id_or_name>
```
