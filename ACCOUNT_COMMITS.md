# Коммиты этапа аккаунтов

Новых коммитов не создавалось; push не выполнялся. Рекомендуется **4 коммита**
по порядку ниже. Большая часть реализации аккаунтов уже находилась в рабочей
папке перед этим проходом: изменения сохранены, проверены и дополнены.

Перед каждым коммитом проверьте `git diff` и `git diff --cached`.
Не используйте `git add .`: `backend/test-backend.js` существовал до этапа
и не входит в списки. Реальные `.env` не коммитить.

## 1. После проверки серверных сценариев

Название: `feat(auth): validate accounts and revoke JWT sessions on logout`

Серверная проверка имени/email/пароля, нормализация email, обработка дублей, bcrypt 12,
вход по имени или email, лимиты запросов, отзыв сессий и актуальные права из базы.
Изменение passport.js только сохраняет совместимость служебного поля версии сессии;
новый OAuth не разрабатывался. Серверные проверки ролей защищают существующие API,
функции админки не добавляются.

Файлы:

- `backend/utils/accountValidation.js`
- `backend/middleware/authRateLimit.js`
- `backend/models/user.js`
- `backend/utils/jwt.js`
- `backend/config/passport.js`
- `backend/routes/user.js`
- `backend/routes/book.js`
- `backend/routes/order.js`
- `backend/routes/blog.js`
- `backend/tests/accounts.test.js`
- `backend/tests/foundation.test.js`

```bash
git add backend/utils/accountValidation.js
git add backend/middleware/authRateLimit.js
git add backend/models/user.js
git add backend/utils/jwt.js
git add backend/config/passport.js
git add backend/routes/user.js
git add backend/routes/book.js
git add backend/routes/order.js
git add backend/routes/blog.js
git add backend/tests/accounts.test.js
git add backend/tests/foundation.test.js
npm test --prefix backend
git diff --cached
git commit -m "feat(auth): validate accounts and revoke JWT sessions on logout"
```

## 2. После проверки форм и жизненного цикла сессии

Название: `feat(auth): protect account pages and unify browser sessions`

Защищённые страницы, единая сессия, обработка 401 и срока токена, синхронизация
вкладок, защита от запоздавших ответов входа/выхода, адаптивные формы с ошибками
полей и блокировкой повторной отправки. История заказов больше не очищает
авторизацию отдельно при 403.

Файлы:

- `frontend/src/auth/AccountForm.jsx`
- `frontend/src/auth/RequireAuth.jsx`
- `frontend/src/auth/session.js`
- `frontend/src/store/auth.js`
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/SignUp.jsx`
- `frontend/src/pages/Profile.jsx`
- `frontend/src/pages/Admin.jsx`
- `frontend/src/components/Profile/Sidebar.jsx`
- `frontend/src/components/Admin/Sidebar.jsx`
- `frontend/src/components/Profile/UserOrderHistory.jsx`
- `frontend/src/components/Admin/UserOrderHistory.jsx`
- `frontend/src/components/Navbar/Navbar.jsx`
- `frontend/tests/session.test.cjs`
- `frontend/package.json`

```bash
git add frontend/src/auth/AccountForm.jsx
git add frontend/src/auth/RequireAuth.jsx
git add frontend/src/auth/session.js
git add frontend/src/store/auth.js
git add frontend/src/pages/Login.jsx
git add frontend/src/pages/SignUp.jsx
git add frontend/src/pages/Profile.jsx
git add frontend/src/pages/Admin.jsx
git add frontend/src/components/Profile/Sidebar.jsx
git add frontend/src/components/Admin/Sidebar.jsx
git add frontend/src/components/Profile/UserOrderHistory.jsx
git add frontend/src/components/Admin/UserOrderHistory.jsx
git add frontend/src/components/Navbar/Navbar.jsx
git add frontend/tests/session.test.cjs
git add frontend/package.json
git add -p frontend/src/App.jsx
npm test --prefix frontend
npm run build --prefix frontend
npm run lint --prefix frontend
git diff --cached
git commit -m "feat(auth): protect account pages and unify browser sessions"
```

`frontend/src/App.jsx` также входит во второй коммит, но требует выбора изменений
через `git add -p`: исправления `/search` и алиасов `/profile/favourites`,
`/profile/order-history`, `/profile/settings` существовали до этапа аккаунтов.
Сохраните их; если это отдельная ваша работа, сначала оформите её отдельно.
Пример выше не добавляет весь App.jsx автоматически.

## 3. После визуальной проверки подвала

Название: `fix(ui): update footer copyright to 2026`

Заменяет 2025 на 2026 без изменения оформления.

Файлы:

- `frontend/src/components/Footer/Footer.jsx`

```bash
git add frontend/src/components/Footer/Footer.jsx
git diff --cached
git commit -m "fix(ui): update footer copyright to 2026"
```

## 4. После общей проверки и сверки инструкции

Название: `docs(auth): document sessions checks and commit order`

Документация выбранного механизма сессии, его ограничений, проверок
и состава коммитов.

Файлы:

- `README.md`
- `ACCOUNT_COMMITS.md`

```bash
git add README.md
git add ACCOUNT_COMMITS.md
git diff --cached
git commit -m "docs(auth): document sessions checks and commit order"
```

## Фактически повторённые проверки в этом проходе

- Backend: 9 тестов, включая HTTP-сценарии с моделью базы в памяти.
- Frontend: 3 теста с реальным Axios и тестовым adapter: восстановление,
  истечение, выход, сетевой сбой, вкладки, запоздавшие ответы.
- `npm run build --prefix frontend`: успешно.
- `npm run lint --prefix frontend`: 0 ошибок, 9 предупреждений useEffect.
- Браузер: мобильная форма на 320 px, форма входа на 1280 px без
  горизонтального переполнения; пустые поля, фокус на первом ошибочном поле,
  отправка Enter и перенаправление гостя из `/profile/settings` на login.
- В подвале отображается 2026.

Браузер использовал нерабочий тестовый адрес API; реальных аккаунтов не создавалось.
Успешная регистрация/вход и отзыв токенов проверены HTTP-тестами с подменой базы.
MongoDB пользователя, SMTP и внешние OAuth-провайдеры не использовались.

## «Забыл пароль»

В этом этапе не разрабатывался. Существующие endpoints ещё не являются
законченным безопасным сценарием; страница ForgotPassword пустая.
Следующий этап: письмо с одноразовой ссылкой, хранение хеша токена и срока,
страница нового пароля, одноразовое использование, лимиты запросов,
отзыв старых сессий и тесты. Новую ссылку на неработающий сценарий не добавляли.
