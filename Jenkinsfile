pipeline {
    agent any

    environment {
        DOCKERHUB_USER = 'faheem313'
        FRONTEND_IMAGE = "${DOCKERHUB_USER}/schemind-frontend"
        BACKEND_IMAGE  = "${DOCKERHUB_USER}/schemind-backend"
        IMAGE_TAG      = "build-${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout Source') {
            steps {
                echo '📥 Cloning repository...'
                checkout scm
            }
        }

        stage('Docker Diagnostics') {
            steps {
                echo '🔎 Checking Docker access...'
                sh 'whoami'
                sh 'groups || true'
                sh 'docker version'
                sh 'docker info || true'
            }
        }

        stage('Test Backend') {
            steps {
                echo '🧪 Running backend checks...'
                dir('backend') {
                    sh 'npm install --legacy-peer-deps'
                    sh 'node --check server.js && echo "✅ Syntax OK"'
                }
            }
        }

        stage('Build Backend Docker Image') {
            steps {
                echo '🔨 Building Backend Docker image...'
                sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest -f backend/Dockerfile ./backend"
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                echo '🔨 Building Frontend Docker image...'
                sh '''
                    docker build \
                        --build-arg VITE_API_URL=http://localhost:30081 \
                        -t ${FRONTEND_IMAGE}:${IMAGE_TAG} \
                        -t ${FRONTEND_IMAGE}:latest \
                        -f Dockerfile.frontend .
                '''
            }
        }

        stage('Docker Login & Push') {
            steps {
                echo '🔐 Logging in and pushing to Docker Hub...'
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                    sh "docker push ${BACKEND_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${BACKEND_IMAGE}:latest"
                    sh "docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${FRONTEND_IMAGE}:latest"
                }
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
            echo '✅ Pipeline completed successfully!'
            echo "📦 Frontend: https://hub.docker.com/r/${FRONTEND_IMAGE}"
            echo "📦 Backend:  https://hub.docker.com/r/${BACKEND_IMAGE}"
        }
        failure {
            echo '❌ Pipeline failed. Check the logs above.'
        }
        always {
            sh 'docker logout || true'
        }
    }
}
