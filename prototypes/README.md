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
- Отладка: Browser Toolbox (Ctrl+Alt+Shift+I), консоль браузера (Ctrl+Shift+J).
