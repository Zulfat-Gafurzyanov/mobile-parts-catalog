# 📱 Mobile Parts Catalog

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Telegram Bot API](https://img.shields.io/badge/Telegram%20Bot%20API-6.0-blue.svg)](https://core.telegram.org/bots/api)

Telegram Mini App для управления каталогом запчастей мобильных устройств с автоматической конвертацией Excel → JSON

## 🎯 Особенности

- 🤖 **Telegram Bot** - полная интеграция с Telegram Web App
- 📊 **Excel → JSON конвертер** - автоматическая обработка каталога
- 🔍 **Умный поиск** - по названию, модели, бренду
- 📱 **Адаптивный дизайн** - оптимизирован для мобильных устройств
- 🎨 **Современный UI** - светлая тема, плавные анимации
- ⚡ **Быстрая загрузка** - оптимизированная пагинация
- 🔄 **Автообновление** - конвертация по расписанию через cron

## 📸 Скриншоты

<div align="center">
  <img src="docs/screenshot1.png" alt="Главная страница" width="300"/>
  <img src="docs/screenshot2.png" alt="Карточка товара" width="300"/>
</div>

## 🚀 Быстрый старт

### Требования

- Python 3.10+
- pip (менеджер пакетов Python)
- Telegram Bot Token
- Веб-сервер с SSL (для production)

### Установка

1. **Клонируйте репозиторий**
```bash
git clone https://github.com/username/mobile-parts-catalog.git
cd mobile-parts-catalog
```

2. **Создайте виртуальное окружение**
```bash
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows
```

3. **Установите зависимости**
```bash
pip install -r requirements.txt
```

4. **Настройте окружение**
```bash
cp .env.example .env
nano .env
```

Отредактируйте `.env`:
```env
# Настройки Telegram Bot
BOT_TOKEN=YOUR_BOT_TOKEN_HERE
MINIAPP_URL=https://your-domain.com/frontend/

# Настройки логирования
LOG_LEVEL=INFO
LOG_FORMAT=[%(asctime)s] #%(levelname)-8s %(filename)s:%(lineno)d - %(name)s - %(message)s
```

5. **Создайте необходимые директории**
```bash
mkdir -p backend/input_file
mkdir -p backend/logs_and_hashes
mkdir -p logs
```

6. **Добавьте Excel файл с каталогом**
```bash
cp your_catalog.xlsx backend/input_file/catalog.xlsx
```

7. **Запустите конвертацию**
```bash
cd backend
python converter.py
```

8. **Запустите бота**
```bash
python telegram_bot/main.py
```

## 📊 Формат Excel файла

### Структура таблицы

| Колонка | Тип | Обязательное | Описание | Пример |
|---------|-----|--------------|----------|---------|
| **Бренд** | Текст | ✅ | Производитель | Xiaomi, Samsung, Apple |
| **Наименование** | Текст | ✅ | Полное название | LCD дисплей для Xiaomi Redmi 12C |
| **Цена** | Число | ✅ | Цена в рублях | 2500.00 |
| **Остаток** | Целое число | ✅ | Количество на складе | 5 |
| **Описание** | Текст | ⚪ | Детальное описание | LCD дисплей с тачскрином (черный) оригинал |
| **Фото** | URL | ⚪ | Ссылка на изображение | https://example.com/image.jpg |

### Требования к изображениям

- **Размер**: 800×800px (оптимально)
- **Формат**: JPEG, PNG, WebP
- **Вес**: до 500KB
- **Фон**: белый или светлый

### Пример заполнения

```excel
| Бренд  | Наименование                    | Цена    | Остаток | Описание                | Фото |
|--------|--------------------------------|---------|---------|-------------------------|------|
| Xiaomi | LCD дисплей для Xiaomi Redmi 12C | 2500.00 | 3       | Оригинал, черный цвет   | URL  |
| Apple  | Аккумулятор для iPhone 13      | 3500.50 | 0       | Battery 3095 mAh        | None |
```

## 🔧 Конфигурация

### Структура проекта

```
mobile-parts-catalog/
├── backend/                    # Бэкенд
│   ├── converter.py           # Excel → JSON конвертер
│   ├── input_file/            # Входные Excel файлы
│   │   └── catalog.xlsx       # Файл каталога
│   └── logs_and_hashes/       # Логи и хэши
│       ├── converter.log      # Лог конвертации
│       └── .last_hash         # Хэш последнего файла
│
├── frontend/                   # Фронтенд Mini App
│   ├── index.html             # Главная страница
│   ├── styles.css             # Стили
│   ├── app.js                 # Логика приложения
│   └── catalog.json           # Сконвертированный каталог
│
├── telegram_bot/              # Telegram бот
│   ├── main.py               # Точка входа
│   ├── config/               # Конфигурация
│   ├── handlers/             # Обработчики команд
│   ├── keyboards/            # Клавиатуры
│   └── lexicon/              # Тексты сообщений
│
├── .env.example              # Пример переменных окружения
├── requirements.txt          # Python зависимости
├── start_bot_example.sh      # Скрипт запуска бота
└── stop_bot_example.sh       # Скрипт остановки бота
```

### Автоматическая конвертация

Для автоматической конвертации Excel файла при изменениях:

```bash
# Добавьте в crontab
crontab -e

# Конвертация каждые 30 минут
*/30 * * * * cd /path/to/backend && python converter.py >> logs/converter.log 2>&1
```

## 🌐 Деплой на сервер

### 1. Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install python3-pip python3-venv nginx certbot python3-certbot-nginx git -y
```

### 2. Клонирование и настройка проекта

```bash
# Переход в директорию веб-сервера
cd /var/www

# Клонирование репозитория
sudo git clone https://github.com/username/mobile-parts-catalog.git
cd mobile-parts-catalog

# Создание виртуального окружения
python3 -m venv venv
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt

# Копирование и настройка конфигурации
cp .env.example .env
nano .env  # Отредактируйте BOT_TOKEN и MINIAPP_URL

# Настройка прав доступа
sudo chown -R www-data:www-data /var/www/mobile-parts-catalog
sudo chmod -R 755 /var/www/mobile-parts-catalog
```

### 3. Настройка Nginx

Создайте файл конфигурации:

```bash
sudo nano /etc/nginx/sites-available/mobile-parts-catalog
```

Содержимое:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    root /var/www/mobile-parts-catalog;
    
    location /frontend/ {
        try_files $uri $uri/ /frontend/index.html;
        add_header X-Frame-Options "ALLOWALL";
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    location /frontend/catalog.json {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/mobile-parts-catalog /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Получение SSL сертификата

```bash
sudo certbot --nginx -d your-domain.com
```

### 5. Настройка systemd сервиса для бота

Создайте файл сервиса:

```bash
sudo nano /etc/systemd/system/telegram-parts-bot.service
```

Содержимое:

```ini
[Unit]
Description=Telegram Parts Catalog Bot
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/mobile-parts-catalog
Environment="PATH=/var/www/mobile-parts-catalog/venv/bin"
ExecStart=/var/www/mobile-parts-catalog/venv/bin/python telegram_bot/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Запустите сервис:

```bash
sudo systemctl daemon-reload
sudo systemctl enable telegram-parts-bot
sudo systemctl start telegram-parts-bot
sudo systemctl status telegram-parts-bot
```

### 6. Использование скриптов запуска/остановки

Скопируйте и настройте скрипты:

```bash
cp start_bot_example.sh start_bot.sh
cp stop_bot_example.sh stop_bot.sh
chmod +x start_bot.sh stop_bot.sh

# Отредактируйте пути в скриптах
nano start_bot.sh
```

Запуск бота через скрипт:

```bash
./start_bot.sh
```

Остановка бота:

```bash
./stop_bot.sh
```

### 7. Настройка автоматической конвертации

```bash
# Откройте crontab для пользователя www-data
sudo crontab -u www-data -e

# Добавьте строку для конвертации каждые 30 минут
*/30 * * * * cd /var/www/mobile-parts-catalog/backend && /var/www/mobile-parts-catalog/venv/bin/python converter.py >> /var/www/mobile-parts-catalog/logs/converter_cron.log 2>&1
```

## 📝 API команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Запуск бота и отображение главного меню |
| `/help` | Справка по использованию бота |

## 🔍 Мониторинг и логи

### Просмотр логов бота

```bash
# Логи systemd сервиса
sudo journalctl -u telegram-parts-bot -f

# Логи из файла
tail -f logs/bot.log
```

### Просмотр логов конвертации

```bash
tail -f backend/logs_and_hashes/converter.log
```

### Проверка статуса

```bash
# Статус бота
sudo systemctl status telegram-parts-bot

# Статус Nginx
sudo systemctl status nginx

# Проверка процесса бота
ps aux | grep python | grep main.py
```

## 🐛 Решение проблем

### Бот не запускается

```bash
# Проверьте логи
sudo journalctl -u telegram-parts-bot -n 50

# Проверьте токен
cat .env | grep BOT_TOKEN

# Проверьте права доступа
ls -la /var/www/mobile-parts-catalog
```

### Конвертация не работает

```bash
# Запустите вручную для диагностики
cd backend
python converter.py

# Проверьте права на файлы
ls -la backend/input_file/
ls -la backend/logs_and_hashes/
```

### Mini App не открывается

- Проверьте SSL сертификат (обязателен для Telegram)
- Проверьте MINIAPP_URL в .env
- Проверьте настройки Nginx
- Проверьте CORS заголовки

## 👥 Авторы

[GitHub](https://github.com/Zulfat-Gafurzyanov)
