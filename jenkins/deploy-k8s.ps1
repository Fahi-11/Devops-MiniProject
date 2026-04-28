# Deploy Schemind App + Monitoring to Kubernetes
Write-Host "=== Deploying Backend ==="
kubectl apply -f k8s/backend.yaml

Write-Host "`n=== Deploying Frontend ==="
kubectl apply -f k8s/frontend.yaml

Write-Host "`n=== Deploying Monitoring Namespace ==="
kubectl apply -f k8s/prometheus/monitoring-namespace.yaml

Write-Host "`n=== Deploying RBAC ==="
kubectl apply -f k8s/prometheus/rbac.yaml

Write-Host "`n=== Deploying Prometheus Config ==="
kubectl apply -f k8s/prometheus/prometheus-config.yaml

Write-Host "`n=== Deploying Prometheus ==="
kubectl apply -f k8s/prometheus/prometheus-deployment.yaml

Write-Host "`n=== Deploying Grafana ==="
kubectl apply -f k8s/prometheus/grafana-deployment.yaml

Write-Host "`n=== Waiting for pods... ==="
Start-Sleep -Seconds 15

Write-Host "`n=== Pod Status ==="
kubectl get pods -n schemind
kubectl get pods -n monitoring

Write-Host "`n=== Services ==="
kubectl get svc -n schemind
kubectl get svc -n monitoring
