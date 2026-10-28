# 🏛️ CivicSamadhan (e-CivicSamadhan)
### *Centralized Civic Grievance Redressal and Monitoring System*

Inspired by the National Grievance Portal (`samadhaan.ugc.ac.in`), **CivicSamadhan** provides a centralized, single-window digital governance platform for urban civic complaints — connecting Citizens, Municipal Corporations, and Field Contractors with AI Defect Triage, automated geofencing, and verifiable Proof-of-Resolution.

---

## 📁 System Architecture

```
Smadhaan/
├── backend/                       # Node.js REST API & Supabase Integration
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js        # Supabase Cloud Client with Local Fallback
│   │   ├── controllers/
│   │   │   ├── issueController.js # Grievance Lifecycle: Lodge, Assign, Resolve, Verify
│   │   │   ├── statsController.js # Citywide Telemetry, KPIs, Leaderboard
│   │   │   └── authController.js  # Role Switching (Citizen, Municipal, Contractor)
│   │   ├── middleware/
│   │   │   └── rbac.js            # Role-Based Access Control guards
│   │   ├── routes/
│   │   │   └── index.js           # REST API routes
│   │   ├── services/
│   │   │   └── aiTriage.js        # AI classification & 45m duplicate detection
│   │   └── data/
│   │       ├── seed.json          # Seed civic dataset
│   │       ├── storage.json       # Auto-synced datastore
│   │       └── schema.sql         # Supabase PostgreSQL schema
│   ├── .env                       # Live Supabase project credentials
│   ├── package.json
│   └── server.js                  # HTTP Server (Port 4000)
│
├── frontend/                      # e-Samadhan Style Modern Portal
│   ├── index.html                 # Official government portal UI shell
│   └── src/
│       ├── css/
│       │   └── style.css          # Government portal theme, Ashoka stambh styles
│       └── js/
│           ├── api.js             # REST API Client
│           ├── state.js           # Reactive State & Demo Presets
│           ├── views/
│           │   ├── citizenView.js      # Lodge Grievance & Track Status
│           │   ├── municipalityView.js # GIS Spatial Map & Contractor SLA
│           │   ├── contractorView.js   # Work Orders & Field Proof Upload
│           │   └── rewardsView.js      # Civic Tokens & Soulbound Badge
│           └── app.js             # Master Coordinator
│
├── start.command                  # macOS double-click launcher
├── start.sh                       # Shell launch script
├── package.json                   # Root package runner (`npm start`)
└── README.md
```

---

## ⚡ How to Run

1. **Option 1 (Double-Click):** Double-click [start.command](file:///Users/utkarshmishra13/Desktop/Smadhaan/start.command).
2. **Option 2 (Terminal):**
   ```bash
   npm start
   ```
3. Opens at `http://localhost:4000`.

---

## 🌐 Live Preview (Tunnel)

To expose your local CivicSamadhan portal to the internet for instant preview:
```bash
npx --yes localtunnel --port 4000
```
Password to unlock on first visit: Check your public IP or visit `https://loca.lt/mytunnelpassword`.
