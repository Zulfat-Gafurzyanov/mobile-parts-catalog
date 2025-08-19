# Скрипт для автоматического деплоя с HTTPS

set -e

echo "🚀 Starting deployment process..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка наличия необходимых инструментов
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker не установлен${NC}"
        echo "Установите Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose не установлен${NC}"
        echo "Установите Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Все требования выполнены${NC}"
}

# Настройка переменных окружения
setup_environment() {
    echo "⚙️  Setting up environment..."
    
    if [ ! -f .env ]; then
        cp backend/.env.example .env
        echo -e "${YELLOW}⚠️  Создан файл .env - отредактируйте его перед продолжением${NC}"
        echo "Введите ваш домен (например, api.yourdomain.com):"
        read DOMAIN
        echo "DOMAIN=$DOMAIN" >> .env
        
        echo "Введите ваш email для Let's Encrypt:"
        read EMAIL
        echo "EMAIL=$EMAIL" >> .env
        
        echo "Введите IP вашего сервера:"
        read SERVER_IP
        echo "SERVER_IP=$SERVER_IP" >> .env
    fi
    
    source .env
}

# Создание структуры директорий
create_directories() {
    echo "📁 Creating directory structure..."
    
    mkdir -p nginx/conf.d
    mkdir -p certbot/conf
    mkdir -p certbot/www
    mkdir -p input_data
    mkdir -p logs
    
    echo -e "${GREEN}✅ Директории созданы${NC}"
}

# Первоначальная настройка SSL
setup_ssl() {
    echo "🔒 Setting up SSL certificates..."
    
    # Проверяем, существуют ли уже сертификаты
    if [ -d "certbot/conf/live/$DOMAIN" ]; then
        echo -e "${YELLOW}⚠️  Сертификаты уже существуют${NC}"
        echo "Хотите обновить их? (y/n)"
        read RENEW
        if [ "$RENEW" != "y" ]; then
            return
        fi
    fi
    
    # Запускаем временный nginx для получения сертификата
    echo "Starting temporary nginx for certificate validation..."
    docker-compose up -d nginx
    
    # Получаем сертификат
    echo "Obtaining SSL certificate..."
    docker-compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN
    
    echo -e "${GREEN}✅ SSL сертификаты получены${NC}"
}

# Обновление конфигурации nginx с правильным доменом
update_nginx_config() {
    echo "📝 Updating nginx configuration..."
    
    sed -i "s/your-domain.com/$DOMAIN/g" nginx/conf.d/app.conf
    
    echo -e "${GREEN}✅ Конфигурация nginx обновлена${NC}"
}

# Копирование данных Excel
copy_excel_data() {
    echo "📊 Copying Excel data..."
    
    if [ -f "input_data/Остатки (4).xlsx" ]; then
        echo -e "${GREEN}✅ Excel файл уже существует${NC}"
    else
        echo -e "${YELLOW}⚠️  Поместите файл 'Остатки (4).xlsx' в папку input_data${NC}"
        echo "Нажмите Enter после копирования файла..."
        read
    fi
}

# Запуск контейнеров
start_containers() {
    echo "🐳 Starting Docker containers..."
    
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    
    echo -e "${GREEN}✅ Контейнеры запущены${NC}"
}

# Проверка состояния
check_status() {
    echo "🔍 Checking deployment status..."
    
    sleep 5
    
    # Проверяем состояние контейнеров
    docker-compose ps
    
    # Проверяем доступность API
    echo "Testing API endpoint..."
    curl -k https://$DOMAIN/health || curl http://$SERVER_IP:5000/health
    
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo ""
    echo "📌 Your API is now available at:"
    echo "   https://$DOMAIN/api/get_data"
    echo ""
    echo "📌 Useful commands:"
    echo "   docker-compose logs -f flask-app  # View Flask logs"
    echo "   docker-compose logs -f nginx      # View Nginx logs"
    echo "   docker-compose restart flask-app  # Restart Flask"
    echo "   docker-compose down              # Stop all containers"
    echo "   docker-compose up -d             # Start all containers"
}

# Основной процесс
main() {
    echo "======================================"
    echo "    Flask API HTTPS Deployment"
    echo "======================================"
    echo ""
    
    check_requirements
    setup_environment
    create_directories
    update_nginx_config
    copy_excel_data
    setup_ssl
    start_containers
    check_status
    
    echo ""
    echo "======================================"
    echo -e "${GREEN}    ✅ Deployment Complete!${NC}"
    echo "======================================"
}

# Запуск
main