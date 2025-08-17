#!/bin/bash

# Скрипт для деплоя бота на VPS

set -e  # Остановка при ошибке

echo "🚀 Начинаем деплой Telegram бота..."

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Устанавливаем..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker установлен. Перелогиньтесь или выполните: newgrp docker"
    exit 1
fi

# Проверка наличия docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Устанавливаем..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose установлен"
fi

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "Скопируйте .env.example в .env и заполните необходимые переменные:"
    echo "cp .env.example .env"
    echo "nano .env"
    exit 1
fi

# Остановка старых контейнеров
echo "🛑 Останавливаем старые контейнеры..."
docker-compose down

# Сборка и запуск
echo "🔨 Собираем и запускаем контейнеры..."
docker-compose up -d --build

# Проверка статуса
echo "📊 Проверяем статус контейнеров..."
docker-compose ps

echo "📋 Логи бота:"
docker-compose logs bot --tail=20

echo "✅ Деплой завершен!"
echo ""
echo "Полезные команды:"
echo "  Просмотр логов: docker-compose logs -f bot"
echo "  Перезапуск: docker-compose restart bot"
echo "  Остановка: docker-compose down"
echo "  Обновление: git pull && ./deploy.sh"