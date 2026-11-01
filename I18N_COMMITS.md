# Локальные коммиты основы многоязычности

Изменения разделены на три коммита. Push и деплой не выполняются.
Повторно создавать коммиты после работы агента не нужно: используйте
`git log -3 --oneline` и `git show --stat <хеш>` для просмотра состава.
Ниже точные файлы каждой группы. Удалять существующие файлы не требуется.
Секреты, node_modules, dist, временные скриншоты и тестовую браузерную форму
добавлять в Git не нужно. Рабочая папка до этого этапа была чистой.

Коммиты реализации: `684405d` — основа; `3e8bb86` — страницы и формы.

## 1. `feat(i18n): configure locales and English resource catalogs`

Настройка i18next, default/fallback en, внутренний qt и HTML lang, отдельное хранение языка, переключатель, английские словари и адаптер сообщений API.

Файлы:

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/i18n/LanguageSwitcher.jsx`
- `frontend/src/i18n/index.js`
- `frontend/src/i18n/locales/en/auth.json`
- `frontend/src/i18n/locales/en/blog.json`
- `frontend/src/i18n/locales/en/cart.json`
- `frontend/src/i18n/locales/en/catalog.json`
- `frontend/src/i18n/locales/en/common.json`
- `frontend/src/i18n/locales/en/footer.json`
- `frontend/src/i18n/locales/en/home.json`
- `frontend/src/i18n/locales/en/messages.json`
- `frontend/src/i18n/locales/en/navigation.json`
- `frontend/src/i18n/locales/en/orders.json`
- `frontend/src/i18n/locales/en/profile.json`
- `frontend/src/i18n/messageAliases.json`

Перед коммитом просмотреть `git diff --cached`; добавлять только перечисленные файлы.

## 2. `feat(i18n): localize storefront and keep form messages reactive`

Подключение к приложению и существующим страницам. Английский UI, сообщения, подписи, поиск, счётчики, формы и ошибки без сброса ввода. Backend и данные книг/статей не меняются.

Файлы:

- `frontend/src/App.jsx`
- `frontend/src/auth/AccountForm.jsx`
- `frontend/src/auth/RequireAuth.jsx`
- `frontend/src/auth/passwordReset.js`
- `frontend/src/auth/session.js`
- `frontend/src/components/Admin/MobileNav.jsx`
- `frontend/src/components/Admin/Settings.jsx`
- `frontend/src/components/Admin/Sidebar.jsx`
- `frontend/src/components/Admin/UserOrderHistory.jsx`
- `frontend/src/components/BookCard/BookCard.jsx`
- `frontend/src/components/Footer/Footer.jsx`
- `frontend/src/components/Home/About.jsx`
- `frontend/src/components/Home/Hero.jsx`
- `frontend/src/components/Home/Popular.jsx`
- `frontend/src/components/Home/RecentlyAdded.jsx`
- `frontend/src/components/Home/Testimonials.jsx`
- `frontend/src/components/Loader/Loader.jsx`
- `frontend/src/components/Navbar/Navbar.jsx`
- `frontend/src/components/Profile/Favourites.jsx`
- `frontend/src/components/Profile/MobileNav.jsx`
- `frontend/src/components/Profile/Settings.jsx`
- `frontend/src/components/Profile/Sidebar.jsx`
- `frontend/src/components/Profile/UserOrderHistory.jsx`
- `frontend/src/components/SearchBooks/SearchBooks.jsx`
- `frontend/src/components/ViewBookDetails/ViewBookDetails.jsx`
- `frontend/src/main.jsx`
- `frontend/src/pages/AddBlog.jsx`
- `frontend/src/pages/AddBook.jsx`
- `frontend/src/pages/Admin.jsx`
- `frontend/src/pages/AllBooks.jsx`
- `frontend/src/pages/AllOrders.jsx`
- `frontend/src/pages/Blog.jsx`
- `frontend/src/pages/BlogDetails.jsx`
- `frontend/src/pages/Cart.jsx`
- `frontend/src/pages/Contact.jsx`
- `frontend/src/pages/ForgotPassword.jsx`
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Profile.jsx`
- `frontend/src/pages/ResetPassword.jsx`
- `frontend/src/pages/SearchResults.jsx`
- `frontend/src/pages/SeeUserData.jsx`
- `frontend/src/pages/SignUp.jsx`
- `frontend/src/pages/UpdateBook.jsx`

Перед коммитом просмотреть `git diff --cached`; добавлять только перечисленные файлы.

## 3. `test(i18n): cover language persistence and document workflow`

Тесты полноты ключей, fallback, хранения языка, HTML lang и повторного отображения ошибок; документация дальнейших переводов.

Файлы:

- `frontend/tests/i18n.test.cjs`
- `README.md`
- `I18N_COMMITS.md`

Перед коммитом просмотреть `git diff --cached`; добавлять только перечисленные файлы.

## Проверки

```bash
npm test --prefix frontend
npm run build --prefix frontend
npm run lint --prefix frontend
git diff --check
```

Браузер: форма регистрации на 320/1280 px, qt с HTML crh-Latn и английским
fallback, сохранение URL и ввода, сохранение выбора после обновления страницы.
На изолированной форме с временными ресурсами проверено обновление уже показанной
обязательной ошибки и старой ошибки API при переключении, без повторного запроса.
Производственные ресурсы de/qt/ru остаются пустыми, с явным fallback en.

Для следующих задач: сначала завершить и проверить одну группу изменений,
затем `git add <конкретные пути>`, `git diff --cached`, `git commit -m "..."`.
`git add` не отправляет файлы на GitHub. При случайном добавлении используйте
`git restore --staged <путь>`: содержимое рабочей папки сохранится.

Итог английских ресурсов: 266 ключей в 11 словарях.
