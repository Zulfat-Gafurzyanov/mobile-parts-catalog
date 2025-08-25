#!/bin/bash

# Переходим в директорию проекта
cd ~/zulfat/mobile-parts-catalog || exit 1

# Проверяем, не запущен ли уже бот
if [ -f bot.pid ]; then
    OLD_PID=$(cat bot.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "Bot is already running with PID $OLD_PID"
        exit 1
    else
        echo "Removing stale PID file"
        rm bot.pid
    fi
fi

# Создаём директорию для логов, если её нет
mkdir -p logs

# Проверяем наличие виртуального окружения
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating..."
    python3 -m venv venv
fi

# Активируем виртуальное окружение
# Используем . вместо source для совместимости с sh
. venv/bin/activate

# Проверяем и устанавливаем зависимости
if ! python -c "import aiogram" 2>/dev/null; then
    echo "Installing aiogram..."
    pip install aiogram
fi

# Проверяем наличие других необходимых зависимостей (добавьте свои)
# pip install -r requirements.txt  # раскомментируйте, если есть requirements.txt

# Запускаем бота
nohup python telegram_bot/main.py > logs/bot.log 2>&1 &
BOT_PID=$!

# Проверяем, что процесс действительно запустился
sleep 2
if ps -p $BOT_PID > /dev/null; then
    echo $BOT_PID > bot.pid
    echo "Bot started successfully with PID $BOT_PID"
    echo "Logs: tail -f logs/bot.log"
else
    echo "Failed to start bot. Check logs/bot.log for errors"
    exit 1
fi