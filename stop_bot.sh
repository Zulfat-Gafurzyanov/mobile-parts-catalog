cd ~/zulfat/mobile-parts-catalog || exit 1

if [ -f bot.pid ]; then
    PID=$(cat bot.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID
        echo "Bot with PID $PID has been stopped"
        rm bot.pid
    else
        echo "Bot is not running (stale PID file)"
        rm bot.pid
    fi
else
    echo "Bot is not running (no PID file)"
fi