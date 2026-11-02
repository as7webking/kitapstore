# Переводы de / qt / ru

Изменения выполнены без локальных коммитов, staging, push и деплоя.
Заполнены все 11 разделов для каждого языка (33 новых JSON-файла).
Названия и содержание книг/статей, язык издания, валюта, API и бизнес-логика не менялись.
Письма backend остаются английскими; здесь переведены страницы восстановления,
ошибки и уведомления интерфейса, а не почтовые шаблоны.

## Форматирование

- en: en-GB; de: de-DE; ru: ru-RU через Intl.
- qt: внутренний код qt, HTML crh-Latn. Числовой формат приложения:
  `02.11.2026`, `1 234,5` (неразрывный пробел, десятичная запятая).
  Формат задан явно, без зависимости от поддержки crh конкретным браузером
  и без использования турецкого языка. Это выбранная конвенция приложения,
  а не заявление о единственном языковом стандарте; подтвердить с носителем.
- Даты сохраняют локальный часовой пояс браузера, как прежде.
- Цены форматируются только при отображении; EUR/€ и исходные суммы сохраняются.
- `{{count, number}}` локализует число, числовой count выбирает форму.
  ru дополнительно содержит few/many; qt использует форму существительного
  без множественного суффикса после числительного. Тест проверяет эти исключения.

## Что проверить носителю крымскотатарского

Это полный предварительный перевод на крымскотатарскую латиницу,
не турецкая локализация. Носитель его пока не проверял. Приоритетные
неуверенные формулировки ниже; дополнительно вычитать весь qt/home.json
(маркетинговый текст и отзывы) и длинные инструкции qt/auth.json, qt/messages.json.
В интерфейс замечания и технические пометки не добавлены.

| Ключи в qt | Текущий вариант | Что уточнить |
|---|---|---|
| navigation:favourites, profile:favourites, catalog:favourites и связанные сообщения | Beğenilgenler | Естественное название избранного, отличие от «популярных» |
| orders:all_orders, profile:order_history и семейство заказов | Sımarış / Sımarış keçmişi | Предпочтительный торговый термин и формы |
| catalog:description и связанные подписи | İzaat | Естественное название описания книги |
| common:required | «{{field}}» toldurıñız. | Грамматическая универсальность подстановки названия поля |
| auth:send_reset_link, auth:request_a_new_reset_link | Yañartuv bağlantısını yiber / Yañı yañartuv bağlantısını iste | Термины восстановления и сброса пароля, повелительная форма |
| messages:if_an_account_with_this_email_can_be_recovered_you_will_receive_a_password_reset | Bu e-poçta adresine bağlı esapnı qaytarmaq mümkün olsa… | Естественность длинной нейтральной инструкции без раскрытия аккаунта |
| messages:no_token_provided, messages:invalid_or_expired_token | Kiriş belgisi | Термин для токена, точность значения |
| messages:session_expired_please_sign_in_again и связанные строки | Seansnıñ müddeti bitti. Tekrar kiriñiz. | Единый термин сессии |
| orders:out_for_delivery, catalog:shipping_price | Teslim etile / Teslim fiyatı (€) | Статус «передан в доставку» и стоимость доставки |
| orders:canceled | Lâğu etildi | Употребительность и орфография |
| common:mon_sat_10_00_19_00 | Bazarertesi–Cumartesi | Названия дней недели и допустимость компактного диапазона |

Алфавит сверялся с опубликованными [материалами ООН](https://unstats.un.org/unsd/geoinfo/UNGEGN/docs/10th-uncsgn-docs/econf/E_CONF.101_86_Toponymic%20Guidelines%20for%20Map%20and%20other%20Editors_rus.pdf).
Это источник об алфавите, не языковая экспертиза интерфейсных переводов.

## Проверки

- `npm test --prefix frontend`: 11/11, включая ключи, параметры, русские формы,
  qt, форматирование, fallback, сохранение языка/сессии/корзины и перевод ошибок.
- `npm run build --prefix frontend`: успешно. Остались уведомления о возрасте
  browser compatibility databases; зависимости не обновлялись.
- `npm run lint --prefix frontend`: 0 ошибок, 9 существующих предупреждений useEffect.
- `npm test --prefix backend`: 10/10 с подменёнными внешними сервисами.
  Первый запуск ограничивался EPERM на loopback; повторный с разрешённым
  локальным слушателем прошёл. Реальная MongoDB и SMTP не использовались.
- Браузер: немецкие вход/регистрация/восстановление и меню на 320 px,
  русский экран регистрации, qt с ошибками и неверной ссылкой сброса;
  отсутствие горизонтальной прокрутки на проверенных экранах 320 px,
  немецкая навигация на 768 px. Длинная немецкая кнопка переносится.
  Введённый тестовый логин сохраняется при переключении; ошибка меняет язык.
  Скриншот: /private/tmp/kitapstore-de-mobile.png.
- Приватные таблицы заказов с реальными данными в браузере не открывались;
  их числовое форматирование подключено и покрыто общими unit-тестами.

## Предлагаемые коммиты (не созданы)

Из корня проекта сначала посмотрите `git diff` и `git status --short`.
После проверки носителем можно сделать два коммита. Ничего удалять не нужно.
Не используйте `git add .`, если позже появятся посторонние изменения.

1. `feat(i18n): add German Crimean Tatar and Russian translations`:
   все новые JSON из locales/de, locales/qt, locales/ru, изменения двух
   английских JSON (форматирование count), index.js, LanguageSwitcher.jsx,
   App.jsx и перечисленные ниже компоненты/страницы с formatDate/formatNumber.
2. `test(i18n): validate translated catalogs and document review`:
   frontend/tests/i18n.test.cjs, README.md, I18N_TRANSLATIONS.md.

Для первого шага добавьте точно перечисленные файлы через `git add -- <пути>`,
проверьте `git diff --cached --stat`, затем `git commit -m "<название выше>"`.
Повторите для второго шага. Push не требуется. .env и содержимое dist не добавлять.

## Все изменённые и новые файлы

- `I18N_TRANSLATIONS.md`
- `README.md`
- `frontend/src/App.jsx`
- `frontend/src/components/Admin/UserOrderHistory.jsx`
- `frontend/src/components/BookCard/BookCard.jsx`
- `frontend/src/components/Navbar/Navbar.jsx`
- `frontend/src/components/Profile/UserOrderHistory.jsx`
- `frontend/src/components/ViewBookDetails/ViewBookDetails.jsx`
- `frontend/src/i18n/LanguageSwitcher.jsx`
- `frontend/src/i18n/index.js`
- `frontend/src/i18n/locales/de/auth.json`
- `frontend/src/i18n/locales/de/blog.json`
- `frontend/src/i18n/locales/de/cart.json`
- `frontend/src/i18n/locales/de/catalog.json`
- `frontend/src/i18n/locales/de/common.json`
- `frontend/src/i18n/locales/de/footer.json`
- `frontend/src/i18n/locales/de/home.json`
- `frontend/src/i18n/locales/de/messages.json`
- `frontend/src/i18n/locales/de/navigation.json`
- `frontend/src/i18n/locales/de/orders.json`
- `frontend/src/i18n/locales/de/profile.json`
- `frontend/src/i18n/locales/en/blog.json`
- `frontend/src/i18n/locales/en/catalog.json`
- `frontend/src/i18n/locales/qt/auth.json`
- `frontend/src/i18n/locales/qt/blog.json`
- `frontend/src/i18n/locales/qt/cart.json`
- `frontend/src/i18n/locales/qt/catalog.json`
- `frontend/src/i18n/locales/qt/common.json`
- `frontend/src/i18n/locales/qt/footer.json`
- `frontend/src/i18n/locales/qt/home.json`
- `frontend/src/i18n/locales/qt/messages.json`
- `frontend/src/i18n/locales/qt/navigation.json`
- `frontend/src/i18n/locales/qt/orders.json`
- `frontend/src/i18n/locales/qt/profile.json`
- `frontend/src/i18n/locales/ru/auth.json`
- `frontend/src/i18n/locales/ru/blog.json`
- `frontend/src/i18n/locales/ru/cart.json`
- `frontend/src/i18n/locales/ru/catalog.json`
- `frontend/src/i18n/locales/ru/common.json`
- `frontend/src/i18n/locales/ru/footer.json`
- `frontend/src/i18n/locales/ru/home.json`
- `frontend/src/i18n/locales/ru/messages.json`
- `frontend/src/i18n/locales/ru/navigation.json`
- `frontend/src/i18n/locales/ru/orders.json`
- `frontend/src/i18n/locales/ru/profile.json`
- `frontend/src/pages/AllOrders.jsx`
- `frontend/src/pages/Blog.jsx`
- `frontend/src/pages/BlogDetails.jsx`
- `frontend/src/pages/Cart.jsx`
- `frontend/tests/i18n.test.cjs`
