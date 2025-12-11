## Getting Docker

### On Ubuntu

- Follow https://docs.docker.com

  or

- `sudo apt-get update`
- `sudo apt-get install -y ca-certificates curl`
- `sudo install -m 0755 -d /etc/apt/keyrings`
- `curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg`
- `echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null`
- `sudo apt-get update`
- `sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin`
- Test: `docker run hello-world`

### On Mac

- Install **Docker Desktop for Mac** from docker.com (includes Docker Engine + Compose).
- Start Docker Desktop; ensure the whale icon is running.
- Test: `docker run hello-world`

### On Windows

- Install **Docker Desktop for Windows** from docker.com (includes Docker Engine + Compose).
- Enable WSL2 when prompted (required for Linux containers).
- Start Docker Desktop; ensure it’s running.
- Test: `docker run hello-world`

## You will find docker images on : https://hub.docker.com
