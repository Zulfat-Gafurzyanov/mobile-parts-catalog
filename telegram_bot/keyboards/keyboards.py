from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo
)
from environs import Env

from lexicon.lexicon import LEXICON

env = Env()
env.read_env()

# Создаем WebApp объект
webapp = WebAppInfo(url=env('MINIAPP_URL'))

# Используем web_app вместо url
url_button = InlineKeyboardButton(
    text=LEXICON['btn_miniapp_url'],
    web_app=webapp
)

keyboard = InlineKeyboardMarkup(inline_keyboard=[[url_button]])
