<p align="center">
  <img src="assets/banner.svg" alt="Room Scheduler banner" width="100%">
</p>

<p align="center">
  <a href="https://room-scheduler.onrender.com"><img src="https://img.shields.io/badge/Live-Demo-46E3B7?logo=render&logoColor=white" alt="Live demo"></a>
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/HTML%20%2F%20CSS-E34F26?logo=html5&logoColor=white" alt="HTML/CSS">
  <img src="https://img.shields.io/badge/Hosted%20on-Render-000000?logo=render&logoColor=white" alt="Render">
</p>

<p align="center"><b>A web app for booking and managing campus rooms.</b><br>
<a href="https://room-scheduler.onrender.com">room-scheduler.onrender.com</a></p>

---

## Screenshots

| Sign in | Main page |
|---|---|
| ![Login](assets/login.png) | ![Main](assets/main.png) |

## How it works

```mermaid
flowchart LR
    U[User / Browser] -->|HTML + CSS| F[Frontend]
    F -->|fetch API| S[Express Server]
    S -->|SQL| D[(SQLite)]
    G[GitHub Repo] -->|auto deploy| R[Render]
    R --> S
```

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | HTML, CSS |
| Backend | Node.js, Express |
| Database | SQLite |
| Hosting | Render (deploys from GitHub) |

## Run locally

```bash
git clone https://github.com/achxearon/room-scheduler.git
cd room-scheduler
npm install
npm start
```

Then open `http://localhost:3000` (adjust the port to match your server).

## Deployment

Pushes to the main branch auto-deploy on [Render](https://render.com).

---

<p align="center">© 2026 Bulacan State University – Meneses Campus</p>
