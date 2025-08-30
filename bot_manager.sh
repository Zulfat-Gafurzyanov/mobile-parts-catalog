#!/bin/bash

# Конфигурация
BOT_DIR="$HOME/zulfat/mobile-parts-catalog/telegram_bot"
LOG_DIR="$BOT_DIR/logs"
LOG_FILE="$LOG_DIR/bot.log"
PID_FILE="$LOG_DIR/bot.pid"
SSH_PORT=222

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для создания директории логов
ensure_log_dir() {
    ssh localhost -p$SSH_PORT "mkdir -p $LOG_DIR" 2>/dev/null
}

# Функция получения PID процесса
get_pid() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            echo "$pid"
            return 0
        fi
    fi
    
    # Если PID файла нет или процесс не существует, ищем по имени
    pgrep -f "python3.*main.py" | head -1
}

# Функция проверки статуса
status() {
    local pid=$(get_pid)
    
    if [ -n "$pid" ]; then
        echo -e "${GREEN}✓ Бот запущен${NC}"
        echo -e "${BLUE}PID:${NC} $pid"
        echo -e "${BLUE}Процесс:${NC}"
        ps -p "$pid" -o pid,ppid,user,%cpu,%mem,start,time,cmd --no-headers
        
        # Показываем последние логи
        if [ -f "$LOG_FILE" ]; then
            echo -e "\n${BLUE}Последние записи в логе:${NC}"
            tail -5 "$LOG_FILE"
        fi
    else
        echo -e "${YELLOW}✗ Бот не запущен${NC}"
        
        # Проверяем наличие лог-файла
        if [ -f "$LOG_FILE" ]; then
            echo -e "\n${BLUE}Последняя запись в логе:${NC}"
            tail -1 "$LOG_FILE"
        fi
    fi
}

# Функция запуска
start() {
    local pid=$(get_pid)
    
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Бот уже запущен! (PID: $pid)${NC}"
        return 1
    fi
    
    echo -e "${GREEN}Запуск бота...${NC}"
    
    # Создаем директорию для логов
    ensure_log_dir
    
    # Запускаем бота через SSH
    ssh localhost -p$SSH_PORT "cd $BOT_DIR && \
        source ../venv/bin/activate && \
        nohup python3 -u main.py > /dev/null 2>&1 & \
        echo \$! > $PID_FILE"
    
    # Ждем запуска
    sleep 3
    
    # Проверяем статус
    pid=$(get_pid)
    if [ -n "$pid" ]; then
        echo -e "${GREEN}✓ Бот успешно запущен (PID: $pid)${NC}"
        
        # Показываем первые логи
        if [ -f "$LOG_FILE" ]; then
            echo -e "\n${BLUE}Начальные логи:${NC}"
            tail -10 "$LOG_FILE"
        fi
    else
        echo -e "${RED}✗ Ошибка запуска бота${NC}"
        
        # Показываем ошибки из лога
        if [ -f "$LOG_FILE" ]; then
            echo -e "\n${RED}Последние записи в логе:${NC}"
            tail -20 "$LOG_FILE"
        fi
        return 1
    fi
}

# Функция остановки
stop() {
    local pid=$(get_pid)
    
    if [ -z "$pid" ]; then
        echo -e "${YELLOW}Бот не запущен${NC}"
        # Очищаем PID файл
        rm -f "$PID_FILE" 2>/dev/null
        return 1
    fi
    
    echo -e "${RED}Остановка бота (PID: $pid)...${NC}"
    
    # Сначала пытаемся мягко остановить
    kill -TERM "$pid" 2>/dev/null
    
    # Ждем остановки
    local count=0
    while [ $count -lt 10 ] && kill -0 "$pid" 2>/dev/null; do
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    echo
    
    # Если процесс все еще работает, убиваем принудительно
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "${YELLOW}Принудительная остановка...${NC}"
        kill -KILL "$pid" 2>/dev/null
        sleep 1
    fi
    
    # Удаляем PID файл
    rm -f "$PID_FILE" 2>/dev/null
    
    echo -e "${GREEN}✓ Бот остановлен${NC}"
}

# Функция перезапуска
restart() {
    echo -e "${BLUE}Перезапуск бота...${NC}"
    stop
    sleep 2
    start
}

# Функция просмотра логов
logs() {
    if [ ! -f "$LOG_FILE" ]; then
        echo -e "${YELLOW}Файл логов не найден: $LOG_FILE${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Просмотр логов (Ctrl+C для выхода)...${NC}"
    tail -f "$LOG_FILE"
}

# Функция очистки логов
clear_logs() {
    echo -e "${YELLOW}Очистка логов...${NC}"
    
    if [ -f "$LOG_FILE" ]; then
        # Сохраняем последние 100 строк
        tail -100 "$LOG_FILE" > "$LOG_FILE.tmp"
        mv "$LOG_FILE.tmp" "$LOG_FILE"
        echo -e "${GREEN}✓ Логи очищены (сохранены последние 100 строк)${NC}"
    else
        echo -e "${YELLOW}Файл логов не найден${NC}"
    fi
}

# Функция показа информации
info() {
    echo -e "${BLUE}=== Информация о боте ===${NC}"
    echo -e "${BLUE}Директория:${NC} $BOT_DIR"
    echo -e "${BLUE}Лог-файл:${NC} $LOG_FILE"
    echo -e "${BLUE}PID-файл:${NC} $PID_FILE"
    echo -e "${BLUE}SSH порт:${NC} $SSH_PORT"
    echo
    status
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
    clear-logs)
        clear_logs
        ;;
    info)
        info
        ;;
    *)
        echo -e "${BLUE}Использование:${NC} $0 {start|stop|restart|status|logs|clear-logs|info}"
        echo ""
        echo -e "  ${GREEN}start${NC}       - Запустить бота"
        echo -e "  ${RED}stop${NC}        - Остановить бота"
        echo -e "  ${YELLOW}restart${NC}     - Перезапустить бота"
        echo -e "  ${BLUE}status${NC}      - Проверить статус"
        echo -e "  ${BLUE}logs${NC}        - Показать логи в реальном времени"
        echo -e "  ${YELLOW}clear-logs${NC}  - Очистить старые логи"
        echo -e "  ${BLUE}info${NC}        - Показать полную информацию"
        exit 1
        ;;
esac