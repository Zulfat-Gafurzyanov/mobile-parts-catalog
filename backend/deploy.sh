# Загружаем переменные из .env
if [ -f .env ]; then
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
SSH_CMD="ssh -p ${SERVER_PORT:-22} $SERVER_USER@$SERVER_IP"
SCP_CMD="scp -P ${SERVER_PORT:-22}"

# Функция деплоя
deploy() {
    echo "🚀 Начинаем деплой на $SERVER_IP..."
    
    # 1. Создаем архив
    echo "📦 Создаем архив..."
    tar -czf deploy.tar.gz \
        --exclude='*.pyc' \
        --exclude='__pycache__' \
        --exclude='venv' \
        --exclude='.git' \
        backend/ input_data/ .env docker-compose.prod.yml 2>/dev/null || true
    
    # 2. Копируем на сервер
    echo "📤 Копируем файлы на сервер..."
    $SSH_CMD "mkdir -p $REMOTE_DIR"
    $SCP_CMD deploy.tar.gz $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
    
    # 3. Разворачиваем на сервере
    echo "🔧 Разворачиваем на сервере..."
    $SSH_CMD << EOF
        cd $REMOTE_DIR
        tar -xzf deploy.tar.gz
        rm deploy.tar.gz
        
        # Останавливаем старые контейнеры
        docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
        
        # Запускаем новые
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Ждем запуска
        sleep 5
        
        # Показываем статус
        docker-compose -f docker-compose.prod.yml ps
EOF
    
    # 4. Удаляем локальный архив
    rm -f deploy.tar.gz
    
    echo "✅ Деплой завершен!"
    echo "📍 API доступен по адресу: http://$SERVER_IP/api/get_data"
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
    *)
        echo "Mobile Parts Catalog - Deploy Script"
        echo "====================================="
        echo ""
        echo "Использование: ./deploy-simple.sh [команда]"
        echo ""
        echo "Команды:"
        echo "  deploy   - Полный деплой на сервер"
        echo "  logs     - Показать логи"
        echo "  restart  - Перезапустить контейнеры"
        echo "  stop     - Остановить контейнеры"
        echo "  status   - Показать статус"
        echo "  setup    - Установить Docker на сервер"
        echo ""
        echo "Пример: ./deploy-simple.sh deploy"
        ;;
esac