#!/bin/bash

# Загружаем переменные из .env (ищем в корне)
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
elif [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Файл .env не найден!"
    echo "Создайте его из .env.example:"
    echo "cp .env.example .env"
    exit 1
fi

# Проверяем обязательные переменные
if [ -z "$SERVER_IP" ] || [ -z "$SERVER_USER" ]; then
    echo "❌ SERVER_IP или SERVER_USER не установлены в .env"
    exit 1
fi

# Переменные
PROJECT="mobile-parts-catalog"
REMOTE_DIR="/opt/$PROJECT"
SSH_CMD="ssh -o StrictHostKeyChecking=no -p ${SERVER_PORT:-22} $SERVER_USER@$SERVER_IP"
SCP_CMD="scp -o StrictHostKeyChecking=no -P ${SERVER_PORT:-22}"

# Функция деплоя
deploy() {
    echo "🚀 Начинаем деплой на $SERVER_IP..."
    
    # 1. Создаем docker-compose.prod.yml если его нет
    if [ ! -f docker-compose.prod.yml ]; then
        echo "📝 Создаем docker-compose.prod.yml..."
        cp docker-compose.prod.yml docker-compose.prod.yml 2>/dev/null || \
        cat > docker-compose.prod.yml << 'EOL'
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: mobile-parts-api
    ports:
      - "5000:5000"
    volumes:
      - ./input_data:/app/input_data:ro
      - ./logs:/app/logs
    environment:
      - FLASK_ENV=production
      - PYTHONUNBUFFERED=1
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
EOL
    fi
    
    # 2. Создаем архив
    echo "📦 Создаем архив..."
    tar -czf deploy.tar.gz \
        --exclude='*.pyc' \
        --exclude='__pycache__' \
        --exclude='venv' \
        --exclude='.git' \
        --exclude='*.log' \
        --exclude='telegram_bot' \
        input_data/ docker-compose.prod.yml 2>/dev/null || true
    
    # 3. Копируем на сервер
    echo "📤 Копируем файлы на сервер..."
    $SSH_CMD "mkdir -p $REMOTE_DIR"
    $SCP_CMD deploy.tar.gz $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
    
    # 4. Копируем .env файл если есть
    if [ -f .env ]; then
        $SCP_CMD .env $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
    fi
    
    # 5. Разворачиваем на сервере
    echo "🔧 Разворачиваем на сервере..."
    $SSH_CMD << EOF
        cd $REMOTE_DIR
        tar -xzf deploy.tar.gz
        rm deploy.tar.gz
        
        # Создаем директорию для логов
        mkdir -p /logs
        
        # Проверяем наличие input_data
        if [ ! -d input_data ]; then
            echo "⚠️ Директория input_data не найдена, создаем..."
            mkdir -p input_data
        fi
        
        # Проверяем наличие Excel файла
        if [ ! -f "input_data/Остатки (4).xlsx" ]; then
            echo "⚠️ Файл 'Остатки (4).xlsx' не найден в input_data/"
            echo "   Загрузите файл вручную после деплоя"
        fi
        
        # Останавливаем старые контейнеры
        docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
        
        # Запускаем новые
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Ждем запуска
        echo "⏳ Ожидаем запуск контейнера..."
        sleep 5
        
        # Показываем статус
        docker-compose -f docker-compose.prod.yml ps
EOF
    
    # 6. Удаляем локальный архив
    rm -f deploy.tar.gz
    
    # 7. Проверяем доступность API
    echo "🔍 Проверяем доступность API..."
    sleep 2
    if curl -s -f "http://$SERVER_IP:5000/health" > /dev/null 2>&1; then
        echo "✅ API работает!"
    else
        echo "⚠️ API пока недоступен. Проверьте логи: ./deploy.sh logs"
    fi
    
    echo ""
    echo "✅ Деплой завершен!"
    echo "📍 API endpoint: http://$SERVER_IP:5000/api/get_data"
    echo "📍 Health check: http://$SERVER_IP:5000/health"
}

# Функция просмотра логов
logs() {
    echo "📋 Логи с сервера:"
    $SSH_CMD "cd $REMOTE_DIR && docker-compose -f docker-compose.prod.yml logs --tail=50"
}

# Функция перезапуска
restart() {
    echo "🔄 Перезапускаем контейнеры..."
    $SSH_CMD "cd $REMOTE_DIR && docker-compose -f docker-compose.prod.yml restart"
    echo "✅ Контейнеры перезапущены!"
}

# Функция остановки
stop() {
    echo "⏹️  Останавливаем контейнеры..."
    $SSH_CMD "cd $REMOTE_DIR && docker-compose -f docker-compose.prod.yml down"
    echo "✅ Контейнеры остановлены!"
}

# Функция статуса
status() {
    echo "📊 Статус контейнеров:"
    $SSH_CMD "cd $REMOTE_DIR && docker-compose -f docker-compose.prod.yml ps"
    echo ""
    echo "🔍 Проверка API:"
    curl -s "http://$SERVER_IP:5000/health" | python -m json.tool 2>/dev/null || echo "API недоступен"
}

# Функция установки Docker на сервер
setup() {
    echo "🔧 Устанавливаем Docker на сервер..."
    $SSH_CMD << 'EOF'
        # Проверяем Docker
        if ! command -v docker &> /dev/null; then
            echo "Устанавливаем Docker..."
            curl -fsSL https://get.docker.com | sh
            systemctl enable docker
            systemctl start docker
        else
            echo "Docker уже установлен"
        fi
        
        # Проверяем Docker Compose
        if ! command -v docker-compose &> /dev/null; then
            echo "Устанавливаем Docker Compose..."
            curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
                -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        else
            echo "Docker Compose уже установлен"
        fi
        
        echo "✅ Установка завершена!"
EOF
}

# Функция загрузки Excel файла
upload() {
    echo "📤 Загрузка Excel файла на сервер..."
    
    if [ -z "$1" ]; then
        echo "❌ Укажите путь к файлу"
        echo "Использование: ./deploy.sh upload путь/к/файлу.xlsx"
        exit 1
    fi
    
    if [ ! -f "$1" ]; then
        echo "❌ Файл $1 не найден"
        exit 1
    fi
    
    echo "Загружаем файл: $1"
    $SCP_CMD "$1" "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/input_data/Остатки (4).xlsx"
    
    echo "✅ Файл загружен! Перезапускаем контейнер..."
    restart
}

# Главное меню
case "${1:-}" in
    deploy)
        deploy
        ;;
    logs)
        logs
        ;;
    restart)
        restart
        ;;
    stop)
        stop
        ;;
    status)
        status
        ;;
    setup)
        setup
        ;;
    upload)
        upload "$2"
        ;;
    *)
        echo "Mobile Parts Catalog - Deploy Script"
        echo "====================================="
        echo ""
        echo "Использование: ./deploy.sh [команда]"
        echo ""
        echo "Команды:"
        echo "  setup    - Установить Docker на сервер"
        echo "  deploy   - Полный деплой на сервер"
        echo "  logs     - Показать логи"
        echo "  restart  - Перезапустить контейнеры"
        echo "  stop     - Остановить контейнеры"
        echo "  status   - Показать статус"
        echo "  upload   - Загрузить Excel файл"
        echo ""
        echo "Примеры:"
        echo "  ./deploy.sh deploy"
        echo "  ./deploy.sh upload input_data/Остатки.xlsx"
        ;;
esac