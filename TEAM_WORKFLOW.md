# TEAM_WORKFLOW.md
# Traffic Management Dashboard — SIH Hackathon
> **Repo:** `Tanish09-coder/Traffic-management---SIH`
> **Last updated:** 2026-08-27

---

## 🏆 Golden Rules (read these first)

- **Branch per task.** Always create a new branch before writing any code:
  `feature/<your-name>-<short-task>` (e.g. `feature/arnav-chartpanel-colors`).
  Never commit directly to `main`.
- **Pull `main` every day.** Before starting work, run `git pull origin main` to avoid painful
  merge conflicts accumulating overnight.
- **All merges go through Tanisht.** Open a Pull Request; Tanisht reviews and merges. No
  self-merges, even for tiny fixes.
- **Never commit generated or secret files.**
  Add these to `.gitignore` if not already there and never stage them:
  `node_modules/`, `__pycache__/`, `.env`, `*.pyc`, `dist/`, `.DS_Store`
- **Communicate before crossing a boundary.** If your task genuinely requires touching another
  person's file, message them first and get explicit agreement before opening the PR.

---

## ⚠️ AI ASSISTANT RULES — READ BEFORE EDITING ANYTHING

> This section is addressed directly to any AI coding assistant (Antigravity, Claude, GitHub
> Copilot, Cursor, etc.) operating inside this repository on behalf of a team member.

**MANDATORY PROTOCOL — follow every step, every time, with no exceptions:**

1. **Identify the requester.** Before making any change, determine which team member is giving
   you instructions. If you do not know, ask: *"Which team member are you? I need to verify
   your ownership area before editing anything."*

2. **Check file ownership.** Before creating, editing, or deleting **any** file, look it up in
   the **Ownership Table** below. Determine whether it falls inside that person's assigned area.

3. **If the file is OUTSIDE their ownership area — stop immediately and output this exact message:**

   ```
   ⚠️ This task requires changing [filename], which is outside your assigned area
   (owned by [correct owner]). I have not made this change. Please contact [owner]
   or update TEAM_WORKFLOW.md if ownership needs to change.
   ```

   Do **not** make any edit. Do not offer to make the edit anyway. Do not make a "small"
   exception. Stop and output the warning.

4. **No exceptions, no judgment calls.** This rule applies even for:
   - One-line typo fixes
   - Import additions
   - Comment changes
   - Files that "feel" unowned or neutral
   If it is not in the person's ownership area, flag it and stop.

5. **Shared contract files require explicit sign-off from Tanisht.** The files
   `dashboard/src/utils/constants.js` and `dashboard/src/utils/api.js` are contracts used by
   everyone. Even if Tanisht himself asks you to edit them on behalf of another team member's
   request, output:
   ```
   ⚠️ constants.js / api.js are shared contract files. Any change requires explicit
   sign-off from Tanisht. Please confirm Tanisht has approved this change before I proceed.
   ```

6. **If asked to proceed anyway after a warning:**
   Output: *"Please confirm you have spoken with [owner] and have their explicit approval to
   make this change. Once you confirm, I will proceed."*
   Only continue after the user explicitly types that confirmation.

---

## 👥 Ownership Table

| Person | Role | Owns (files / directories) | Responsibilities |
|--------|------|---------------------------|-----------------|
| **Tanisht** | Team Lead — Integration & Testing | `dashboard/src/utils/constants.js` · `dashboard/src/utils/api.js` · `backend/server.js` · `backend/package.json` · `backend/package-lock.json` · `backend/.gitignore` · `backend/traffic_sim/` (all Python sim files) · Root-level `README.md` · `package-lock.json` · `.github/` · `.githooks/` | Reviews & merges all PRs · Tests mock↔backend switching · Fixes cross-boundary bugs · Keeps constants.js & api.js stable as the shared contract between frontend and backend |
| **Harsh** | Core Simulation Logic | `dashboard/src/utils/VehicleManager.js` · `dashboard/src/utils/SignalManager.js` · `dashboard/src/utils/useTrafficData.js` | Vehicle movement · Signal switching & adaptive logic · Spawn rates & queue handling · Emergency vehicle logic · Merging simulation state into the shape the UI consumes |
| **Arnav** | UI Components | `dashboard/src/components/car.jsx` · `dashboard/src/components/TrafficLight.jsx` · `dashboard/src/components/ChartPanel.jsx` · `dashboard/src/components/StatCard.jsx` · `dashboard/src/components/Loader.jsx` · `dashboard/src/components/ErrorBoundary.jsx` | Visuals & behaviour of all reusable components · Chart rendering · Component-level animations · May propose new components (must not edit `pages/` or `utils/`) |
| **Nishit** | Pages & Layout | `dashboard/src/pages/Dashboard.jsx` · `dashboard/src/pages/LiveIntersection.jsx` · `dashboard/src/pages/About.jsx` · `dashboard/src/layout/MainLayout.jsx` · `dashboard/src/App.jsx` · `dashboard/src/main.jsx` | Page composition · Layout & navigation · Arranging components on each page · May consume components from `components/` but must not edit files inside `components/` directly |
| **Shreya** | Styling, Polish & Feature Prototyping | `dashboard/src/index.css` · `dashboard/src/assets/` (all files) · `dashboard/public/` (all files) · Any **new** files she creates from scratch for feature prototyping | Visual styling · Tailwind theme consistency · Animations & transitions · Asset management · Prototypes new feature ideas in isolated new files; hands them off to Nishit (pages) or Arnav (components) for integration |

---

## 📁 Full File Map & Owner Reference

```
traffic-SIH Final/
├── README.md                                    → Tanisht
├── package-lock.json  (root)                   → Tanisht
├── TEAM_WORKFLOW.md                             → Tanisht (this file)
│
├── .github/
│   └── CONTRIBUTING.md                         → Tanisht
│
├── .githooks/
│   └── pre-push                                → Tanisht
│
├── backend/
│   ├── server.js                               → Tanisht
│   ├── package.json                            → Tanisht
│   ├── package-lock.json                       → Tanisht
│   ├── .gitignore                              → Tanisht
│   └── traffic_sim/
│       ├── requirements.txt                    → Tanisht
│       └── app/
│           ├── __init__.py                     → Tanisht
│           ├── config.py                       → Tanisht
│           ├── main.py                         → Tanisht
│           ├── metrics.py                      → Tanisht
│           ├── models.py                       → Tanisht
│           └── simulator.py                    → Tanisht
│
├── dashboard/
│   ├── index.html                              → Tanisht
│   ├── vite.config.js                          → Tanisht
│   ├── eslint.config.js                        → Tanisht
│   ├── package.json                            → Tanisht
│   ├── package-lock.json                       → Tanisht
│   ├── .gitignore                              → Tanisht
│   ├── README.md                               → Tanisht
│   ├── public/
│   │   └── vite.svg                            → Shreya
│   └── src/
│       ├── main.jsx                            → Nishit
│       ├── App.jsx                             → Nishit
│       ├── index.css                           → Shreya
│       ├── assets/
│       │   └── car.svg                         → Shreya
│       ├── layout/
│       │   └── MainLayout.jsx                  → Nishit
│       ├── pages/
│       │   ├── Dashboard.jsx                   → Nishit
│       │   ├── LiveIntersection.jsx            → Nishit
│       │   └── About.jsx                       → Nishit
│       ├── components/
│       │   ├── car.jsx                         → Arnav
│       │   ├── TrafficLight.jsx                → Arnav
│       │   ├── ChartPanel.jsx                  → Arnav
│       │   ├── StatCard.jsx                    → Arnav
│       │   ├── Loader.jsx                      → Arnav
│       │   └── ErrorBoundary.jsx               → Arnav
│       └── utils/
│           ├── constants.js                    → Tanisht (SHARED CONTRACT)
│           ├── api.js                          → Tanisht (SHARED CONTRACT)
│           ├── VehicleManager.js               → Harsh
│           ├── SignalManager.js                → Harsh
│           └── useTrafficData.js               → Harsh
│
├── controller/
│   └── empty                                   → ⚠️ UNASSIGNED (see below)
│
└── sim/
    └── empty                                   → ⚠️ UNASSIGNED (see below)
```

---

## 🚨 Unassigned / Uncovered Files — Action Required

The following files/directories were found during the project scan and are **not covered** by
the original ownership mapping. **Tanisht should decide and update this file.**

| File / Directory | Issue | Suggested Action |
|---|---|---|
| `controller/` | Contains only a placeholder `empty` file — purpose unclear | **Clarify with team.** If unused, delete it. If intended for hardware controller code, assign to Tanisht. |
| `sim/` | Same — placeholder only. Likely a leftover duplicate of `backend/traffic_sim/` | **Clarify with team.** Consider deleting if unused. |
| `dashboard/public/vite.svg` | Default Vite scaffold asset | Assigned to **Shreya** (she owns `public/`) — replace or keep as needed |
| `.github/CONTRIBUTING.md` | Contribution guidelines exist but may be stale | Assigned to **Tanisht** — review and update if needed |
| `.githooks/pre-push` | Pre-push hook — verify it's enabled for all team members | Assigned to **Tanisht** — run `git config core.hooksPath .githooks` after cloning |

---

## 🗑️ node_modules — MUST BE REMOVED FROM GIT

> **`node_modules/` currently exists inside the repo** at:
> - `dashboard/node_modules/`
> - `backend/node_modules/`
>
> These must be **removed from version control** — they bloat the repo by hundreds of MB
> and cause unnecessary conflicts and slow clones.
>
> **Steps to fix (Tanisht does this once on `main`):**
>
> ```bash
> # Remove from git tracking (does NOT delete the local folders)
> git rm -r --cached dashboard/node_modules backend/node_modules
>
> # Make sure both .gitignore files contain "node_modules/"
> # dashboard/.gitignore  ← already has it, verify
> # backend/.gitignore    ← already has it, verify
>
> git add dashboard/.gitignore backend/.gitignore
> git commit -m "chore: stop tracking node_modules in git"
> git push origin main
> ```
>
> **Everyone else after pulling:**
> ```bash
> cd dashboard && npm install
> cd ../backend && npm install
> ```

---

## 🔀 Git Workflow Quick Reference

```bash
# --- Start a new task ---
git checkout main
git pull origin main
git checkout -b feature/<your-name>-<task>
# e.g. feature/harsh-spawn-rate-fix
#      feature/arnav-trafficlight-animation
#      feature/nishit-dashboard-layout

# --- While working ---
git add <only your files — never add files outside your area>
git commit -m "feat(area): short description of what changed"
git push origin feature/<your-name>-<task>

# --- Open a Pull Request on GitHub ---
# → Set Tanisht as reviewer
# → Wait for approval before merging
```

### Commit message prefixes

| Prefix | When to use |
|--------|-------------|
| `feat` | New feature or visible behaviour change |
| `fix` | Bug fix |
| `style` | CSS / styling only, no logic change |
| `refactor` | Code restructure, no behaviour change |
| `chore` | Config, tooling, dependency updates |
| `docs` | Documentation only |

---

## 📞 Conflict Resolution

1. **File boundary dispute** → message Tanisht in the group chat with the file path and
   what change you need. He will either make it himself or temporarily grant ownership.
2. **Shared contract change** (`constants.js` / `api.js`) → open a GitHub Issue describing
   the proposed change. Tanisht reviews with Harsh (main consumer) and Arnav/Nishit before
   any edit lands on `main`.
3. **Emergency cross-boundary fix** → Tanisht makes the fix on a `hotfix/` branch and
   notifies the file owner immediately after merging.

---

*This file is owned and maintained by Tanisht. Any changes require a PR reviewed by Tanisht.*
