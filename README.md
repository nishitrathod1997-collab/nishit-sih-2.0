# 🚦 AI-Powered Traffic Management Dashboard

An interactive simulation and dashboard for **AI-based traffic signal optimization**, built for hackathon demonstration.  
The project simulates vehicles, signals, and congestion in a virtual intersection, controlled by a mock **Reinforcement Learning (Q-learning)** agent.  
The frontend visualizes traffic flow, metrics, and KPIs in real time.

---

## 📌 Features
- **Animated Intersection** → Cars stop at red lights and move on green.
- **Dynamic Traffic Lights** → Signal states change over time (baseline cycle or adaptive mock AI).
- **Charts & KPIs**  
  - Line chart for average wait time over time  
  - Bar chart for queue length per lane  
  - Stat cards showing throughput, total cars passed, average wait time  
- **Mock + Backend Ready** → Works with built-in mock data; can connect to backend APIs (`/state`, `/metrics`) when available.
- **Controls Panel** → Switch between baseline vs adaptive mode, toggle mock vs backend, adjust simulation speed.

---

## 🛠️ Tech Stack
**Frontend**
- React (Vite + JSX)
- Tailwind CSS (UI styling)
- Framer Motion (animations)
- Recharts (data visualization)
- Axios (API calls)

**Backend (future integration)**
- FastAPI (Python)
- SUMO (traffic simulation)
- Q-learning agent for adaptive signal control



