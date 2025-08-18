# Используем официальный Python образ
FROM python:3.11-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файл требований
COPY backend/requirements.txt .

# Обновляем pip и устанавливаем зависимости
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Копируем исходный код приложения
COPY backend/ .

# Создаем директорию для данных
RUN mkdir -p input_data

# Копируем данные (если файл существует)
COPY input_data/ input_data/ 2>/dev/null || echo "No input_data directory found"

# Открываем порт
EXPOSE 5000

# Устанавливаем переменные окружения для Flask
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Запускаем приложение
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=5000"]