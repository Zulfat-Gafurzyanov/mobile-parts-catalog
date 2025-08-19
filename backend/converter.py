from datetime import datetime
import hashlib
import json
import os
import re

import pandas as pd


file_name = 'catalog'
# Конфигурация
CONFIG = {
    'xlsx_file': f'{file_name}.xlsx',
    'json_file': f'{file_name}.json',
    'log_file': 'converter.log'
}


class ExcelToJsonConverter:
    """Конвертер XLSX в JSON для FTP сервера."""

    def log(self, message, level='INFO'):
        """Логирование событий"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] [{level}] {message}\n"

        try:
            with open(CONFIG['log_file'], 'a', encoding='utf-8') as f:
                f.write(log_entry)
        except Exception:
            print(log_entry)

    def check_file_changed(self):
        """Проверка, изменился ли файл с последней конвертации"""
        try:
            # Получаем хэш текущего файла
            with open(CONFIG['xlsx_file'], 'rb') as f:
                current_hash = hashlib.md5(f.read()).hexdigest()

            # Проверяем сохраненный хэш
            hash_file = '.last_hash'
            if os.path.exists(hash_file):
                with open(hash_file, 'r') as f:
                    last_hash = f.read().strip()

                if current_hash == last_hash:
                    self.log("Файл не изменился, пропускаем конвертацию")
                    return False

            # Сохраняем новый хэш
            with open(hash_file, 'w') as f:
                f.write(current_hash)

            return True
        except Exception as e:
            self.log(f"Ошибка проверки хэша: {e}", 'ERROR')
            return True

    def convert_excel_to_json(self):
        """Основная функция конвертации Excel в JSON"""


    def validate_json(self):
        """Валидация созданного JSON файла"""
        try:
            with open(CONFIG['json_file'], 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Проверяем структуру
            required_fields = ['success', 'timestamp', 'items']
            for field in required_fields:
                if field not in data:
                    self.log(
                        f"Отсутствует обязательное поле: {field}", 'ERROR')
                    return False

            # Проверяем, что есть товары
            if len(data['items']) == 0:
                self.log("JSON не содержит товаров!", 'WARNING')

            self.log("Валидация JSON прошла успешно")
            return True

        except Exception as e:
            self.log(f"Ошибка валидации JSON: {e}", 'ERROR')
            return False


def main():
    """Главная функция"""
    converter = ExcelToJsonConverter()

    # Выполняем конвертацию
    if converter.convert_excel_to_json():
        # Валидируем результат
        converter.validate_json()
        print("Конвертация завершена успешно")
    else:
        print("Ошибка при конвертации. Проверьте логи.")


if __name__ == "__main__":
    main()
