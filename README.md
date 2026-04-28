# Schemind — DevOps Mini-Project

> Full-stack learning platform with a complete **CI/CD pipeline** using  
> **Docker · Jenkins · Kubernetes · Prometheus · Grafana**

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start — Local (Docker Compose)](#quick-start--local-docker-compose)
- [Docker — Manual Build & Run](#docker--manual-build--run)
- [Jenkins CI/CD Pipeline](#jenkins-cicd-pipeline)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Prometheus & Grafana Monitoring](#prometheus--grafana-monitoring)
- [Service Ports Reference](#service-ports-reference)
- [Environment Variables](#environment-variables)

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                        JENKINS CI/CD                               │
│   Clone → Test → Docker Build → Push to Hub → Deploy to K8s       │
└────────────────┬───────────────────────────────┬───────────────────┘
                 │                               │
                 ▼                               ▼
     ┌──────────────────┐            ┌──────────────────────┐
     │   Docker Hub      │            │   Kubernetes Cluster  │
     │ schemind-frontend │            │                      │
     │ schemind-backend  │───────────▶│  Namespace: schemind │
     └──────────────────┘            │  ├─ frontend (Nginx)  │
                                     │  ├─ backend  (Node)   │
                                     │  └─ secrets           │
                                     │                      │
                                     │  Namespace: monitoring│
                                     │  ├─ Prometheus        │
                                     │  └─ Grafana           │
                                     └──────────────────────┘
                                              │
                                     ┌────────┴────────┐
                                     │  /metrics        │
                                     │  (prom-client)   │
                                     └─────────────────┘
```

---

## Tech Stack

| Layer          | Technology                                   |
| -------------- | -------------------------------------------- |
| **Frontend**   | React 18 + TypeScript + Vite + Tailwind CSS  |
| **Backend**    | Node.js + Express + MongoDB + Mongoose       |
| **Container**  | Docker (multi-stage builds) + Docker Compose |
| **CI/CD**      | Jenkins (Declarative Pipeline)               |
| **Orchestration** | Kubernetes (Deployments, Services, Secrets) |
| **Monitoring** | Prometheus + Grafana + prom-client           |

---

## Project Structure

```
Devops/
├── backend/
│   ├── Dockerfile              # Backend container image
│   ├── server.js               # Express API + /metrics endpoint
│   ├── package.json            # Includes prom-client
│   └── .env.example            # Environment variable template
│
├── src/                        # React frontend source
│   ├── App.tsx
│   ├── pages/
│   └── components/
│
├── k8s/                        # Kubernetes manifests
│   ├── namespace.yaml          # schemind namespace
│   ├── backend.yaml            # Backend Deployment + Service (NodePort 30081)
│   ├── frontend.yaml           # Frontend Deployment + Service (NodePort 30080)
│   ├── secret.yaml.example     # Template for secrets
│   └── prometheus/             # Monitoring stack
│       ├── monitoring-namespace.yaml
│       ├── rbac.yaml           # ServiceAccount + ClusterRole
│       ├── prometheus-config.yaml   # Scrape config + alert rules (K8s)
│       ├── prometheus-deployment.yaml  # (NodePort 30090)
│       └── grafana-deployment.yaml     # (NodePort 30091) + dashboard ConfigMap
│
├── prometheus/                 # Prometheus config for Docker Compose
│   ├── prometheus-local.yml    # Scrape config (Docker Compose)
│   └── alert-rules.yml        # Alerting rules (error rate, latency, memory, etc.)
│
├── grafana/                    # Grafana auto-provisioning (Docker Compose)
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── datasource.yml  # Auto-registers Prometheus datasource
│   │   └── dashboards/
│   │       └── dashboard.yml   # Dashboard provider config
│   └── dashboards/
│       └── schemind-overview.json  # Pre-built 15-panel monitoring dashboard
│
├── jenkins/                    # Jenkins CI/CD setup
│   ├── Dockerfile              # Jenkins image with Docker CLI + kubectl
│   ├── docker-compose.jenkins.yml  # Run Jenkins locally
│   ├── job-config.xml          # Pipeline job configuration
│   ├── deploy-k8s.ps1          # K8s deployment helper script
│   └── trigger-build.ps1       # Build trigger script
│
├── Dockerfile.frontend         # Multi-stage: Vite build → Nginx
├── docker-compose.yml          # Full local stack (Mongo + App + Monitoring)
├── Jenkinsfile                 # 7-stage CI/CD pipeline
├── nginx.conf                  # SPA routing for Nginx
└── DOCKER_COMMANDS.md          # Manual Docker commands reference
```

---

## Prerequisites

| Tool        | Min Version | Purpose                      |
| ----------- | ----------- | ---------------------------- |
| Docker      | 20.x        | Container runtime            |
| Docker Compose | 2.x     | Local multi-container setup  |
| kubectl     | 1.28+       | Kubernetes CLI               |
| Minikube / Kind | latest  | Local K8s cluster            |
| Jenkins     | 2.400+      | CI/CD server                 |
| Node.js     | 18.x        | Backend runtime              |

---

## Quick Start — Local (Docker Compose)

The fastest way to run everything locally with a single command:

```bash
# Start full stack: MongoDB + Backend + Frontend + Prometheus + Grafana
docker compose up --build

# Stop everything
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

**Access Points:**

| Service    | URL                        |
| ---------- | -------------------------- |
| Frontend   | http://localhost:8080       |
| Backend    | http://localhost:5001       |
| API Health | http://localhost:5001/api/health |
| Metrics    | http://localhost:5001/metrics |
| Prometheus | http://localhost:9090       |
| Grafana    | http://localhost:3000       |

> **Grafana login:** `admin` / `admin123`

---

## Docker — Manual Build & Run

### Build Images

```bash
# Backend
docker build -t schemind-backend:latest -f backend/Dockerfile ./backend

# Frontend (pass backend URL as build arg)
docker build \
  --build-arg VITE_API_URL=http://localhost:5001 \
  -t schemind-frontend:latest \
  -f Dockerfile.frontend .
```

### Run Containers

```bash
# MongoDB
docker run -d --name mongo -p 27017:27017 mongo:7

# Backend
docker run -d --name schemind-backend \
  -p 5001:5001 \
  -e MONGO_URI=mongodb://host.docker.internal:27017/schemind \
  -e JWT_SECRET=your_secret_here \
  schemind-backend:latest

# Frontend
docker run -d --name schemind-frontend \
  -p 8080:80 \
  schemind-frontend:latest
```

### Push to Docker Hub

```bash
docker tag schemind-backend:latest prajitpranavk/schemind-backend:latest
docker tag schemind-frontend:latest prajitpranavk/schemind-frontend:latest

docker push prajitpranavk/schemind-backend:latest
docker push prajitpranavk/schemind-frontend:latest
```

---

## Jenkins CI/CD Pipeline

The `Jenkinsfile` defines a **7-stage declarative pipeline**:

```
Clone → Test Backend → Build Docker Images → Push to Docker Hub →
Deploy to Kubernetes → Deploy Monitoring Stack → Cleanup
```

### Pipeline Stages

| # | Stage                    | What It Does                                        |
|---|--------------------------|-----------------------------------------------------|
| 1 | Clone Repository         | Checks out code from SCM                            |
| 2 | Test Backend             | Installs deps, runs syntax check                    |
| 3 | Build Backend Image      | `docker build` with build number tag                |
| 4 | Build Frontend Image     | Multi-stage build with `VITE_API_URL` arg           |
| 5 | Docker Login & Push      | Pushes both images to Docker Hub                    |
| 6 | Deploy to Kubernetes     | Applies K8s manifests, rolling update               |
| 7 | Deploy Monitoring Stack  | Deploys Prometheus + Grafana to `monitoring` NS     |

### Jenkins Setup Requirements

1. **Credentials to configure in Jenkins:**
   - `dockerhub-credentials` — Docker Hub username/password
   - `kubeconfig` — Kubernetes cluster config file

2. **Environment variable (optional):**
   - `K8S_NODE_IP` — Your cluster node IP (defaults to `localhost`)

3. **Create a Pipeline Job:**
   - Point it to this repo's `Jenkinsfile`
   - Or use "Pipeline script from SCM" with your Git URL

---

## Kubernetes Deployment

### Initial Setup

```bash
# 1. Start Minikube (if using locally)
minikube start --driver=docker

# 2. Create namespace
kubectl apply -f k8s/namespace.yaml

# 3. Create secrets (REQUIRED — edit values first)
kubectl create secret generic schemind-secrets \
  --namespace=schemind \
  --from-literal=MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/schemind" \
  --from-literal=JWT_SECRET="your_super_secret_key"

# 4. Deploy application
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml

# 5. Verify
kubectl get pods -n schemind
kubectl get svc -n schemind
```

### Access on Minikube

```bash
# Get the Minikube IP
minikube ip

# Access services
# Frontend  → http://<MINIKUBE_IP>:30080
# Backend   → http://<MINIKUBE_IP>:30081

# Or use minikube service tunnels
minikube service schemind-frontend-service -n schemind
minikube service schemind-backend-service -n schemind
```

### Useful kubectl Commands

```bash
# Check pod status
kubectl get pods -n schemind -o wide

# View logs
kubectl logs -f deployment/schemind-backend -n schemind
kubectl logs -f deployment/schemind-frontend -n schemind

# Describe a pod (debug)
kubectl describe pod <pod-name> -n schemind

# Restart a deployment
kubectl rollout restart deployment/schemind-backend -n schemind

# Scale up
kubectl scale deployment/schemind-frontend --replicas=3 -n schemind
```

---

## Prometheus & Grafana Monitoring

### What's Monitored

The backend exposes a `/metrics` endpoint (via `prom-client`) with:

| Metric                           | Type      | Description                          |
| -------------------------------- | --------- | ------------------------------------ |
| `http_requests_total`            | Counter   | Total HTTP requests (method, route, status) |
| `http_request_duration_seconds`  | Histogram | Request latency distribution         |
| `active_connections`             | Gauge     | Currently active HTTP connections    |
| `nodejs_heap_size_total_bytes`   | Gauge     | Node.js heap memory (auto-collected) |
| `nodejs_eventloop_lag_seconds`   | Gauge     | Event loop lag (auto-collected)      |
| `process_cpu_user_seconds_total` | Counter   | CPU usage (auto-collected)           |

### Deploy Monitoring to Kubernetes

```bash
# Deploy monitoring namespace + RBAC + Prometheus + Grafana
kubectl apply -f k8s/prometheus/monitoring-namespace.yaml
kubectl apply -f k8s/prometheus/rbac.yaml
kubectl apply -f k8s/prometheus/prometheus-config.yaml
kubectl apply -f k8s/prometheus/prometheus-deployment.yaml
kubectl apply -f k8s/prometheus/grafana-deployment.yaml

# Verify
kubectl get pods -n monitoring
kubectl get svc -n monitoring
```

### Access Monitoring

| Service    | K8s NodePort                       | Docker Compose             |
| ---------- | ---------------------------------- | -------------------------- |
| Prometheus | `http://<NODE_IP>:30090`           | `http://localhost:9090`    |
| Grafana    | `http://<NODE_IP>:30091`           | `http://localhost:3000`    |

### Grafana Setup

1. Open Grafana → Login with `admin` / `admin123`
2. Prometheus datasource is **auto-provisioned** (no manual setup needed)
3. The **Schemind — Application Overview** dashboard is **auto-loaded** with 15 panels:
   - Key Metrics: Request rate, avg response time, active connections, error rate
   - HTTP Traffic: Request rate by status code, request rate by route
   - Latency: p50/p90/p95/p99 duration percentiles
   - Node.js Runtime: Memory usage, CPU usage, event loop lag
   - Process Info: Uptime, open FDs, total requests, GC pauses
4. You can also import community dashboards:
   - **Node.js App Dashboard:** Import ID `11159`
   - **Kubernetes Cluster:** Import ID `6417`

### Prometheus Alerting Rules

Six alerting rules are pre-configured (in `prometheus/alert-rules.yml`):

| Alert                      | Severity   | Condition                                  | Duration |
| -------------------------- | ---------- | ------------------------------------------ | -------- |
| `HighErrorRate`            | 🔴 critical | 5xx error rate > 5%                        | 2 min    |
| `BackendDown`              | 🔴 critical | Backend unreachable by Prometheus           | 1 min    |
| `HighResponseLatency`      | 🟡 warning  | p95 latency > 1 second                     | 3 min    |
| `HighMemoryUsage`          | 🟡 warning  | RSS memory > 512 MB                        | 5 min    |
| `HighEventLoopLag`         | 🟡 warning  | Event loop lag > 500ms                     | 2 min    |
| `TooManyActiveConnections` | 🟡 warning  | Active connections > 100                   | 3 min    |

View active alerts at: `http://localhost:9090/alerts`

### Example Prometheus Queries (PromQL)

```promql
# Request rate per second (last 5 min)
rate(http_requests_total[5m])

# Average request duration
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active connections right now
active_connections

# Memory usage in MB
process_resident_memory_bytes / 1024 / 1024

# HTTP error rate (5xx)
rate(http_requests_total{status_code=~"5.."}[5m])
```

---

## Service Ports Reference

| Service              | Container Port | K8s NodePort | Docker Compose |
| -------------------- | -------------- | ------------ | -------------- |
| Frontend (Nginx)     | 80             | 30080        | 8080           |
| Backend (Express)    | 5001           | 30081        | 5001           |
| Prometheus           | 9090           | 30090        | 9090           |
| Grafana              | 3000           | 30091        | 3000           |
| MongoDB              | 27017          | —            | 27017          |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable       | Required | Default                       | Description              |
| -------------- | -------- | ----------------------------- | ------------------------ |
| `PORT`         | No       | `5001`                        | Server listening port    |
| `MONGO_URI`    | Yes      | —                             | MongoDB connection URI   |
| `JWT_SECRET`   | Yes      | `schemind_default_secret`     | JWT signing key          |
| `FRONTEND_URL` | No       | —                             | Allowed CORS origin      |
| `NODE_ENV`     | No       | `development`                 | Environment mode         |

### Frontend (Build-time)

| Variable       | Required | Description                          |
| -------------- | -------- | ------------------------------------ |
| `VITE_API_URL` | Yes      | Backend API base URL for the build   |

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
