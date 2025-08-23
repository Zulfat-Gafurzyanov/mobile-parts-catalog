cd /путь до проекта/mobile-parts-catalog

# Проверяем, не запущен ли уже бот
if [ -f bot.pid ]; then
    OLD_PID=$(cat bot.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "Bot is already running with PID $OLD_PID"
        exit 1
    fi
fi

# Активируем виртуальное окружение
source venv/bin/activate

# Запускаем бота
nohup python telegram_bot/main.py > logs/bot.log 2>&1 &
echo $! > bot.pid
echo "Bot started with PID $(cat bot.pid)"
