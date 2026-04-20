pipeline {
    agent any

    environment {
        DOCKERHUB_USER = 'prajitpranavk'
        FRONTEND_IMAGE = "${DOCKERHUB_USER}/schemind-frontend"
        BACKEND_IMAGE  = "${DOCKERHUB_USER}/schemind-backend"
        IMAGE_TAG      = "latest"
        // Set this to your K8s Node IP so the frontend can reach the backend
        K8S_NODE_IP    = "${env.K8S_NODE_IP ?: 'localhost'}"
    }

    stages {

        stage('Clone Repository') {
            steps {
                echo '📥 Cloning repository...'
                checkout scm
            }
        }

        stage('Build Backend Docker Image') {
            steps {
                echo '🔨 Building Backend Docker image...'
                sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} -f backend/Dockerfile ./backend"
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                echo '🔨 Building Frontend Docker image...'
                sh """
                    docker build \
                        --build-arg VITE_API_URL=http://${K8S_NODE_IP}:30081 \
                        -t ${FRONTEND_IMAGE}:${IMAGE_TAG} \
                        -f Dockerfile.frontend .
                """
            }
        }

        stage('Docker Login') {
            steps {
                echo '🔐 Logging in to Docker Hub...'
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"
                }
            }
        }

        stage('Push Images to Docker Hub') {
            steps {
                echo '🚀 Pushing images to Docker Hub...'
                sh "docker push ${BACKEND_IMAGE}:${IMAGE_TAG}"
                sh "docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}"
            }
        }

        stage('Cleanup Local Images') {
            steps {
                echo '🧹 Cleaning up local Docker images...'
                sh "docker rmi ${FRONTEND_IMAGE}:${IMAGE_TAG} || true"
                sh "docker rmi ${BACKEND_IMAGE}:${IMAGE_TAG} || true"
            }
        }

    }

    post {
        success {
            echo '✅ Pipeline completed successfully! Images pushed to Docker Hub.'
            echo "   Frontend : https://hub.docker.com/r/${FRONTEND_IMAGE}"
            echo "   Backend  : https://hub.docker.com/r/${BACKEND_IMAGE}"
            echo ''
            echo '👉 Next: Run on your cluster:'
            echo '   kubectl apply -f k8s/frontend.yaml'
            echo '   kubectl apply -f k8s/backend.yaml'
        }
        failure {
            echo '❌ Pipeline failed. Check the logs above for errors.'
        }
        always {
            sh 'docker logout || true'
        }
    }
}
