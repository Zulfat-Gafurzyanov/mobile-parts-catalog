from datetime import datetime
import hashlib
import json
import os

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

            # Проверяем, изменился ли файл (раскомментировано)
            if not self.check_file_changed():
                return True

            # Читаем Excel файл
            self.log("Читаем Excel файл...")
            df = pd.read_excel(xlsx_path, engine='openpyxl')
            # Убираем лишние пробелы в названиях колонок
            df.columns = df.columns.str.strip()
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
                cost = float(row.get('Цена', 0))
                stock = int(row.get('Остаток', 0))
                discription = str(row.get('Описание', ''))
                photo = str(row.get('Фото', ''))

                # Формируем объект товара с теми же полями что в Excel
                item = {
                    'Бренд': brand,
                    'Наименование': name,
                    'Цена': cost,
                    'Остаток': stock,
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
            project_root = os.path.dirname(
                os.path.dirname(os.path.abspath(__file__)))
            json_path = os.path.join(
                project_root, 'frontend', CONFIG['json_file'])
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            self.log("Конвертация завершена успешно")
            self.log(f"JSON сохранен в: {json_path}")

            return True

        except Exception as e:
            self.log(f"Критическая ошибка при конвертации: {e}", 'ERROR')
            return False

    def validate_json(self):
        """Валидация созданного JSON файла"""
        try:
            # Используем тот же путь, что и при сохранении
            project_root = os.path.dirname(
                os.path.dirname(os.path.abspath(__file__)))
            json_path = os.path.join(
                project_root, 'frontend', CONFIG['json_file'])

            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Проверяем структуру - исправлены поля на правильные
            required_fields = ['generated_at', 'total_items', 'items']
            for field in required_fields:
                if field not in data:
                    self.log(
                        f"Отсутствует обязательное поле: {field}", 'ERROR')
                    return False

            # Проверяем, что есть товары
            if len(data['items']) == 0:
                self.log("JSON не содержит товаров!", 'WARNING')
            else:
                # Проверяем структуру товаров
                if len(data['items']) > 0:
                    item_fields = [
                        'Бренд',
                        'Наименование',
                        'Цена',
                        'Остаток',
                        'Описание',
                        'Фото'
                    ]
                    sample_item = data['items'][0]
                    for field in item_fields:
                        if field not in sample_item:
                            self.log(
                                f"Отсутствует поле: {field}", 'WARNING')

            self.log("Валидация JSON прошла успешно")
            return True

        except FileNotFoundError:
            self.log(f"Файл JSON не найден: {json_path}", 'ERROR')
            return False
        except json.JSONDecodeError as e:
            self.log(f"Ошибка парсинга JSON: {e}", 'ERROR')
            return False
        except Exception as e:
            self.log(f"Ошибка валидации JSON: {e}", 'ERROR')
            return False


def main():
    """Главная функция"""
    converter = ExcelToJsonConverter()

    # Выполняем конвертацию
    if converter.convert_excel_to_json():
        # Валидируем результат
        if converter.validate_json():
            print("Конвертация и валидация завершены успешно")
        else:
            print("Конвертация выполнена, но валидация не прошла.")
    else:
        print("Ошибка при конвертации. Проверьте логи.")


if __name__ == "__main__":
    main()
