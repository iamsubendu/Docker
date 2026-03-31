# Getting Docker

## Prerequisites

| Platform    | Requirements                                                       |
| ----------- | ------------------------------------------------------------------ |
| **Ubuntu**  | 64-bit version of Ubuntu 20.04+, sudo access                       |
| **Mac**     | macOS 12+ (Monterey or newer), Apple Silicon or Intel chip         |
| **Windows** | Windows 10/11 64-bit (Pro, Enterprise, or Education), WSL2 enabled |

---

## Installation

### On Ubuntu

**Option 1:** Follow the official docs at https://docs.docker.com

**Option 2:** Run these commands:

```bash
# Update package index and install prerequisites
sudo apt-get update
sudo apt-get install -y ca-certificates curl

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**What you get (conceptual):** **`docker-ce`** is the **daemon** (Engine); **`docker-ce-cli`** is the **`docker`** client; **`containerd.io`** (and **`runc`**) are lower-level runtime pieces the daemon uses. The **REST API** is provided **by the daemon**, not a separate package — see [11_engine.md — Three components](11_engine.md#three-components-on-a-linux-install).

```
  docker-ce-cli ---- HTTP / socket ----> REST API ----> docker-ce
  (Docker CLI)                          (inside dockerd)  (daemon)
```

### On Mac

1. Download **Docker Desktop for Mac** from [docker.com](https://www.docker.com/products/docker-desktop/)
2. Double-click the `.dmg` file and drag Docker to Applications
3. Launch Docker Desktop from Applications
4. Wait for the whale icon in the menu bar to indicate Docker is running

### On Windows

1. Download **Docker Desktop for Windows** from [docker.com](https://www.docker.com/products/docker-desktop/)
2. Run the installer and follow the prompts
3. Enable **WSL2** when prompted (required for Linux containers)
4. Restart your computer if prompted
5. Launch Docker Desktop and wait for it to start

If you also use **Oracle VirtualBox** on the same PC, read [14_virtualbox_hyperv.md](14_virtualbox_hyperv.md) — **VirtualBox** and **Hyper-V / WSL2** (used by Docker Desktop) often **do not mix** cleanly.

---

## Post-Installation Setup

### Run Docker without sudo (Linux only)

By default, Docker requires `sudo` for every command. To run Docker as a non-root user:

```bash
# Create the docker group (if it doesn't exist)
sudo groupadd docker

# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply the new group membership (or log out and back in)
newgrp docker

# Verify it works without sudo
docker run hello-world
```

### Configure Docker to start on boot (Linux)

```bash
sudo systemctl enable docker.service
sudo systemctl enable containerd.service
```

---

## Verify Installation

Run these commands to verify everything is working:

```bash
# Check Docker version
docker --version
# Output: Docker version 24.x.x, build xxxxxxx

# Check Docker Compose version
docker compose version
# Output: Docker Compose version v2.x.x

# Run the hello-world test container
docker run hello-world
# Should display "Hello from Docker!" message

# Check Docker system info
docker info
```

---

## Troubleshooting

### Common Issues

| Problem                                 | Solution                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| `permission denied` when running docker | Run `sudo usermod -aG docker $USER` and log out/in                            |
| `Cannot connect to the Docker daemon`   | Ensure Docker Desktop is running, or start with `sudo systemctl start docker` |
| WSL2 errors on Windows                  | Run `wsl --update` in PowerShell as admin                                     |
| VirtualBox + Hyper-V / Docker conflicts | See [14_virtualbox_hyperv.md](14_virtualbox_hyperv.md)                       |
| Slow performance on Mac/Windows         | Allocate more RAM/CPU in Docker Desktop Settings > Resources                  |
| `no space left on device`               | Run `docker system prune -a` to clean unused data                             |

### Check Docker daemon status (Linux)

```bash
# Check if Docker is running
sudo systemctl status docker

# Start Docker if stopped
sudo systemctl start docker

# Restart Docker
sudo systemctl restart docker
```

### View Docker logs

```bash
# Linux
journalctl -u docker.service

# Mac/Windows
# Check Docker Desktop > Troubleshoot > Get support > View logs
```

---

## Docker Hub

Find official and community Docker images at: **https://hub.docker.com**

Popular images:

- `nginx` — Web server
- `node` — Node.js runtime
- `python` — Python runtime
- `postgres` — PostgreSQL database (set **`POSTGRES_USER`** / **`POSTGRES_PASSWORD`** / **`POSTGRES_DB`** when you run it)
- `redis` — In-memory data store
- `mysql` — MySQL database
- `mongo` — MongoDB database
- `ubuntu` — Ubuntu base image
- `alpine` — Minimal Linux image (~5MB)
