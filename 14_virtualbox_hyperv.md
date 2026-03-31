# VirtualBox and Hyper-V on Windows

**Short answer:** On **one Windows PC**, you usually **should not rely on both Oracle VirtualBox and Microsoft Hyper-V** at the same time in the “classic” way. They both want to control **how your CPU runs virtual machines**. Turning on Hyper-V (or Windows features that use the same hypervisor) often **breaks or slows** normal VirtualBox VMs unless you use special VirtualBox settings.

**Why this page mentions Docker:** **Docker Desktop** on Windows uses **WSL2** to run Linux containers. **WSL2** is not magic — it runs Linux inside a **small VM**. That VM uses **Windows’ built-in hypervisor** (the **same core technology** as **Hyper-V**). So:

- **Docker does not mean “you installed the Hyper-V app.”** You may never open Hyper-V Manager.
- **Docker does mean “Windows virtualization is on.”** That is the same layer Hyper-V uses, so it bumps into VirtualBox the same way Hyper-V does.

## Table of Contents

- [What is VirtualBox?](#what-is-virtualbox)
- [What is Hyper-V?](#what-is-hyper-v)
- [Does Windows use “Hyper-V” or “virtualization”?](#does-windows-use-hyper-v-or-virtualization)
- [Why they clash on the same machine](#why-they-clash-on-the-same-machine)
- [How this ties to Docker on Windows](#how-this-ties-to-docker-on-windows)
- [Simple real-life examples (no commands)](#simple-real-life-examples-no-commands)
- [What you can do (practical choices)](#what-you-can-do-practical-choices)
- [See also](#see-also)

---

## What is VirtualBox?

**VirtualBox** is **free software** from Oracle that runs **virtual machines (VMs)** on your computer. Each VM looks like a **full separate computer** (with its own OS: Windows, Linux, etc.) inside a window.

People use it to try Linux, run old apps, or test servers without buying another PC.

---

## What is Hyper-V?

**Hyper-V** is a **Windows feature**: it is Microsoft’s tool to run **virtual machines**, and it turns on Windows’ **built-in hypervisor** (the thing that runs VMs fast using your CPU).

**WSL2** also uses that **same built-in hypervisor** — that is why **Docker Desktop** (which needs WSL2 for normal Linux containers on Windows) and **Hyper-V** both need **virtualization turned on** in a similar way.

---

## Does Windows use “Hyper-V” or “virtualization”?

They are **not** two choices where you pick one word.

- **Virtualization** (here **hardware virtualization**) is the **ability** of your CPU + Windows to run **virtual machines** efficiently. Think: “the engine can run VMs.”
- **Hyper-V** is a **specific Windows feature** (a **product** you can turn on in *Turn Windows features on or off*) that **uses** that ability to run **Hyper-V VMs**.

So: **Windows uses virtualization** when you turn on the right features. **Hyper-V** is **one** of those features — it is **not** the same as the word “virtualization.” **WSL2** also uses **Windows’ virtualization**; you do **not** have to install the **Hyper-V** role to use WSL2, but you **do** need Windows pieces like **Virtual Machine Platform** / **Windows Hypervisor Platform** (names depend on your Windows version).

**Short line:** **Virtualization** = the idea / capability. **Hyper-V** = Microsoft’s **VM product** that uses it. **Docker + WSL2** = another path that uses **the same kind of virtualization**, not Hyper-V Manager in your face.

---

## Why they clash on the same machine

Your **CPU** has features that help run VMs fast (**hardware virtualization**). **Only one “boss”** can fully own that layer at a time in the simple story:

- **Hyper-V turned on** → Windows is already using the hypervisor for Hyper-V, WSL2, or similar features.
- **VirtualBox** (in the usual mode) also wants **direct** use of those CPU features for its VMs.

So you get **conflicts**, **errors**, or **very slow** VirtualBox VMs. Some VirtualBox versions can use **Hyper-V as a backend** (Oracle added support on Windows), but setup is **not** the same as “plain VirtualBox on a PC without Hyper-V”, and **problems still happen** for many users.

That is why people say: **you cannot really have “both in the good old way” on the same Windows install** — you pick **one main path** or you accept **trade-offs** and extra troubleshooting.

---

## How this ties to Docker on Windows

- **Docker Desktop** needs **WSL2** → WSL2 uses **virtualization** (Windows’ hypervisor, same kind as **Hyper-V** uses).
- If you **turn off** that virtualization to help **VirtualBox**, **Docker / WSL2** often **breaks** until you turn it **on** again.

So **Docker + WSL2** and **classic VirtualBox** on one PC is a common **pain point**.

### Simple real-life examples (no commands)

**Example 1 — Docker first:** You install **Docker Desktop**. It turns on **WSL2**. Later you open an old **VirtualBox** Linux VM. The VM might **start**, but it is **slow**, or you see a **warning** about virtualization. That is the two tools **fighting over the same CPU help**.

**Example 2 — VirtualBox first:** You use **VirtualBox** every day. You turn **off** Windows features used by **Hyper-V** so VirtualBox runs “clean.” Then **Docker Desktop** or **WSL2** may **refuse to start** until you turn those features **on** again and **restart** the PC.

**Example 3 — You only need containers:** You use **Docker** for apps. You **do not** run another VM in VirtualBox. Easiest: **no VirtualBox** on that PC, or use **cloud / another computer** for full VMs.

---

## What you can do (practical choices)

| Situation | Simple idea |
|-----------|-------------|
| You need **Docker Desktop (WSL2)** | Keep **WSL2 / virtualization** enabled. Avoid relying on **old-style VirtualBox** for important VMs, or use **VirtualBox with Hyper-V backend** only if you know how to fix issues. |
| You need **VirtualBox** more than Docker | You may **disable Hyper-V / related Windows features** — but then **WSL2 and Docker Desktop** usually need to be re-enabled later (reboots, admin steps). **Not** a fun mix on one box. |
| You need **both** sometimes | Use **two machines**, **dual boot**, or run one type of workload in the **cloud**. Easiest mentally. |
| You only need **Linux command line** | Sometimes people use **WSL2** without Docker, or **Docker** without extra VMs — fewer moving parts than **VirtualBox + Docker** together. |

**Details change** with Windows and VirtualBox versions. If something breaks, search for your **exact error** and your **Windows build** — Microsoft and Oracle both publish notes on **Hyper-V + VirtualBox**.

---

## See also

- **Install Docker on Windows:** [2_installation.md — On Windows](2_installation.md#on-windows)
- **WSL2 issues:** [2_installation.md — Troubleshooting](2_installation.md#troubleshooting)
- **Docker vs full VMs (concept):** [1_intro.md — Docker vs Virtual Machines](1_intro.md#docker-vs-virtual-machines)
