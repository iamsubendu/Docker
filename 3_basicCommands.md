# Docker commands (basic → advanced)

## Basic

- `docker pull imageName` — pulls the image
- `docker images` — to see list of all images and there sizes
- `docker rmi imageName ` — to remove an image and we must ensure that no container are running from that image. We must stop and delete all containers to remove the image

- `docker run` — runs a container
- `docker run <image>` — run a container from an image (e.g., `docker run nginx` starts Nginx).
- `docker run hello-world` — verify Docker is installed and can run a container.
- `docker run -d  imageName` — runs container in detached mode and you can go back to your terminal right away.The container will be running on background
- `docker attach -d  imageName/imageId` — to get attached back from detached conntainer
- `docker ps` — list only running containers (basic info).
- `docker ps -a` — list all containers (running, stopped, exited) with basic info.
  - Exit code `0` means the container exited normally
  - Exit code `137` means the container was forcefully killed (e.g., `docker stop` or `docker kill`)
- `docker stop containerName` — to stop/force kill a running container (return name back when stopped)
- `docker rm containerName` — to remove a container(return name back when removed)
- `docker exec imageName doSomething` — to execute a comand when container is running (docker exec imageName cat /etc/hosts - will print the content inside)

Note: `docker run ubuntu` starts a container that exits immediately because it runs its default command (e.g., `/bin/bash`) and then ends. You'll see it under `docker ps -a`. Containers are meant to run a specific process; when that process finishes or crashes, the container exits (e.g., a script that completes, a web server that stops, or a task that fails).

Note: When specifying a container ID, you can use just the first few characters instead of the full ID. Docker will match it if it's unique (e.g., `docker stop be65` instead of `docker stop be65f488b776`).

- `docker run ubuntu sleep 5` — it runs sleep command and goes to sleep for 5s and then exits and container exits
