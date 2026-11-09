# Backend Kitapstore

Настройка окружения, MongoDB, OAuth, запуск и проверки описаны в [основном README](../README.md).

Из этой папки: `npm ci`, затем настройте `.env` по `.env.example` и выполните
`npm run dev`. Проверки: `npm test`. HTTP-сервер запускается после подключения MongoDB.

Письма восстановления требуют отдельного RESET_MAIL_ENCRYPTION_KEY и worker:
`npm run worker:reset-mail` из этой папки. Нужны MongoDB-транзакции и одинаковые
настройки API/worker. Запуск, тестовая почта и ограничения доставки описаны
в [RESET_MAIL_QUEUE.md](../RESET_MAIL_QUEUE.md).
