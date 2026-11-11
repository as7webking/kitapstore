# Kitapstore: подготовка тестовой публикации

Проверено 3 ноября 2026. В этом этапе ничего не публиковалось, настройки облачных
аккаунтов не менялись, рабочая MongoDB не открывалась и письма не отправлялись.

## Решение и степень готовности

```text
Браузер → HTTPS → Vercel: frontend/dist (React/Vite)
       └→ HTTPS → Render: постоянный Node/Express, один процесс/экземпляр
                         ├→ отдельный Atlas-проект → kitapstore_test
                         └→ Ethereal SMTP → тестовый inbox, без реальной доставки
```

Подготовлено для ограниченного функционального тестирования после ручной настройки
ниже. Это не заключение о готовности принимать реальные заказы или покупателей.

Frontend: отдельный проект Vercel `kitapstore-test`, Root Directory `frontend`.
Express: отдельный Render Web Service, без Root Directory (корень репозитория),
чтобы backend видел shared/apiCodes.json. Build: `npm ci --prefix backend`.
Start: `npm start --prefix backend`. Node 24, один экземпляр, без cluster/PM2 workers.
Health check: `/healthz`. PORT предоставляет Render; вручную его не фиксировать.
Выбрать сервис с разрешённым исходящим SMTP 587: Render Free блокирует SMTP,
поэтому эта конкретная схема с Nodemailer/Ethereal требует другого плана.
Ничего платного в этом этапе не создавалось. Регионы Render/Atlas выбирать близкими.

Не переносить backend в Vercel одним изменением URL. По документации Express там
исполняется как Vercel Function: фоновой отправке после HTTP нужен waitUntil или
внешняя очередь. В следующем этапе лимиты уже перенесены в общую MongoDB
(RATE_LIMITS.md); это не снимает требование корректного жизненного цикла почты. Текущая
конфигурация backend специально отклоняет VERCEL при старте. Если нужен именно
полностью Vercel backend, это отдельная реализация, а не текущая схема.

## Что исправлено

- frontend/vercel.json: Vite build/output, SPA fallback для прямых /profile,
  /forgot-password, /reset-password и прочих страниц. /api исключён из fallback:
  API вызывается прямо на отдельном backend-домене; proxy через Vercel не нужен.
  Файлы assets обслуживает файловая система Vercel; переписывание для SPA её
  не заменяет. Referrer-Policy: no-referrer.
- Hero и logo импортируются через Vite и действительно присутствуют в dist;
  прежние строки /src/assets/... работали только на dev-сервере.
- Vite на Vercel отклоняет отсутствующий/неверный VITE_API_URL, localhost,
  HTTP, путь и завершающий слеш: нельзя случайно выпустить сборку с localhost.
- backend валидирует origin, proxy-hop и staging-изоляцию ДО подключения к базе.
  HTTP слушает только после подключения MongoDB, как раньше. PORT платформы
  поддерживается. Ошибка подключения не раскрывает URI/учётные данные.
- /healthz возвращает 200 только при connected MongoDB, иначе 503; без секретов.
- CORS разрешает FRONTEND_URL и дополнительные точные CORS_ORIGINS.
  Это браузерное ограничение, не авторизация; запросы curl остаются возможны.
- Фоновые письма регистрации отслеживаются. Восстановление в следующем этапе
  перенесено в durable outbox и отдельный worker по RESET_MAIL_QUEUE.md. При SIGTERM/SIGINT
  сервер прекращает приём, ждёт активные запросы и фоновые задачи, отключает
  MongoDB. Общий предел остановки 20 секунд. Авария/kill -9/таймаут всё ещё могут
  потерять письмо; обещания гарантированной доставки нет.
- .env не менялись. URI сохраняет прежнее имя. MONGODB_DB_NAME задан отдельно
  только для staging; при APP_ENV=staging и путь URI, и имя обязаны быть
  kitapstore_test. Нужны также отдельный пользователь и отдельный Atlas-проект:
  сама проверка имени базы не доказывает изоляцию прав.

## Переменные: только тестовые значения

Все секреты задавать в Render Environment, не в Vercel frontend.
В примере нет настоящих паролей; значения в угловых скобках заменить в панели.

```dotenv
NODE_ENV=production
NODE_VERSION=24
APP_ENV=staging
URI=mongodb+srv://<test-user>:<encoded-test-password>@<test-cluster>/kitapstore_test?retryWrites=true&w=majority
MONGODB_DB_NAME=kitapstore_test
JWT_SECRET=<new-separate-random-secret-at-least-32-characters>
FRONTEND_URL=https://<actual-staging-frontend-domain>
CORS_ORIGINS=
TRUST_PROXY_HOPS=0
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=<ethereal-test-user>
EMAIL_PASS=<ethereal-test-password>
EMAIL_FROM=KitapStore Test <no-reply@example.test>
EMAIL_TO=contact@example.test
PASSWORD_RESET_TTL_MINUTES=30
RESET_MAIL_ENCRYPTION_KEY=<separate-base64-encoded-32-byte-test-key>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
```

FRONTEND_URL — один стабильный HTTPS origin тестового frontend, без пути/слеша;
именно он формирует ссылку восстановления, не Origin/Host из запроса.
Для отдельных проверенных preview URL можно перечислить точные HTTPS origins
в CORS_ORIGINS через запятую. Это не меняет адрес в письме. Не добавлять маску
*.vercel.app. Не брать FRONTEND_URL из случайного текущего preview-деплоя.

TRUST_PROXY_HOPS=0 безопасно игнорирует произвольный X-Forwarded-For, но за прокси
может объединить всех клиентов в один лимит. Перед тестом с несколькими людьми
проверить ingress: если до Express ровно один доверенный прокси, который добавляет
реальный клиентский IP справа в X-Forwarded-For, задать 1. Тест проверяет,
что подмена левого адреса не сбрасывает лимит при такой топологии. Не выставлять
trust proxy=true. Реальная топология Render здесь не проверялась; подтвердить
по настройкам/поддержке хостинга. Пока не подтверждена — оставить 0 и учитывать
общий строгий лимит. При другой цепочке требуется доверие к конкретным сетям
прокси и отдельная проверка, а не увеличение hops вслепую.

Vercel frontend: только `VITE_API_URL=https://<actual-staging-api-domain>`.
Node.js Version: 24.x. URI, JWT_SECRET и EMAIL_* туда не добавлять.
VITE_* попадает в публичный JS; после изменения URL нужна новая сборка.
В Vercel включить **Include source files outside of the Root Directory in the
Build Step**, иначе импорт shared/apiCodes.json из frontend не найдётся.
Корневая .vercelignore дополнительно исключает backend и локальные env при
CLI-загрузке; Git-публикация также не должна содержать .env.

## Точные шаги последующей публикации (сейчас не выполнялись)

1. Проверить локальные коммиты и дифф. После отдельного решения публиковать
   загрузить их в отдельную ветку, например codex/staging-vercel. Текущие
   локальные коммиты сами не доступны Git-интеграциям хостинга. Не подключать
   эту ветку к существующим рабочим сервисам и их автодеплою.
2. Создать отдельный Atlas-проект/кластер для тестов и базу kitapstore_test.
   Создать отдельного database user с readWrite только на kitapstore_test,
   без admin/доступа к рабочей базе. Не копировать рабочие аккаунты/заказы.
   В Connect → Drivers получить URI, указать путь /kitapstore_test, кодировать
   специальные символы пароля. Не публиковать полученный URI.
3. Создать Ethereal test account на ethereal.email и сохранить тестовые SMTP
   реквизиты в Render. Сервис перехватывает письма, они не поступают получателям.
   Inbox доступен через интерфейс Ethereal; не включать логи тел писем/ссылок.
4. Создать НОВЫЙ Vercel-проект для тестов из этой ветки. Root frontend,
   Framework Vite; настройки build/output из frontend/vercel.json. Включить
   доступ к исходникам за Root Directory. Записать реально назначенный стабильный
   frontend-домен. Не использовать реквизиты рабочего backend.
5. Создать НОВЫЙ Render Web Service из той же ветки, корень репозитория,
   команды/Node/health из раздела выше. Выбрать план с исходящим SMTP и один
   экземпляр. Добавить все тестовые переменные, FRONTEND_URL из шага 4.
   Пока не включать автоматическую публикацию каждого коммита.
5a. Создать отдельный Render Background Worker из той же версии репозитория.
    Root Directory — корень, Build: `npm ci --prefix backend`, Start:
    `npm run worker:reset-mail --prefix backend`, Node 24. Worker не слушает HTTP.
    API и worker должны использовать одинаковые URI/MONGODB_DB_NAME,
    RESET_MAIL_ENCRYPTION_KEY, FRONTEND_URL и PASSWORD_RESET_TTL_MINUTES.
    Worker также требует JWT_SECRET и тестовые EMAIL_*; SMTP 587 должен быть доступен.
    Ключ очереди — отдельные 32 случайных байта в base64, не JWT_SECRET.
    Его можно создать локально через `openssl rand -base64 32`; результат хранить
    только в секретах окружения API/worker, не во frontend или Git.
6. В Render Connect → Outbound скопировать все CIDR-диапазоны сервиса и добавить
   их в Network Access ТЕСТОВОГО Atlas-проекта. Добавить также outbound CIDR worker. Не открывать 0.0.0.0/0 и не
   менять Network Access рабочей базы. Выполнить Render deployment; проверить
   /healthz → 200 и /api/v1/test → API OK. До готовности базы HTTP не стартует.
7. Скопировать выданный HTTPS API-домен Render в VITE_API_URL тестового Vercel
   для окружений, где будет тест. Выполнить новый frontend deployment, убедиться,
   что FRONTEND_URL backend совпадает со стабильным frontend URL. Даже если
   Vercel называет основной домен этого отдельного проекта Production, его
   backend/база/почта остаются тестовыми. Никакой связи с рабочими окружениями.
8. Проверить, что Deployment Protection не блокирует приглашённых тестировщиков
   и ссылки писем; согласовать доступ через настройки проекта. Не передавать
   bypass-токены через письма. Проверить proxy-IP перед многопользовательским тестом.
9. Открыть прямыми ссылками /login, /signup, /profile, /forgot-password,
   /reset-password (без токена должен быть локализованный invalid-link экран),
   /all-books и существующую карточку тестовой книги. Обновить страницы.
   Проверить загрузку logo/hero, отсутствие запросов к localhost и 404 assets.
10. Создать ТОЛЬКО синтетический аккаунт, проверить вход/выход и смену языка.
    Запросить сброс на en/de/qt/ru, открыть письмо в Ethereal и пройти по ссылке.
    Проверить правильный HTTPS домен, fragment #token, смену пароля,
    недействительность старой сессии и отказ второй попытки с той же ссылкой.
    Токены и ссылки не копировать в отчёты, терминал, скриншоты или логи.
11. Для неизвестного email проверить одинаковый 202/code/message. Проверить
    неверный email, лимит 429 и Retry-After без массовой рассылки. Убедиться,
    что curl/browser-запросы с посторонним Origin не получают разрешающий CORS.
    Не пытаться считать CORS заменой серверной проверки JWT.
12. Записать результат внешнего smoke-test. До него статус — «подготовлено,
    внешние сервисы не проверены». При неуспехе остановить тестовые deployments,
    исправить только тестовые переменные/сервис. Рабочую базу не откатывать.

## Проверки в этом этапе

- Frontend 14/14 тестов: аккаунты, ошибки, локали, восстановление, SPA rules.
- Backend 18/18: прежние аккаунты/восстановление плюс staging-guards, CORS,
  readiness, доверенный proxy-IP, ответ до завершения подменённой SMTP-отправки
  и ожидание фоновой задачи. Реальный CLI запущен с синтетическим URI
  127.0.0.1:1/kitapstore_test: ожидаемый понятный отказ, HTTP не начал слушать.
  Успешный порядок DB → listen проверен с подменённым mongoose.connect.
- Production build с VERCEL=1 и синтетическим HTTPS VITE_API_URL; logo/hero
  присутствуют в dist. Линтер: 0 ошибок, 9 прежних предупреждений useEffect.
- Отрицательные сборки: Vercel без API URL и с HTTP/localhost должны отклоняться.
- Внешняя Atlas, Render, Vercel routing и SMTP-доступность НЕ проверялись;
  успешного подключения реальной базы не заявляется. Никаких реальных писем.

## Что ещё исправить

Для ограниченного теста обязательны реальные настройки из шагов 1–8 и внешний
smoke-test. Критичных внешних предположений два: SMTP-доступность выбранного
Render-плана и корректная конфигурация доверенного прокси.

До публичного запуска/масштабирования нужны:

- Общие атомарные MongoDB-лимиты реализованы следующим этапом (RATE_LIMITS.md).
  Перед масштабированием проверить реальную тестовую MongoDB, индекс TTL,
  trust proxy и одинаковую базу/scopes на всех экземплярах. Старые процессы
  с Map не оставлять параллельно новой версии. Схема закрытого теста пока
  сохраняет один экземпляр из-за прочих эксплуатационных ограничений.
- Очередь восстановления с retry и worker реализована по RESET_MAIL_QUEUE.md.
  Перед публикацией нужны отдельный worker, общий ключ шифрования и проверка
  реальных транзакций/lease/TTL на тестовом Atlas. Прочие письма пока best effort.
- Checkout исправлен следующим этапом (CHECKOUT_CHANGES.md). До настоящих
  заказов нужны внешний тест транзакций на replica set, склад и оплата.
- Хранение PDF/обложек в объектном storage и явные ограничения загрузок.
  Сейчас base64 находится в MongoDB, а стандартный JSON parser ограничивает
  размер запроса: большие книги/обложки не являются готовым upload-сценарием.
- Оптимизировать PNG: logo около 1.07 MB, hero 2.03 MB; общий JS около 501 kB.
  Исправлена доступность файлов после build, не их размер. Также остались
  9 предупреждений hooks и уведомления об устаревших browser databases.
- Вычитка qt носителем, включая письма; отдельная проверка реальных сервисов.

## Актуальная документация, использованная для схемы

- https://vercel.com/docs/frameworks/frontend/vite — SPA rewrites.
- https://vercel.com/docs/monorepos/monorepo-faq — исходники вне Root Directory.
- https://vercel.com/docs/frameworks/backend/express — Express как Vercel Function.
- https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package — waitUntil.
- https://vercel.com/docs/environment-variables — переменные deployment.
- https://vite.dev/guide/env-and-mode — VITE_* публичные и build-time.
- https://render.com/docs/deploy-node-express-app — постоянный Node service.
- https://render.com/docs/free — блокировка исходящего SMTP на Free.
- https://render.com/docs/outbound-ip-addresses — CIDR для Atlas allowlist.
- https://expressjs.com/en/guide/behind-proxies/ — trust proxy.
- https://www.mongodb.com/docs/atlas/security-add-mongodb-users/ — отдельные права БД.
- https://nodemailer.com/guides/testing-with-ethereal — перехват тестовой почты.

## Состав локальных коммитов этого этапа

1. `fix(deploy): prepare Vercel SPA build and production assets`

   .vercelignore; frontend/vercel.json; frontend/vite.config.js;
   frontend/.env.example; frontend/tests/deployment.test.cjs;
   frontend/src/components/Home/Hero.jsx; frontend/src/components/Navbar/Navbar.jsx.

2. `feat(deploy): guard staging services and drain background email`

   backend/.env.example; backend/app.js; backend/config/env.js;
   backend/config/deployment.js; backend/conn/conn.js;
   backend/controllers/passwordResetController.js; backend/routes/user.js;
   backend/utils/backgroundTasks.js; backend/tests/deployment.test.js.

3. `docs(deploy): document isolated staging setup and release checks`

   README.md; STAGING_DEPLOYMENT.md.

Все коммиты локальные; push и deployment не выполнялись.

Текущая инструкция worker и новой переменной окружения: [RESET_MAIL_QUEUE.md](RESET_MAIL_QUEUE.md).


## Безопасная диагностика запуска

API: `npm start --prefix backend`. Worker: `npm run worker:reset-mail --prefix backend`.
Команды выполняются отдельно из корня репозитория.

- `STARTUP_CONFIGURATION`: указаны имена отсутствующих переменных либо правила
  формата. Значения переменных не выводятся. Исправить конфигурацию сервиса.
- `STARTUP_DATABASE`: подключение MongoDB не удалось. Проверить URI, права,
  доступ сети и состояние тестового Atlas вручную. Причина драйвера скрыта.
- `STARTUP_QUEUE`: MongoDB подключена, но подготовка коллекции/индексов очереди
  не удалась. Проверить права и конфликты индексов в тестовой базе; автоматически
  удалять индексы или данные не следует.
- `STARTUP_FAILED`: непредвиденная ошибка запуска. Исходный текст и stack скрыты,
  поскольку могут содержать реквизиты. Этот код не доказывает ошибку настроек.

Сообщения не подтверждают доступность SMTP, работоспособность транзакций или
доставку письма. После успешного запуска всё ещё нужен внешний smoke-test
на отдельной базе с Ethereal. Отсутствие ключа очереди не блокирует обычный
вход API, но блокирует worker и восстановление пароля.

Проверки диагностики выполняются с подменёнными подключением MongoDB и
инициализацией очереди, включая ошибку cleanup. Настоящие .env не читаются.

## Автоматические проверки перед публикацией

Добавлен `.github/workflows/ci.yml`: отдельные frontend/backend проверки на Node 24,
без секретов и deployment. Порядок первого запуска, ограничения и настройки
Vercel приведены в [CI.md](CI.md). Успешная CI-сборка использует синтетический
API-домен и не заменяет настройку реального тестового backend/worker и Atlas.
