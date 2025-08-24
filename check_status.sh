#!/bin/bash
echo "=== Статус Mobile Parts Catalog ==="
echo ""

# Проверка бота
echo "📱 Telegram Bot:"
if [ -f ~/zulfat/mobile-parts-catalog/bot.pid ]; then
    PID=$(cat ~/zulfat/mobile-parts-catalog/bot.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "   ✅ Работает (PID: $PID)"
    else
        echo "   ❌ Не работает (процесс не найден)"
    fi
else
    echo "   ❌ Не запущен"
fi

# Проверка каталога
echo ""
echo "📄 Каталог товаров:"
if [ -f ~/miniapp-mobile-catalog/public_html/catalog.json ]; then
    UPDATED=$(stat -c %y ~/miniapp-mobile-catalog/public_html/catalog.json | cut -d. -f1)
    COUNT=$(grep -o '"Наименование"' ~/miniapp-mobile-catalog/public_html/catalog.json | wc -l)
    echo "   ✅ $COUNT товаров"
    echo "   📅 Обновлен: $UPDATED"
else
    echo "   ❌ Файл catalog.json не найден"
fi

# Проверка Excel файла
echo ""
echo "📊 Excel файл:"
if [ -f ~/zulfat/mobile-parts-catalog/backend/input_file/catalog.xlsx ]; then
    SIZE=$(du -h ~/zulfat/mobile-parts-catalog/backend/input_file/catalog.xlsx | cut -f1)
    echo "   ✅ Найден (размер: $SIZE)"
else
    echo "   ⚠️  Не найден - загрузите catalog.xlsx в backend/input_file/"
fi

# Проверка веб-доступа
echo ""
echo "🌐 Веб-доступ:"
if [ -d ~/miniapp-mobile-catalog/public_html ]; then
    echo "   ✅ Директория public_html существует"
    echo "   📍 URL: https://miniapp-mobile-parts.store/"
else
    echo "   ❌ Директория public_html не найдена"
fi

echo ""
echo "=== Конец проверки ==="
