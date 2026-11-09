# Язык интерфейса, JSON API и восстановления пароля

## Контракт

`shared/apiCodes.json` содержит неизменяемые идентификаторы сообщений и ссылки
на существующие словари en/de/qt/ru. Например:

```json
{
  "message": "Check the highlighted fields.",
  "code": "VALIDATION_FAILED",
  "errors": { "email": "Enter a valid email address." },
  "fieldCodes": { "email": "EMAIL_INVALID" }
}
```

`message`, `error`, `errors`, статусы, retryAfter, invalidToken и прочие поля
сохранены для старых клиентов. Коды добавляются общим JSON middleware,
включая ошибки парсера восстановления и ограничения запросов. Совместимость
существующих обработчиков обеспечивает backend/utils/legacyApiCodes.json.
Новые обработчики могут указывать code/fieldCodes явно: они имеют приоритет.
Коды контракта не переименовывать при редактуре текста. При изменении старого
обработчика задавать прежний код явно либо обновлять серверный legacy-адаптер.
Неизвестное JSON-сообщение получает API_ERROR. Массивы, ответы без сообщений,
файловые/потоковые ответы и прежние текстовые ответы скачивания не преобразуются.

Frontend apiMessage/apiFieldErrors выбирают код, затем старый текст.
translateMessage переводит дескриптор при отображении, поэтому смена языка
обновляет уже показанные ошибки. Неизвестные коды безопасно переходят к старому
распознанному сообщению либо общей ошибке. Машинные коды в интерфейс не выводятся.

## Письма

В запрос восстановления добавлен language: en/de/qt/ru. Старый клиент без language
получает английское письмо. Другой код, включая tr и crh-Latn, или неверный тип
также означает en. Внутренний код крымскотатарского остаётся qt.

backend/utils/accountEmail.js формирует тему и plain-text письмо на выбранном
языке с той же ссылкой и временем жизни. Есть формы количества минут en/de/ru;
qt использует существительное после числительного без суффикса множественности.
Это не турецкий шаблон. Крымскотатарский текст ещё не проверен носителем:
вычитать subject, introduction, expiresOther, ignore целиком, особенно
«Bağlantı … daqqa keçerli» и «bu mektüpni diqqatqa almañız».
Технических пометок в письмо не добавлено.

Публичный ответ API остаётся одинаковым для известного/неизвестного email
и отказа почты; интерфейс переводит его по PASSWORD_RESET_REQUESTED.
Язык не включён в токен и не сохраняется как свойство аккаунта.
Ссылка не переключает язык браузера получателя: страница использует его
сохранённый выбор, при первом визите en. Пользователь может сменить язык вручную.
Приветственные письма и уведомления удаления аккаунта остаются английскими —
переведён запрошенный сценарий восстановления.

Не менялись криптографическая генерация, хеш в MongoDB, TTL, одноразовое атомарное
потребление, версия сессии или ограничения запросов. Доставка восстановления
теперь идёт через очередь по RESET_MAIL_QUEUE.md с отдельным worker и повторами.
Не добавлены логи паролей, токенов, адресов ссылок или тел писем.
Настройки EMAIL_* и FRONTEND_URL прежние; очередь требует отдельный
RESET_MAIL_ENCRYPTION_KEY по RESET_MAIL_QUEUE.md.

## Проверки

- npm test --prefix frontend: 13/13; приоритет кодов, старые ответы, все четыре
  словаря, fieldCodes, неизвестные коды, смена языка существующих ошибок,
  передача выбранного language через подменённый Axios, английский fallback.
- npm test --prefix backend: 13/13; четыре темы/текста и формы минут,
  неверные типы языка, HTTP-запрос → подменённый Nodemailer, нейтральные ответы,
  хеширование, истечение, повторное использование, гонка, отзыв сессий,
  отказ SMTP (запрос qt), лимиты и ошибки парсера.
- npm run build --prefix frontend: успешно; предупреждения о размере общего
  JS-чанка (501 kB) и устаревших browser compatibility databases.
- npm run lint --prefix frontend: 0 ошибок, 9 прежних предупреждений useEffect.
- git diff --check: без ошибок.

SMTP и база в тестах подменены; реальные письма не отправлялись.
Интерактивная отправка через рабочий интерфейс и реальные внешние сервисы
не выполнялась. Зависимости и оформление не менялись.

## Локальные коммиты

1. `feat(api): add stable localized message and field codes`

- `backend/app.js`
- `backend/middleware/apiMessages.js`
- `backend/tests/passwordReset.test.js`
- `backend/utils/legacyApiCodes.json`
- `frontend/src/auth/AccountForm.jsx`
- `frontend/src/components/Admin/Settings.jsx`
- `frontend/src/components/Profile/Settings.jsx`
- `frontend/src/components/ViewBookDetails/ViewBookDetails.jsx`
- `frontend/src/i18n/index.js`
- `frontend/src/pages/AddBlog.jsx`
- `frontend/src/pages/AddBook.jsx`
- `frontend/src/pages/Admin.jsx`
- `frontend/src/pages/Cart.jsx`
- `frontend/src/pages/Profile.jsx`
- `frontend/src/pages/ResetPassword.jsx`
- `frontend/src/pages/UpdateBook.jsx`
- `frontend/tests/i18n.test.cjs`
- `shared/apiCodes.json`

2. `feat(auth): localize password recovery emails and request language`

- `ACCOUNT_LOCALIZATION.md`
- `README.md`
- `backend/controllers/passwordResetController.js`
- `backend/tests/accountLocalization.test.js`
- `backend/utils/accountEmail.js`
- `frontend/src/auth/passwordReset.js`
- `frontend/src/pages/ForgotPassword.jsx`
- `frontend/tests/passwordReset.test.cjs`

Следующий этап заменил доставку восстановления на encrypted outbox; см. [RESET_MAIL_QUEUE.md](RESET_MAIL_QUEUE.md).
