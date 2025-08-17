from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup
)
from environs import Env

from lexicon.lexicon import LEXICON

env = Env()
env.read_env()

url_button = InlineKeyboardButton(
    text=LEXICON['btn_miniapp_url'],
    url=env('MINIAPP_URL')
)
keyboard = InlineKeyboardMarkup(inline_keyboard=[[url_button]])
