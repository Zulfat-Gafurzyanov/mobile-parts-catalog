# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция проверки статуса
status() {
    if pgrep -f "python3 main.py" > /dev/null; then
        echo -e "${GREEN}✓ Бот запущен${NC}"
        echo "Процессы:"
        ps aux | grep "python3 main.py" | grep -v grep
    else
        echo -e "${YELLOW}✗ Бот не запущен${NC}"
    fi
}

# Функция запуска
start() {
    if pgrep -f "python3 main.py" > /dev/null; then
        echo -e "${YELLOW}Бот уже запущен!${NC}"
        return 1
    fi
    
    echo -e "${GREEN}Запуск бота...${NC}"
    ssh localhost -p222 "cd ~/zulfat/mobile-parts-catalog/ && \
        source venv/bin/activate && \
        cd telegram_bot/ && \
        nohup python3 main.py > bot.log 2>&1 &"
    
    sleep 2
    status
}

# Функция остановки
stop() {
    if ! pgrep -f "python3 main.py" > /dev/null; then
        echo -e "${YELLOW}Бот не запущен${NC}"
        return 1
    fi
    
    echo -e "${RED}Остановка бота...${NC}"
    pkill -f "python3 main.py"
    sleep 2
    status
}

# Функция перезапуска
restart() {
    stop
    sleep 1
    start
}

# Функция просмотра логов
logs() {
    ssh localhost -p222 "tail -f ~/zulfat/mobile-parts-catalog/telegram_bot/bot.log"
}

# Главное меню
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    *)
        echo "Использование: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "  start   - Запустить бота"
        echo "  stop    - Остановить бота"
        echo "  restart - Перезапустить бота"
        echo "  status  - Проверить статус"
        echo "  logs    - Показать логи"
        exit 1
        ;;
esac