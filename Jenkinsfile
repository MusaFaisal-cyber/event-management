pipeline {
    agent any
    stages {
        stage('Checkout from GitHub') {
            steps {
                checkout scm
            }
        }
        stage('Install Docker') {
            steps {
                sh '''
                    if ! command -v docker >/dev/null 2>&1; then
                        sudo dnf install -y docker
                    fi
                    sudo systemctl enable --now docker
                    sudo mkdir -p /usr/local/lib/docker/cli-plugins
                    if [ ! -x /usr/local/lib/docker/cli-plugins/docker-buildx ]; then
                        sudo curl -SL https://github.com/docker/buildx/releases/download/v0.19.3/buildx-v0.19.3.linux-amd64 -o /usr/local/lib/docker/cli-plugins/docker-buildx
                        sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx
                    fi
                    sudo docker --version
                '''
            }
        }
        stage('Install Kubernetes (k3s)') {
            steps {
                sh '''
                    if ! command -v k3s >/dev/null 2>&1; then
                        curl -sfL https://get.k3s.io | sudo sh -s - --write-kubeconfig-mode 644
                    fi
                    until sudo k3s kubectl get nodes 2>/dev/null | grep -q " Ready"; do sleep 5; done
                    sudo k3s kubectl get nodes
                '''
            }
        }
        stage('Build Docker Images') {
            steps {
                sh '''
                    sudo docker build -t eventhub-frontend:${BUILD_NUMBER} ./frontend
                    sudo docker build -t eventhub-event-service:${BUILD_NUMBER} ./event-service
                    sudo docker build -t eventhub-registration-service:${BUILD_NUMBER} ./registration-service
                '''
            }
        }
        stage('Code Check') {
            steps {
                sh '''
                    sudo docker run --rm eventhub-event-service:${BUILD_NUMBER} node --check server.js
                    sudo docker run --rm eventhub-registration-service:${BUILD_NUMBER} node --check server.js
                '''
            }
        }
        stage('Load Images into Kubernetes') {
            steps {
                sh '''
                    sudo docker save eventhub-frontend:${BUILD_NUMBER} | sudo k3s ctr images import -
                    sudo docker save eventhub-event-service:${BUILD_NUMBER} | sudo k3s ctr images import -
                    sudo docker save eventhub-registration-service:${BUILD_NUMBER} | sudo k3s ctr images import -
                '''
            }
        }
        stage('Remove Old Demo Apps') {
            steps {
                sh '''
                    sudo k3s kubectl delete deployment frontend backend db booking-service --ignore-not-found
                    sudo k3s kubectl delete service frontend backend db booking-service --ignore-not-found
                    sudo k3s kubectl delete pvc db-pvc --ignore-not-found
                    sudo docker rm -f tier3-frontend tier3-backend tier3-db || true
                '''
            }
        }
        stage('Deploy to Kubernetes (old pods killed)') {
            steps {
                sh '''
                    sed "s/__TAG__/${BUILD_NUMBER}/g" k8s.yaml | sudo k3s kubectl apply -f -
                    sudo k3s kubectl rollout status deployment/mongo --timeout=300s
                    sudo k3s kubectl rollout status deployment/event-service --timeout=300s
                    sudo k3s kubectl rollout status deployment/registration-service --timeout=300s
                    sudo k3s kubectl rollout status deployment/event-frontend --timeout=300s
                    sudo k3s kubectl get pods
                '''
            }
        }
        stage('Smoke Test (data saved and retrieved)') {
            steps {
                sh '''
                    curl -sf --retry 10 --retry-delay 3 --retry-connrefused http://localhost:30080/api/events
                    echo
                    curl -sf -X POST -H "Content-Type: application/json" -d '{"event_id":1,"event_name":"Tech Conference 2026","name":"Jenkins Smoke Test","email":"jenkins@example.com","tickets":1}' http://localhost:30080/api/registrations
                    echo
                    curl -sf http://localhost:30080/api/registrations
                    echo
                '''
            }
        }
        stage('Delete Old Images') {
            steps {
                sh '''
                    PREV=$((BUILD_NUMBER-1))
                    sudo docker rmi eventhub-frontend:${PREV} eventhub-event-service:${PREV} eventhub-registration-service:${PREV} || true
                    sudo k3s crictl rmi --prune || true
                    sudo docker image prune -f
                '''
            }
        }
    }
}
