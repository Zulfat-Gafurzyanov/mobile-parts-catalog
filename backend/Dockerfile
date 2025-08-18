# Используем официальный Python образ
FROM python:3.11-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем curl для healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копируем файл требований
COPY requirements.txt .

# Обновляем pip и устанавливаем зависимости включая openpyxl
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir openpyxl

# Копируем исходный код приложения
COPY . .

# Создаем директории
RUN mkdir -p input_data logs

# Открываем порт
EXPOSE 5000

# Устанавливаем переменные окружения для Flask
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Используем gunicorn для production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "30", "app:app"]