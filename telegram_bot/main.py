import asyncio
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramAPIError

from config.config import load_config
from handlers.users import user_router
from keyboards.set_menu import set_main_menu


config = load_config()

# Создаем директорию для логов
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Настраиваем handlers для логирования
handlers = [
    # Вывод в консоль (stdout) - это важно для nohup
    logging.StreamHandler(sys.stdout),
    # Основной файл логов с ротацией
    RotatingFileHandler(
        log_dir / "bot.log",
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
]

# Настраиваем базовое логирование
logging.basicConfig(
    level=config.log.level,
    format=config.log.format,
    handlers=handlers,
    force=True  # Важно! Переопределяет существующую конфигурацию
)

# Создаем логгер
logger = logging.getLogger(__name__)

# Устанавливаем уровень для aiogram
logging.getLogger('aiogram').setLevel(logging.INFO)

# Отключаем буферизацию для немедленной записи логов
for handler in logging.root.handlers:
    if hasattr(handler, 'flush'):
        handler.flush()


async def main():
    try:
        logger.info("="*50)
        logger.info("Запуск бота...")
        logger.info(f"Уровень логирования: {logging.getLevelName(config.log.level)}")
        logger.info(f"Директория логов: {log_dir.absolute()}")

        bot = Bot(
            token=config.bot.token,
            default=DefaultBotProperties(parse_mode=ParseMode.HTML),
        )
        
        # Получаем информацию о боте
        bot_info = await bot.get_me()
        logger.info(f"Бот: @{bot_info.username} (ID: {bot_info.id})")
        
        dp = Dispatcher()

        logger.info("Настройка меню...")
        await set_main_menu(bot)

        logger.info("Подключение роутеров...")
        dp.include_router(user_router)

        logger.info("Удаление вебхуков...")
        await bot.delete_webhook(drop_pending_updates=True)

        logger.info("✓ Бот успешно запущен и готов к работе!")
        logger.info("="*50)
        
        # Периодически сбрасываем буфер логов
        async def flush_logs():
            while True:
                await asyncio.sleep(5)  # каждые 5 секунд
                for handler in logging.root.handlers:
                    if hasattr(handler, 'flush'):
                        handler.flush()
        
        # Запускаем фоновую задачу для flush
        asyncio.create_task(flush_logs())
        
        await dp.start_polling(bot)

    except TelegramAPIError as e:
        logger.error(f"Ошибка Telegram API: {e}")
        raise
    except Exception as e:
        logger.exception(f"Критическая ошибка: {e}")
        raise
    finally:
        logger.info("Бот завершил работу")
        logger.info("="*50)
        # Принудительный flush перед завершением
        for handler in logging.root.handlers:
            if hasattr(handler, 'flush'):
                handler.flush()


if __name__ == '__main__':
    try:
        logger.info("Инициализация бота...")
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Бот остановлен пользователем (Ctrl+C)")
    except Exception as e:
        logger.critical(f"Критическая ошибка при запуске: {e}")
    finally:
        # Убеждаемся, что все логи записаны
        logging.shutdown()