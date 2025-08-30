import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramAPIError

from config.config import load_config
from handlers.users import user_router
from keyboards.set_menu import set_main_menu


config = load_config()

# Настраиваем базовое логирование
logging.basicConfig(
    level=config.log.level,
    format=config.log.format,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('bot.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


async def main():
    try:
        logger.info("Запуск бота...")

        bot = Bot(
            token=config.bot.token,
            default=DefaultBotProperties(parse_mode=ParseMode.HTML),
        )
        dp = Dispatcher()

        logger.info("Настройка меню...")
        await set_main_menu(bot)

        logger.info("Подключение роутеров...")
        dp.include_router(user_router)

        logger.info("Удаление вебхуков и запуск polling...")
        await bot.delete_webhook(drop_pending_updates=True)

        logger.info("Бот успешно запущен и готов к работе!")
        await dp.start_polling(bot)

    except TelegramAPIError as e:
        logger.error(f"Ошибка Telegram API: {e}")
    except Exception as e:
        logger.exception(f"Ошибка в функции main: {e}")
        raise
    finally:
        logger.info("Бот завершил работу")


if __name__ == '__main__':
    try:
        logger.info("Инициализация бота...")
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Бот остановлен пользователем (Ctrl+C)")
    except Exception as e:
        logger.critical(f"Критическая ошибка: {e}")
