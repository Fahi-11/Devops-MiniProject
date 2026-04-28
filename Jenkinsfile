pipeline {
    agent any

    environment {
        DOCKERHUB_USER  = 'faheem313'
        FRONTEND_IMAGE  = "${DOCKERHUB_USER}/schemind-frontend"
        BACKEND_IMAGE   = "${DOCKERHUB_USER}/schemind-backend"
        IMAGE_TAG       = "build-${BUILD_NUMBER}"
        // K8s node IP — set as a Jenkins env var or pass via pipeline param
        // K8S_NODE_IP     = "${env.K8S_NODE_IP ?: 'localhost'}"
        // KUBECONFIG      = credentials('kubeconfig')
    }

    stages {

        // ── 1. Clone ─────────────────────────────────────────────────────────
        stage('Clone Repository') {
            steps {
                echo '📥 Cloning repository...'
                checkout scm
            }
        }

        // ── 2. Test Backend ──────────────────────────────────────────────────
        stage('Test Backend') {
            steps {
                echo '🧪 Running backend checks...'
                dir('backend') {
                    sh 'npm install --legacy-peer-deps'
                    sh 'node --check server.js && echo "✅ Syntax OK"'
                }
            }
        }

        // ── 3. Build Docker Images ───────────────────────────────────────────
        stage('Build Backend Docker Image') {
            steps {
                echo '🔨 Building Backend Docker image...'
                sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest -f backend/Dockerfile ./backend"
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                echo '🔨 Building Frontend Docker image...'
                sh """
                    docker build \\
                        --build-arg VITE_API_URL=http://${K8S_NODE_IP}:30081 \\
                        -t ${FRONTEND_IMAGE}:${IMAGE_TAG} \\
                        -t ${FRONTEND_IMAGE}:latest \\
                        -f Dockerfile.frontend .
                """
            }
        }

        // ── 4. Push to Docker Hub ────────────────────────────────────────────
        stage('Docker Login & Push') {
            steps {
                echo '🔐 Logging in and pushing to Docker Hub...'
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"
                    sh "docker push ${BACKEND_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${BACKEND_IMAGE}:latest"
                    sh "docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${FRONTEND_IMAGE}:latest"
                }
            }
        }

        // ── 5. Deploy App to Kubernetes ──────────────────────────────────────
        // stage('Deploy to Kubernetes') {
        //     steps {
        //         echo '☸️  Deploying application to Kubernetes...'
        //         sh """
        //             # Create namespace if not exists
        //             kubectl apply -f k8s/namespace.yaml

        //             # Apply secrets (must be pre-created or managed separately)
        //             # kubectl apply -f k8s/secret.yaml

        //             # Deploy backend & frontend
        //             kubectl apply -f k8s/backend.yaml
        //             kubectl apply -f k8s/frontend.yaml

        //             # Force rolling update with the new image tag
        //             kubectl set image deployment/schemind-backend \\
        //                 schemind-backend=${BACKEND_IMAGE}:${IMAGE_TAG} \\
        //                 -n schemind

        //             kubectl set image deployment/schemind-frontend \\
        //                 schemind-frontend=${FRONTEND_IMAGE}:${IMAGE_TAG} \\
        //                 -n schemind

        //             # Wait for rollout to complete
        //             kubectl rollout status deployment/schemind-backend -n schemind --timeout=120s
        //             kubectl rollout status deployment/schemind-frontend -n schemind --timeout=120s
        //         """
        //     }
        // }

        // ── 6. Cleanup Local Images ──────────────────────────────────────────
        stage('Cleanup Local Images') {
            steps {
                echo '🧹 Cleaning up local Docker images...'
                sh "docker rmi ${FRONTEND_IMAGE}:${IMAGE_TAG} || true"
                sh "docker rmi ${BACKEND_IMAGE}:${IMAGE_TAG}  || true"
            }
        }

    }

    post {
        success {
            echo '✅ Pipeline completed successfully!'
            echo ''
            echo '📦 Docker Hub Images:'
            echo "   Frontend : https://hub.docker.com/r/${FRONTEND_IMAGE}"
            echo "   Backend  : https://hub.docker.com/r/${BACKEND_IMAGE}"
            echo ''
            echo '🌐 Application URLs (replace NODE_IP with your cluster node IP):'
            echo "   Frontend  : http://${K8S_NODE_IP}:30080"
            echo "   Backend   : http://${K8S_NODE_IP}:30081/api/health"
        }
        failure {
            echo '❌ Pipeline failed. Check the logs above for details.'
        }
        always {
            sh 'docker logout || true'
        }
    }
}
