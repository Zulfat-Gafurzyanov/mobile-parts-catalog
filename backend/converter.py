from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re

import pandas as pd


file_name = 'остатки'
# Конфигурация
CONFIG = {
    'xlsx_file': f'{file_name}.xlsx',           # Имя Excel файла
    'json_file': f'{file_name}.json',           # Имя JSON файла
    'backup_dir': 'backups',               # Папка для бэкапов!!!!!!!!!!!!!!!!!!!!
    'log_file': 'converter.log',           # Файл логов
    'public_dir': 'public_html',           # Публичная папка (если нужно)!!!!!!!!!!!!
}


class ExcelToJsonConverter:
    """Конвертер XLSX в JSON для FTP сервера."""

    def __init__(self):
        self.stats = {
            'total_items': 0,
            'in_stock': 0,
            'out_of_stock': 0,
            'categories': set(),
            'brands': set()
        }

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

    def backup_existing_json(self):  # !@!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        """Создание бэкапа существующего JSON"""
        try:
            if os.path.exists(CONFIG['json_file']):
                # Создаем папку для бэкапов
                os.makedirs(CONFIG['backup_dir'], exist_ok=True)

                # Имя файла бэкапа с датой
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                backup_name = f"{
                    CONFIG['backup_dir']}/{file_name}_{timestamp}.json"

                # Копируем файл
                with open(CONFIG['json_file'], 'r', encoding='utf-8') as src:
                    with open(backup_name, 'w', encoding='utf-8') as dst:
                        dst.write(src.read())

                self.log(f"Создан бэкап: {backup_name}")

                # Удаляем старые бэкапы (оставляем последние 5)
                self.cleanup_old_backups()

        except Exception as e:
            self.log(f"Ошибка создания бэкапа: {e}", 'WARNING')

    def cleanup_old_backups(self, keep_last=5):  # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        """Удаление старых бэкапов"""
        try:
            backup_files = sorted(
                Path(CONFIG['backup_dir']).glob(f'{file_name}_*.json'))
            if len(backup_files) > keep_last:
                for old_file in backup_files[:-keep_last]:
                    old_file.unlink()
                    self.log(f"Удален старый бэкап: {old_file.name}")
        except Exception as e:
            self.log(f"Ошибка очистки бэкапов: {e}", 'WARNING')

    def extract_brand(self, name):
        """Извлечение бренда из названия товара"""
        brands = {
            'Xiaomi': ['xiaomi', 'redmi', 'poco', 'mi '],
            'Samsung': ['samsung', 'galaxy'],
            'Apple': ['iphone', 'ipad', 'apple', 'airpods'],
            'Huawei': ['huawei', 'honor'],
            'Realme': ['realme'],
            'OPPO': ['oppo'],
            'Vivo': ['vivo'],
            'OnePlus': ['oneplus'],
            'Nokia': ['nokia'],
            'Sony': ['sony', 'xperia'],
            'LG': ['lg '],
            'Motorola': ['motorola', 'moto '],
            'ASUS': ['asus', 'zenfone'],
            'Lenovo': ['lenovo'],
            'Google': ['pixel', 'google']
        }

        name_lower = name.lower()
        for brand, keywords in brands.items():
            for keyword in keywords:
                if keyword in name_lower:
                    self.stats['brands'].add(brand)
                    return brand

        return 'Другое'

    def extract_model(self, name):
        """Извлечение модели устройства из названия"""
        patterns = [
            r'Redmi (?:Note )?[0-9]+[A-Za-z]*(?:\s+Pro)?(?:\s+Plus)?',
            r'iPhone\s+[0-9]+(?:\s+Pro)?(?:\s+Max)?(?:\s+Plus)?',
            r'Galaxy\s+[A-Za-z][0-9]+[A-Za-z]*(?:\s+Ultra)?(?:\s+Plus)?',
            r'iPad\s+(?:Pro|Air|Mini)?\s*[0-9]*',
            r'Mi\s+[0-9]+[A-Za-z]*(?:\s+Pro)?',
            r'Poco\s+[A-Za-z0-9]+(?:\s+Pro)?',
            r'Honor\s+[0-9]+[A-Za-z]*',
            r'Realme\s+[0-9]+(?:\s+Pro)?',
            r'OnePlus\s+[0-9]+[A-Za-z]*(?:\s+Pro)?',
            r'Pixel\s+[0-9]+[a-zA-Z]*',
            r'Nokia\s+[0-9.]+',
            r'Moto\s+[A-Za-z][0-9]+[A-Za-z]*'
        ]

        for pattern in patterns:
            match = re.search(pattern, name, re.IGNORECASE)
            if match:
                return match.group().strip()

        return ''

    def determine_category(self, name):
        """Определение категории товара по названию"""
        name_lower = name.lower()

        categories = {
            'display': ['дисплей', 'lcd', 'экран', 'тачскрин', 'touchscreen', 'модуль'],
            'battery': ['аккумулятор', 'батарея', 'battery', 'акб'],
            'camera': ['камера', 'camera', 'объектив'],
            'body': ['корпус', 'крышка', 'задняя панель', 'рамка', 'housing'],
            'flex': ['шлейф', 'flex', 'кабель', 'разъем'],
            'speaker': ['динамик', 'speaker', 'спикер', 'buzzer'],
            'button': ['кнопка', 'button', 'клавиша'],
            'sim': ['sim', 'сим', 'лоток'],
            'glass': ['стекло', 'glass', 'защитное'],
            'charger': ['зарядка', 'charger', 'адаптер', 'блок питания'],
            'cable': ['кабель', 'провод', 'cable', 'usb'],
            'case': ['чехол', 'case', 'бампер', 'накладка'],
            'tablet': ['планшет', 'tablet', 'ipad'],
            'watch': ['watch', 'часы', 'band', 'ремешок'],
            'earphones': ['наушники', 'earphones', 'airpods', 'буds']
        }

        for category, keywords in categories.items():
            for keyword in keywords:
                if keyword in name_lower:
                    self.stats['categories'].add(category)
                    return category

        self.stats['categories'].add('other')
        return 'other'

    def get_price_from_name(self, name):
        """Попытка извлечь цену из названия (если есть)"""
        # Ищем паттерны цены в названии
        price_patterns = [
            r'(\d+)\s*₽',
            r'(\d+)\s*руб',
            r'(\d+)\s*р\.',
            r'цена[:\s]*(\d+)',
        ]

        for pattern in price_patterns:
            match = re.search(pattern, name, re.IGNORECASE)
            if match:
                return float(match.group(1))

        return 0

    def convert_excel_to_json(self):
        """Основная функция конвертации Excel в JSON"""
        try:
            self.log("Начинаем конвертацию Excel в JSON")

            # Проверяем, существует ли файл
            if not os.path.exists(CONFIG['xlsx_file']):
                self.log(f"Файл {CONFIG['xlsx_file']} не найден!", 'ERROR')
                return False

            # Проверяем, изменился ли файл
            if not self.check_file_changed():
                return True

            # Создаем бэкап существующего JSON
            self.backup_existing_json()

            # Читаем Excel файл
            self.log("Читаем Excel файл...")
            df = pd.read_excel(CONFIG['xlsx_file'], engine='openpyxl')

            # Преобразуем данные
            catalog = []
            for index, row in df.iterrows():
                # Извлекаем данные из строки
                name = str(row.get('Наименование', ''))
                stock = int(row.get('Остаток', 0))
                barcode = str(row.get('Штрихкоды', ''))
                # Обрабатываем товар
                item = {
                    'id': barcode or f"item_{index}",
                    'name': name,
                    'stock': stock,
                    'barcode': barcode,
                    'full_group': str(row.get('Полная группа', '')),
                    'group_name': str(row.get('Название группы', '')),
                    'brand': self.extract_brand(name),
                    'model': self.extract_model(name),
                    'category': self.determine_category(name),
                    'price': self.get_price_from_name(name),
                    'in_stock': stock > 0,
                    'search_text': f"{name} {barcode}".lower()  # Для поиска
                }

                catalog.append(item)

                # Обновляем статистику
                self.stats['total_items'] += 1
                if stock > 0:
                    self.stats['in_stock'] += 1
                else:
                    self.stats['out_of_stock'] += 1

            # Формируем финальный JSON
            result = {
                'success': True,
                'timestamp': datetime.now().isoformat(),
                'generated_at': datetime.now().strftime('%d.%m.%Y %H:%M:%S'),
                'total_items': self.stats['total_items'],
                'statistics': {
                    'in_stock': self.stats['in_stock'],
                    'out_of_stock': self.stats['out_of_stock'],
                    'total_categories': len(self.stats['categories']),
                    'total_brands': len(self.stats['brands'])
                },
                'categories': sorted(list(self.stats['categories'])),
                'brands': sorted(list(self.stats['brands'])),
                'items': catalog
            }

            # Сохраняем JSON
            json_path = CONFIG['json_file']

            # Если нужно сохранить в публичную директорию
            if CONFIG.get('public_dir'):
                public_path = os.path.join(
                    CONFIG['public_dir'], CONFIG['json_file'])
                os.makedirs(CONFIG['public_dir'], exist_ok=True)
                json_path = public_path

            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            self.log(f"Конвертация завершена успешно. Обработано {self.stats['total_items']} товаров")
            self.log(f"JSON сохранен в: {json_path}")

            # Создаем также минифицированную версию для продакшена
            min_path = json_path.replace('.json', '.min.json')
            with open(min_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, separators=(',', ':'))

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
