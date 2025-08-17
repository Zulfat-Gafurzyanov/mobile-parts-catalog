from flask import Flask, jsonify
import pandas as pd

app = Flask(__name__)


@app.route('/api/get_data', methods=['GET'])
def get_data():
    # Чтение данных из XLSX-файла
    df = pd.read_excel('input_data/Остатки (4).xlsx', engine='openpyxl')

    technics_dict = {}  # Словарь моделей с соответствующими данными
    specific_column_model = 'Полная группа'

    # Перебираем каждую строку
    for _, row in df.iterrows():
        row_parts = row[specific_column_model].split('/')
        model = row_parts[1]  # Берём второй элемент (модель)

        # Формируем словарь для текущей строки
        model_dict = {}
        for col_name in df.columns:
            # Если значение NaN, заменяем его на null
            value = row[col_name]
            if pd.isna(value):  # Проверяем на NaN независимо от типа данных
                value = None
            model_dict[col_name] = value

        # Если такая модель уже существует, добавляем новую строку
        if model in technics_dict:
            technics_dict[model].append(model_dict)
        else:
            # Иначе создаем новый список с одним элементом
            technics_dict[model] = [model_dict]

    return jsonify(technics_dict)


if __name__ == "__main__":
    app.run(debug=True)
