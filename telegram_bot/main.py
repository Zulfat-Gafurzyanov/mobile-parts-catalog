import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramAPIError

from config.config import load_config
from handlers.users import user_router
from keyboards.set_menu import (
    set_main_menu
)


logger = logging.getLogger(__name__)


async def main():
    try:
        config = load_config()
        logging.basicConfig(
            level=config.log.level,
            format=config.log.format
        )
        bot = Bot(
            token=config.bot.token,
            default=DefaultBotProperties(parse_mode=ParseMode.HTML),
        )
        dp = Dispatcher()

        await set_main_menu(bot)

        dp.include_router(user_router)

        await bot.delete_webhook(drop_pending_updates=True)
        await dp.start_polling(bot)
    except TelegramAPIError as e:
        logger.error(f"Ошибка Telegram API: {e}")
    except Exception as e:
        logger.exception(f"Ошибка в функции main: {e}")
        raise
    finally:
        logger.info("Бот упал")

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except Exception as e:
        logger.critical(f"Критическая ошибка: {e}")
