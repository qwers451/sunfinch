# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

## Mobile view button

sunfinch-mobile-view-button =
    .label = Мобильная версия
    .tooltiptext = Показать страницу как на телефоне

## Screenshot button

sunfinch-screenshot-button =
    .label = Скриншот
    .tooltiptext = Снимок видимой области (Shift — вся страница)

## Spaces

sunfinch-spaces-switcher =
    .label = Пространства
sunfinch-space-add =
    .title = Новое пространство
sunfinch-space-default-name = Пространство { $number }
sunfinch-space-edit =
    .label = Изменить…
sunfinch-space-delete =
    .label = Удалить пространство (вкладки перейдут в первое)
sunfinch-tab-make-main =
    .label = Сделать основной (останется после перезапуска)
sunfinch-tab-make-additional =
    .label = Сделать дополнительной (закроется при выходе)
sunfinch-tab-move-to-space =
    .label = Переместить в пространство

## Notes

sunfinch-notes-button =
    .label = Заметки
    .tooltiptext = Быстрые заметки
sunfinch-notes-title = Заметки
sunfinch-notes-text =
    .placeholder = Пишите что угодно…
sunfinch-notes-saved = Сохранено
sunfinch-notes-hint = Одна заметка на все пространства

## Glance

sunfinch-glance-expand = Открыть вкладкой
sunfinch-glance-close =
    .title = Закрыть (Esc)
    .aria-label = Закрыть

## Claude side panel

sunfinch-claude-button =
    .label = Claude
    .tooltiptext = Спросить Claude об этой странице
sunfinch-claude-title = Claude
sunfinch-claude-new-chat = Новый чат
sunfinch-claude-use-page = Учитывать страницу:
sunfinch-claude-input =
    .placeholder = Спросите об этой странице…
sunfinch-claude-send = Отправить
sunfinch-claude-stop = Остановить
sunfinch-claude-stopped = Остановлено.
sunfinch-claude-not-found = Claude Code не найден. Установите его или укажите путь к claude.exe в about:config: sunfinch.claude.path
sunfinch-claude-error = Claude не ответил: { $message }
sunfinch-claude-empty-title = Спросите об этой странице
sunfinch-claude-empty-text = Claude прочитает текст страницы — или только выделенный фрагмент. Уточняющие вопросы продолжают тот же разговор.
sunfinch-claude-suggestions = Подсказки
sunfinch-claude-suggest-summary = Кратко перескажи
sunfinch-claude-suggest-facts = Найди даты и цифры
sunfinch-claude-suggest-simple = Объясни простыми словами
sunfinch-claude-suggest-quiz = Составь вопросы для самопроверки
sunfinch-claude-hint = Enter — отправить · Shift+Enter — строка

## SunFinch section in Settings

sunfinch-prefs-title = SunFinch
sunfinch-prefs-glance-enabled = Открывать ссылки в Glance по клику с клавишей
sunfinch-prefs-glance-modifier = Клавиша для Glance:
sunfinch-prefs-modifier-alt = Alt
sunfinch-prefs-modifier-shift = Shift
sunfinch-prefs-modifier-ctrl = Ctrl
sunfinch-prefs-modifier-meta = Windows
sunfinch-prefs-unload = Выгружать вкладки покинутого пространства через:
sunfinch-prefs-unload-0 = Никогда
sunfinch-prefs-unload-5 = 5 минут
sunfinch-prefs-unload-15 = 15 минут
sunfinch-prefs-unload-30 = 30 минут
sunfinch-prefs-unload-60 = 1 час
sunfinch-prefs-unload-120 = 2 часа
sunfinch-prefs-screenshot = Кнопка «Скриншот»:
sunfinch-prefs-screenshot-both = Сохранять в «Загрузки» и копировать
sunfinch-prefs-screenshot-file = Сохранять в «Загрузки»
sunfinch-prefs-screenshot-clipboard = Копировать в буфер обмена
sunfinch-prefs-claude-path = Путь к Claude Code:
sunfinch-prefs-claude-path-input =
    .placeholder = Определяется автоматически
sunfinch-prefs-claude-model = Модель Claude:
sunfinch-prefs-claude-model-input =
    .placeholder = По умолчанию Claude Code

## Закладки нового профиля

sunfinch-bookmarks-title = Закладки
sunfinch-bookmarks-heading = Закладки
sunfinch-bookmarks-folder = { -brand-short-name }
sunfinch-bookmarks-project = { -brand-short-name } на GitHub
sunfinch-bookmarks-releases = Выпуски и изменения
sunfinch-bookmarks-issues = Сообщить о проблеме

## Пространства: заголовки разделов списка вкладок (показываются заглавными), цвет и значок

sunfinch-section-main = Основные
sunfinch-section-additional = Дополнительные
sunfinch-space-color-orange =
    .title = Оранжевый
sunfinch-space-color-indigo =
    .title = Индиго
sunfinch-space-color-teal =
    .title = Бирюзовый
sunfinch-space-color-amber =
    .title = Янтарный
sunfinch-space-color-pink =
    .title = Розовый
sunfinch-space-color-green =
    .title = Зелёный
sunfinch-space-color-sky =
    .title = Голубой
sunfinch-space-color-slate =
    .title = Серый
sunfinch-space-icon-space =
    .title = Простой
sunfinch-space-icon-work =
    .title = Работа
sunfinch-space-icon-study =
    .title = Учёба
sunfinch-space-icon-home =
    .title = Дом
sunfinch-space-icon-book =
    .title = Книга
sunfinch-space-icon-code =
    .title = Код
sunfinch-space-icon-flask =
    .title = Наука
sunfinch-space-icon-globe =
    .title = Глобус
sunfinch-space-icon-heart =
    .title = Сердце
sunfinch-space-icon-music =
    .title = Музыка
sunfinch-space-icon-plane =
    .title = Путешествия
sunfinch-space-icon-star =
    .title = Звезда
sunfinch-space-icon-cart =
    .title = Покупки

## Диалог нового пространства и изменения пространства

sunfinch-space-dialog-new-title = Новое пространство
sunfinch-space-dialog-edit-title = Изменить пространство
sunfinch-space-dialog-close =
    .title = Закрыть
    .aria-label = Закрыть
sunfinch-space-dialog-name = Название
# Variables:
#   $name (String) - the name the space gets when the field is left empty
sunfinch-space-dialog-name-hint = Если оставить пустым — «{ $name }»
sunfinch-space-dialog-color = Цвет
sunfinch-space-dialog-icon = Значок
sunfinch-space-dialog-preview = Так будет в панели
sunfinch-space-dialog-keys-new = Enter — создать · Esc — отмена
sunfinch-space-dialog-keys-edit = Enter — сохранить · Esc — отмена
sunfinch-space-dialog-cancel = Отмена
sunfinch-space-dialog-create = Создать
sunfinch-space-dialog-save = Сохранить
