# Промпт для Claude Design, шаг 2

Вставить в тот же проект Claude Design (там уже есть бриф, логотип и направление A2). Всё ниже линии.

---

Great work — direction **A2 «Прибор-моно»** is approved. The tokens, icons, app icon, main window and the screens for notes, Glance, Claude, the new space dialog and the tab menu are what we'll implement. Keep the same style, tokens (`--sf-*`) and Russian UI strings for everything below. Don't redesign what's already done unless a point below asks for it.

## 1. New screens (in priority order)

1. **New tab page = home page** (decided: our own SunFinch page, replaces Firefox's). No ads, no news feed. Contents to explore: Google search field; frequently visited sites and/or bookmarks; the **main tabs of the current space** as quick links; a glance at the shared note; a shortcut to ask Claude. Show the empty state (new profile) and a filled state. Dark and light.
2. **First-run screen** — a short welcome (1–3 steps) explaining spaces (main vs additional tabs), Glance (Alt+click), notes and the Claude panel, with a "Start" button. Optional import from another browser on the last step.
3. **History page** (`about:history`, opens with Ctrl+H) — see section 4.9 of the brief: search, grouping by date (Today, Yesterday, This week, This month, Earlier) and a "by site" view, filters (date range, site), row = favicon, title, URL, time, optional page preview; actions (open, open in new tab, open in space…, delete, "forget this site"); empty / no results / loading states; delete confirmation. It must work with hundreds of thousands of entries (virtualized list) — design for density.
4. **Split View** — two tabs side by side (Firefox's native split view, we restyle it): splitter, active half, how the pair looks in the left tab list, closing one half, and Glance opened over a split view.
5. **SunFinch group in Settings** (`about:preferences`, General section, Firefox's native settings page that we restyle lightly): Glance on/off and modifier key, "unload tabs of a space you left after…", screenshot button mode, Claude Code path and model. Show it inside the native settings layout.

## 2. Missing states of existing parts

- **Left tab list collapsed** (icons only, 52px): space switcher behaviour when the list is collapsed, section markers, tooltips.
- **Many spaces** in the top switcher (8–12, long names): overflow (scroll, "more" menu, or numbers only) and the narrow-window case.
- **Space context menu** (right click on a space: rename, change color/icon, delete) and the **edit-space dialog** (same as "new space", filled), plus **delete confirmation** ("tabs move to the first space").
- **Drag and drop:** a tab dragged across the main/additional divider, a tab dragged onto another space, reordering spaces.
- **Glance:** loading, page error, and the narrow-window variant.
- **Screenshot button:** confirmation after a shot (flash, "copied" hint, thumbnail?) and how to hint Shift = whole page.
- **Mobile view button** "on" state together with Firefox's responsive-design frame around the page.
- **Private window** variant of the main window (how SunFinch marks a private window).
- **Light theme** versions of every screen that exists only in dark (notes, Glance, Claude states, dialog, tab menu).

## 3. Native Firefox parts we restyle with the tokens

Give guidance (one board is enough, light + dark) for: address bar dropdown (suggestions), main menu (≡), downloads panel, permission and site-information popups, find bar, tooltips, scrollbars, the generic context menu, and an in-page error page (no connection). These are Firefox's own elements — we only change colors, fonts, radii, spacing.

## 4. Branding outside the window

- **About SunFinch** window: logo, name, version 0.1.0, "based on Mozilla Firefox ESR, MPL-2.0" note, links.
- **Windows installer** (NSIS): header image 150×57 px, side banner 164×314 px (BMP-compatible, no transparency), plus the uninstaller variant.

## 5. Handoff for implementation

- **Clean HTML/CSS per component** (tab row, space button, section header, toolbar button, notes window, Glance frame, Claude panel parts, dialog, menu item, settings group, new tab page) using only the `--sf-*` tokens, with all states. We port it into Firefox's chrome CSS, so plain CSS (no frameworks, no JS) is ideal.
- Fonts: JetBrains Mono for UI is fine — we'll bundle the official OFL release (Cyrillic included). If you use Golos Text anywhere, say where.
- List anything in the current screens that needs behaviour we haven't described (e.g. the reply chips under Claude answers, the "Копировать" button on code blocks, "Сохранено" in notes) so we can build it.
