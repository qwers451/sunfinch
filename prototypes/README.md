# Прототипы

Chrome-скрипты фич обкатываются здесь на обычном Firefox ESR 153 через [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig), без сборки форка. Готовый скрипт переносится модулем в `src/browser/components/sunfinch/`.

## Стенд

| Что | Где |
|---|---|
| Firefox ESR 153.5 (portable, обновления выключены политикой) | `E:\tools\firefox-esr-153` |
| fx-autoconfig: `config.js` и `defaults/pref/config-prefs.js` | там же |
| Профиль, в нём `chrome/utils` из fx-autoconfig | `E:\tools\sunfinch-proto\profile` |
| `chrome/JS`, `chrome/CSS` профиля | junction на `prototypes/JS` и `prototypes/CSS` |

Запуск: `tools\proto.cmd`. Скрипт копирует `user.js` в профиль и стартует браузер с `-purgecaches`, чтобы правки скриптов подхватывались после перезапуска.

## Правила

- Скрипты окна: `JS/*.uc.js` или `JS/*.uc.mjs`, стили: `CSS/*.uc.css`.
- Пишем так же, как потом в форке: `IOUtils`/`PathUtils`, без `UC_API` там, где можно обойтись без него, чтобы перенос был механическим.
- `sunfinch-proto-check.uc.js` проверяет загрузку: пишет `proto-check.txt` в профиль.
- Самопроверка: `powershell -File tools\proto-selftest.ps1` запускает браузер headless на чистом временном профиле (`E:\tools\sunfinch-proto\selftest-profile`, рабочий профиль не трогается) в две фазы. Фаза 1 — проверки и подготовка, затем выход. Фаза 2 — запуск с восстановлением сессии и проверка того, что пережило перезапуск. `zz-sunfinch-selftest.uc.js` пишет отчёты `selftest-1.json` и `selftest-2.json`. Без настройки `sunfinch.proto.selftest` скрипт ничего не делает. Новую фичу добавляем вместе с проверками в нём.
- JSWindowActor: папка `JS/<Имя>/` с `<Имя>Parent.sys.mjs` и `<Имя>Child.sys.mjs`, регистрация через `ChromeUtils.registerWindowActor` с адресами `chrome://userscripts/content/<Имя>/...`.
- Отладка: Browser Toolbox (Ctrl+Alt+Shift+I), консоль браузера (Ctrl+Shift+J).

## Что есть

| Прототип | Файлы | Статус |
|---|---|---|
| Кнопка «мобильная версия» | `JS/sunfinch-mobile-view.uc.js` | Работает: RDM 390×844, DPR 3, тач, iPhone UA, состояние кнопки следует за RDM |
| Кнопка «скриншот» | `JS/sunfinch-screenshot.uc.js`, `JS/SunfinchScreenshot/` | Работает: клик — видимая область, Shift+клик — вся страница; в файл (через менеджер загрузок) и/или в буфер, pref `sunfinch.screenshot.target` |
| Иконки кнопок | `CSS/sunfinch-buttons.uc.css` | Временно штатные иконки Firefox |
| Пространства | `JS/sunfinch-spaces.uc.js`, `JS/SunfinchSpaces/`, `CSS/sunfinch-spaces.uc.css` | Работает: переключатель сверху, вкладки пространства слева; основные вкладки переживают перезапуск, дополнительные закрываются; контекстное меню вкладки «сделать основной/дополнительной», «в пространство…»; правый клик по пространству — переименовать/удалить |
| Заметки | `JS/sunfinch-notes.uc.js`, `JS/SunfinchNotes/`, `CSS/sunfinch-notes.uc.css` | Работает: кнопка справа вверху, всплывающая панель; одна заметка на все пространства и окна; `sunfinch-notes.json` в профиле, сохранение с задержкой 500 мс и при выходе |
| Базовая тема (черновик) | `CSS/sunfinch-theme.uc.css` | Палитра логотипа, акцент у выбранной вкладки и включённых кнопок, цвет фокуса; ждёт оценки вживую |
