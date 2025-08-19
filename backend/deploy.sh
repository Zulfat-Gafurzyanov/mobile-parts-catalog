#!/bin/bash

# Скрипт для деплоя Flask API с HTTPS

set -e

echo "🚀 Starting deployment process..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Переменные
SERVER_IP="104.165.244.190"

# Проверка наличия Docker
check_docker() {
    echo "📋 Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Docker не установлен. Устанавливаем...${NC}"
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${YELLOW}Docker Compose не установлен. Устанавливаем...${NC}"
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
    
    echo -e "${GREEN}✅ Docker и Docker Compose установлены${NC}"
}

# Создание структуры директорий
create_directories() {
    echo "📁 Creating directory structure..."
    
    mkdir -p nginx/conf.d
    mkdir -p ssl
    mkdir -p input_data
    mkdir -p logs
    mkdir -p backend
    
    echo -e "${GREEN}✅ Директории созданы${NC}"
}

# Генерация SSL сертификата
generate_ssl() {
    echo "🔐 Checking SSL certificate..."
    
    if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
        echo -e "${YELLOW}SSL сертификаты уже существуют${NC}"
        echo "Хотите создать новые? (y/n)"
        read -r RENEW
        if [ "$RENEW" != "y" ]; then
            return
        fi
    fi
    
    echo "Generating self-signed SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$SERVER_IP" \
        -addext "subjectAltName=IP:$SERVER_IP"
    
    chmod 644 ssl/cert.pem
    chmod 600 ssl/key.pem
    
    echo -e "${GREEN}✅ SSL сертификат создан${NC}"
}

# Проверка Excel файла
check_excel_file() {
    echo "📊 Checking Excel data file..."
    
    if [ -f "input_data/Остатки (4).xlsx" ]; then
        echo -e "${GREEN}✅ Excel файл найден${NC}"
    else
        echo -e "${YELLOW}⚠️  Excel файл не найден!${NC}"
        echo "Поместите файл 'Остатки (4).xlsx' в папку input_data"
        echo "Нажмите Enter после копирования файла..."
        read -r
        
        if [ ! -f "input_data/Остатки (4).xlsx" ]; then
            echo -e "${RED}❌ Файл все еще не найден. Продолжаем без него...${NC}"
        fi
    fi
}

# Создание .env файла
create_env_file() {
    echo "⚙️  Creating .env file..."
    
    cat > .env << EOF
# Server Configuration
SERVER_IP=$SERVER_IP
FLASK_ENV=production
FLASK_APP=app.py
PYTHONUNBUFFERED=1
EOF
    
    echo -e "${GREEN}✅ .env файл создан${NC}"
}

# Остановка старых контейнеров
stop_old_containers() {
    echo "🛑 Stopping old containers..."
    
    docker-compose down 2>/dev/null || true
    
    # Удаляем старые образы для пересборки
    docker rmi flask-api 2>/dev/null || true
    
    echo -e "${GREEN}✅ Старые контейнеры остановлены${NC}"
}

# Сборка и запуск контейнеров
build_and_start() {
    echo "🐳 Building and starting Docker containers..."
    
    # Сборка образов
    docker-compose build --no-cache
    
    # Запуск контейнеров
    docker-compose up -d
    
    echo -e "${GREEN}✅ Контейнеры запущены${NC}"
}

# Проверка состояния
check_status() {
    echo "🔍 Checking deployment status..."
    
    # Ждем запуска
    echo "Waiting for services to start..."
    sleep 10
    
    # Проверяем состояние контейнеров
    echo -e "${BLUE}Container status:${NC}"
    docker-compose ps
    
    echo ""
    echo "Testing endpoints..."
    
    # Тест health endpoint
    echo -n "Testing HTTP health endpoint: "
    if curl -s -f "http://$SERVER_IP/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${RED}❌${NC}"
    fi
    
    # Тест HTTPS
    echo -n "Testing HTTPS health endpoint: "
    if curl -s -f -k "https://$SERVER_IP/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${RED}❌${NC}"
    fi
    
    # Тест API
    echo -n "Testing API endpoint: "
    if curl -s -f -k "https://$SERVER_IP:5000/api/test-cors" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${YELLOW}⚠️${NC}"
    fi
}

# Вывод инструкций
print_instructions() {
    echo ""
    echo "======================================"
    echo -e "${GREEN}    ✅ Deployment Complete!${NC}"
    echo "======================================"
    echo ""
    echo "📌 Your API is now available at:"
    echo -e "${BLUE}   HTTP:  http://$SERVER_IP/api/get_data${NC}"
    echo -e "${BLUE}   HTTPS: https://$SERVER_IP/api/get_data${NC}"
    echo -e "${BLUE}   HTTPS: https://$SERVER_IP:5000/api/get_data${NC}"
    echo ""
    echo "📌 Test endpoints:"
    echo -e "${BLUE}   http://$SERVER_IP/health${NC}"
    echo -e "${BLUE}   https://$SERVER_IP/api/test-cors${NC}"
    echo ""
    echo "📌 Useful commands:"
    echo "   docker-compose logs -f flask-app  # View Flask logs"
    echo "   docker-compose logs -f nginx      # View Nginx logs"
    echo "   docker-compose restart flask-app  # Restart Flask"
    echo "   docker-compose down              # Stop all containers"
    echo "   docker-compose up -d             # Start all containers"
    echo ""
    echo -e "${YELLOW}⚠️  Note: HTTPS uses a self-signed certificate.${NC}"
    echo "   Browsers will show a security warning."
    echo "   Click 'Advanced' and 'Proceed' to continue."
}

# Основной процесс
main() {
    echo "======================================"
    echo "    Flask API HTTPS Deployment"
    echo "    Server: $SERVER_IP"
    echo "======================================"
    echo ""
    
    check_docker
    create_directories
    generate_ssl
    check_excel_file
    create_env_file
    stop_old_containers
    build_and_start
    check_status
    print_instructions
}

# Запуск
main