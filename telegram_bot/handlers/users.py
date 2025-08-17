from aiogram import F, Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from keyboards.keyboards import keyboard
from lexicon.lexicon import LEXICON


user_router = Router()


@user_router.message(CommandStart())
async def start_command(message: Message):
    await message.answer(LEXICON[message.text], reply_markup=keyboard)


@user_router.message()
async def warning_command(message: Message):
    await message.answer(LEXICON['another_command'])
