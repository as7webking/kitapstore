# Коммиты восстановления пароля

Изменения разделены на три локальных коммита: backend → frontend → документация.
Push не выполняется. Повторно создавать эти коммиты после работы агента не нужно:
посмотрите их через `git log -3 --oneline` и `git show --stat <хеш>`.

Ниже точный состав и команды, объясняющие разбиение. Для следующих задач используйте
тот же порядок: завершить изменение → проверить → выбрать конкретные файлы →
посмотреть индекс → создать коммит. `git add` добавляет в коммит **текущее содержимое**,
а не создаёт файлы заново. Не используйте `git add .` при посторонних изменениях.

Backend-коммит: `01e827e`; frontend-коммит: `d103935`.

## 1. Backend после серверных тестов

Название: `feat(auth): implement single-use password recovery and session revocation`

```bash
git add backend/controllers/passwordResetController.js \
  backend/app.js backend/models/user.js backend/routes/user.js backend/utils/accountValidation.js \
  backend/utils/mailer.js backend/tests/passwordReset.test.js backend/.env.example
npm test --prefix backend
git diff --cached
git commit -m "feat(auth): implement single-use password recovery and session revocation"
```

## 2. Frontend после тестов, сборки и проверки форм

Название: `feat(auth): add responsive password recovery and reset pages`

```bash
git add frontend/src/App.jsx frontend/src/auth/AccountForm.jsx \
  frontend/src/auth/passwordReset.js frontend/src/pages/Login.jsx \
  frontend/src/pages/ForgotPassword.jsx frontend/src/pages/ResetPassword.jsx \
  frontend/tests/passwordReset.test.cjs
npm test --prefix frontend
npm run build --prefix frontend
npm run lint --prefix frontend
git diff --cached
git commit -m "feat(auth): add responsive password recovery and reset pages"
```

## 3. Документация после общей проверки

Название: `docs(auth): explain SMTP setup and password recovery commits`

```bash
git add README.md PASSWORD_RESET_COMMITS.md
git diff --cached
git commit -m "docs(auth): explain SMTP setup and password recovery commits"
```

## Что добавлять и удалять

- Включаются только файлы из списков выше. Новые controller, ResetPassword,
  вспомогательный файл frontend, тесты и этот документ нужно добавить в Git.
- Существующие user.js, модель, mailer, формы, App и README коммитятся как изменения.
- Удалять файлы на этом этапе не требуется. Старый незавершённый код восстановления
  заменён внутри user.js; пустая страница ForgotPassword заполнена.
- `backend/test-backend.js` существовал до этапа и остаётся вне коммитов.
- Настоящие `.env`, пароли, `node_modules`, `dist`, временные скриншоты не добавлять.
- Если файл попал в индекс случайно: `git restore --staged <путь>` — это убирает его
  из будущего коммита и сохраняет содержимое в рабочей папке.
- `git rm` нужен только при намеренном удалении отслеживаемого файла; здесь не нужен.

Рабочая MongoDB не изменялась; SMTP проверен подменённым транспортом.
Для реальной доставки заполните backend/.env по инструкции в README.
