# 🏛️ CivicSamadhan (e-CivicSamadhan)
### *Centralized Civic Grievance Redressal and Monitoring System*

Inspired by the National Grievance Portal (`samadhaan.ugc.ac.in`), **CivicSamadhan** provides a single-window digital governance platform for urban civic complaints — connecting Citizens, Municipal Corporations, and Field Contractors with AI Defect Triage, automated geofencing, and verifiable Proof-of-Resolution.

---

## 🚀 Live Deployments & Preview

* **GitHub Pages (Live Static App):** [https://utkmiz13.github.io/CivicSamadhan/](https://utkmiz13.github.io/CivicSamadhan/)
* **Tunnel Live Preview:** [https://beige-queens-brake.loca.lt](https://beige-queens-brake.loca.lt) *(Password: `122.163.177.158`)*
* **Local Server:** `http://localhost:4000` *(Run via `npm start` or double-clicking `start.command`)*

---

## ⚡ How Data & Auth Work on GitHub Pages

1. **Static Hosting + Cloud Backend:** GitHub Pages serves the frontend, while all database operations (issues, contractors, points) communicate **directly with Supabase Cloud PostgreSQL** in real-time.
2. **Real Email Confirmation:** When a user signs up on GitHub Pages or Localhost, Supabase Auth automatically dispatches an official confirmation email to their inbox to verify the account!
3. **Data Persistence:** Every reported pothole, garbage dump, streetlight hazard, and point redemption is permanently committed to your Supabase Cloud database.

---

## 📁 System Architecture

```
CivicSamadhan/
├── index.html                     # Root entry point for GitHub Pages
├── src/                           # Frontend assets (CSS, JS, Components)
│   ├── css/style.css
│   └── js/
│       ├── api.js                 # Direct Supabase Cloud REST connector
│       ├── state.js               # Reactive app state & demo presets
│       └── views/                 # Citizen, Municipality, Contractor, Rewards
├── backend/                       # Node.js Server & Local Fallback Engine
│   ├── src/config/supabase.js     # Supabase Cloud Client
│   ├── server.js                  # Localhost server (Port 4000)
│   └── src/data/schema.sql        # Supabase PostgreSQL schema
├── .github/workflows/deploy.yml   # Automatic GitHub Pages deployment workflow
├── start.command                  # macOS 1-click launcher
└── README.md
```
