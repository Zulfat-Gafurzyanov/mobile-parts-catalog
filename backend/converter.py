from datetime import datetime
import hashlib
import json
import os
import re

import pandas as pd


# Конфигурация
CONFIG = {
    'xlsx_file': 'catalog.xlsx',
    'json_file': 'catalog.json',
    'log_file': 'converter.log'
}


class ExcelToJsonConverter:
    """Конвертер XLSX в JSON для FTP сервера."""

    def log(self, message, level='INFO'):
        """Логирование событий"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] [{level}] {message}\n"

        log_path = os.path.join('logs_and_hashes', CONFIG['log_file'])
        try:
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(log_entry)
        except Exception:
            print(log_entry)

    def check_file_changed(self):
        """Проверка, изменился ли файл с последней конвертации"""
        try:
            # Путь к xlsx файлу
            xlsx_path = os.path.join('input_file', CONFIG['xlsx_file'])

            # Получаем хэш текущего файла
            with open(xlsx_path, 'rb') as f:
                current_hash = hashlib.md5(f.read()).hexdigest()

            # Путь к файлу с хэшем
            hash_file = os.path.join('logs_and_hashes', '.last_hash')

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

        try:
            self.log("Начинаем конвертацию Excel в JSON")

            xlsx_path = os.path.join('input_file', CONFIG['xlsx_file'])
            # Проверяем, существует ли файл
            if not os.path.exists(xlsx_path):
                self.log(f"Файл {xlsx_path} не найден!", 'ERROR')
                return False

            # Проверяем, изменился ли файл
            if not self.check_file_changed():
                return True

            # Читаем Excel файл
            self.log("Читаем Excel файл...")
            df = pd.read_excel(xlsx_path, engine='openpyxl')
            # Заменяем все NaN на None
            df = df.replace({pd.NA: None, pd.NaT: None, float('nan'): None})
            df = df.where(pd.notnull(df), None)

            # Преобразуем данные в JSON формат
            # Используем только те поля, которые есть в файле
            catalog = []

            for index, row in df.iterrows():
                # Читаем данные из строки - только существующие колонки
                brand = str(row.get('Бренд', ''))
                name = str(row.get('Наименование', ''))
                stock = int(row.get('Остаток', 0))
                modification = str(row.get('Модификация', ''))
                barcode = str(row.get('Штрихкоды', ''))
                article = str(row.get('Артикул', ''))
                full_group = str(row.get('Полная группа', ''))
                group_name = str(row.get('Название группы', ''))
                discription = str(row.get('Описание', ''))
                photo = str(row.get('Фото', ''))

                # Формируем объект товара с теми же полями что в Excel
                item = {
                    'Бренд': brand,
                    'Наименование': name,
                    'Остаток': stock,
                    'Модификация': modification,
                    'Артикул': article,
                    'Штрихкоды': barcode,
                    'Полная группа': full_group,
                    'Название группы': group_name,
                    'Описание': discription,
                    'Фото': photo,
                }

                catalog.append(item)

            # Формируем финальный JSON
            result = {
                'generated_at': datetime.now().strftime('%d.%m.%Y %H:%M:%S'),
                'total_items': len(catalog),
                'items': catalog
            }

            # Сохраняем JSON с отступами для читаемости

            json_path = os.path.join('json_data', CONFIG['json_file'])
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            self.log(f"Конвертация завершена успешно. Обработано {len(catalog)} товаров")
            self.log(f"JSON сохранен в: {CONFIG['json_file']}")

            return True

        except Exception as e:
            self.log(f"Критическая ошибка при конвертации: {e}", 'ERROR')
            return False

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
