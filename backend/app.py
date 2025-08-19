import os
import logging

from environs import Env
from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd


env = Env()
env.read_env()
app = Flask(__name__)

server_ip = env.str("SERVER_IP")
# Настройка CORS
CORS(app,
     origins=[
         "https://web.telegram.org",  # Telegram Web Apps
         "https://your-domain.com",   # Ваш домен
         f"http://{server_ip}/api/get_data",
     ],
     allow_headers=["Content-Type", "Authorization"],
     methods=("GET",))

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Путь к файлу
EXCEL_FILE_PATH = os.path.join('..', 'input_data', 'Остатки (4).xlsx')


# Маршрут для проверки CORS
@app.route('/api/test-cors', methods=['GET'])
def test_cors():
    """Тестовый эндпоинт для проверки CORS"""
    return jsonify({
        "message": "CORS is working!",
        "allowed_origins": "*",  # или список разрешенных доменов
        "timestamp": pd.Timestamp.now().isoformat()
    }), 200


# Маршрут для проверки состояния сервиса
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200


# Проверка наличия файла и чтение данных из XLSX
@app.route('/api/get_data', methods=['GET'])
def get_data():
    try:
        # Проверка существования файла
        if not os.path.exists(EXCEL_FILE_PATH):
            logger.error(f"Файл по пути: {EXCEL_FILE_PATH} не найден")
            return jsonify({"error": "Data file not found"}), 404

        # Чтение данных из XLSX-файла
        df = pd.read_excel(EXCEL_FILE_PATH, engine='openpyxl')
        logger.info(f"Successfully loaded {len(df)} rows from Excel file")

        technics_dict = {}
        specific_column_model = 'Полная группа'

        # Проверка наличия нужной колонки
        if specific_column_model not in df.columns:
            logger.error(f"Column '{specific_column_model}' not found in Excel file")
            return jsonify({"error": f"Required column '{specific_column_model}' not found"}), 400

        # Перебираем каждую строку
        for idx, row in df.iterrows():
            try:
                row_parts = row[specific_column_model].split('/')
                if len(row_parts) >= 2:
                    model = row_parts[1]
                else:
                    logger.warning(f"Skipping row {idx}: invalid format in '{specific_column_model}'")
                    continue

                # Формируем словарь для текущей строки
                model_dict = {}
                for col_name in df.columns:
                    value = row[col_name]
                    if pd.isna(value):
                        value = None
                    model_dict[col_name] = value

                # Добавляем в результирующий словарь
                if model in technics_dict:
                    technics_dict[model].append(model_dict)
                else:
                    technics_dict[model] = [model_dict]

            except Exception as e:
                logger.warning(f"Error processing row {idx}: {str(e)}")
                continue

        logger.info(f"Successfully processed data for {len(technics_dict)} models")
        return jsonify(technics_dict), 200

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=False)