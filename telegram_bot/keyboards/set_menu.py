from aiogram import Bot
from aiogram.types import (
    BotCommand,
    BotCommandScopeDefault
)

from lexicon.lexicon import COMMANDS_MENU


async def set_main_menu(bot: Bot):
    """Функция для настройки кнопки Menu бота в личном чате."""
    commands = [
        BotCommand(
            command=command,
            description=description
        ) for command, description in COMMANDS_MENU.items()
    ]
    await bot.set_my_commands(
        commands=commands,
        scope=BotCommandScopeDefault()
        )
