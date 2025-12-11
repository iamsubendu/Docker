## Demo: pull CentOS and inspect release info

1. Pull CentOS 7.9 image

- `docker pull centos:centos7.9.2009`

2. Run a container interactively with bash

- `docker run -it be65f488b776 bash`  
  `-it` opens an interactive TTY; your terminal switches into the container shell.

3. Inside the container, check OS release info

- `cat /etc/*release*`

4. to exit from the container

- `exit`

---

## Demo: run container in detached mode with a task

1. Run container in detached mode with sleep command

- `docker run -d be65f488b776 sleep 30`
  - `-d` runs the container in detached mode (background)
  - `sleep 30` is the task that runs for 30 seconds

2. Check running containers

- `docker ps`
  - You'll see the container running

3. After 30 seconds, check again

- `docker ps`
  - The container won't be there because the `sleep 30` task completed and the container exited
- `docker ps -a`
  - You can see the exited container in the full list
