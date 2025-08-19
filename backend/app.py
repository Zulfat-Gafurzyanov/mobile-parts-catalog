import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)

# Настройка CORS - открытый доступ для всех источников
CORS(app, 
     origins="*",  # Разрешаем все источники
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
     methods=["GET", "POST", "OPTIONS"],
     supports_credentials=False)  # Отключаем credentials для полной открытости

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Путь к файлу - исправлен для Docker контейнера
EXCEL_FILE_PATH = os.path.join('input_data', 'Остатки (4).xlsx')

@app.after_request
def after_request(response):
    """Дополнительные CORS заголовки для гарантии работы"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/api/test-cors', methods=['GET', 'OPTIONS'])
def test_cors():
    """Тестовый эндпоинт для проверки CORS"""
    return jsonify({
        "message": "CORS is working!",
        "allowed_origins": "ALL (*)",
        "timestamp": pd.Timestamp.now().isoformat()
    }), 200

@app.route('/health', methods=['GET'])
def health_check():
    """Проверка состояния сервиса"""
    file_exists = os.path.exists(EXCEL_FILE_PATH)
    return jsonify({
        "status": "healthy",
        "excel_file_exists": file_exists,
        "excel_path": EXCEL_FILE_PATH,
        "current_dir": os.getcwd(),
        "input_data_contents": os.listdir('input_data') if os.path.exists('input_data') else []
    }), 200

@app.route('/api/get_data', methods=['GET', 'OPTIONS'])
def get_data():
    """Получение данных из Excel файла"""
    # Обработка preflight запроса
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        # Проверка существования файла
        if not os.path.exists(EXCEL_FILE_PATH):
            logger.error(f"Файл не найден: {EXCEL_FILE_PATH}")
            logger.error(f"Текущая директория: {os.getcwd()}")
            logger.error(f"Содержимое input_data: {os.listdir('input_data') if os.path.exists('input_data') else 'Directory not found'}")
            return jsonify({
                "error": "Data file not found",
                "path": EXCEL_FILE_PATH,
                "current_dir": os.getcwd()
            }), 404

        # Чтение данных из XLSX-файла
        df = pd.read_excel(EXCEL_FILE_PATH, engine='openpyxl')
        logger.info(f"Successfully loaded {len(df)} rows from Excel file")

        technics_dict = {}
        specific_column_model = 'Полная группа'

        # Проверка наличия нужной колонки
        if specific_column_model not in df.columns:
            logger.error(f"Column '{specific_column_model}' not found in Excel file")
            logger.error(f"Available columns: {list(df.columns)}")
            return jsonify({
                "error": f"Required column '{specific_column_model}' not found",
                "available_columns": list(df.columns)
            }), 400

        # Перебираем каждую строку
        for idx, row in df.iterrows():
            try:
                cell_value = row[specific_column_model]
                if pd.isna(cell_value):
                    continue
                    
                row_parts = str(cell_value).split('/')
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
                    elif isinstance(value, (int, float)):
                        # Конвертируем numpy типы в Python типы
                        value = float(value) if isinstance(value, float) else int(value)
                    else:
                        value = str(value)
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
        logger.error(f"Error processing request: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route('/', methods=['GET'])
def index():
    """Корневой маршрут"""
    return jsonify({
        "service": "Flask API",
        "version": "1.0",
        "endpoints": [
            "/health",
            "/api/get_data",
            "/api/test-cors"
        ]
    }), 200

if __name__ == "__main__":
    # Создаем необходимые директории
    os.makedirs('input_data', exist_ok=True)
    os.makedirs('logs', exist_ok=True)
    
    # Запускаем приложение
    app.run(host='0.0.0.0', port=5000, debug=False)