import logging

from aiogram import F, Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from keyboards.keyboards import keyboard
from lexicon.lexicon import LEXICON


logger = logging.getLogger(__name__)
user_router = Router()


@user_router.message(CommandStart())
async def start_command(message: Message):
    logger.info(
        f"Пользователь {message.from_user.id} использовал команду /start")
    await message.answer(LEXICON[message.text], reply_markup=keyboard)
    logger.debug(f"Отправлен ответ пользователю {message.from_user.id}")


@user_router.message()
async def warning_command(message: Message):
    logger.warning(
        f"Пользователь {message.from_user.id} отправил неизвестную команду")
    await message.answer(LEXICON['another_command'])
