# Промпт для Claude Design

Вставить в Claude Design всё ниже линии вместе с файлом `docs/DESIGN-BRIEF.md` и логотипом `branding/source/sunfinch-logo.webp`.

---

You are an interface designer. Design the UI of **SunFinch**, a desktop web browser for Windows built on the Firefox engine. Attached are the brief (`DESIGN-BRIEF.md`, in Russian) with every feature, the window layout, states and UI texts, and the logo. Decisions marked **[решено]** ("decided") in the brief are fixed: where things go is already settled. Your job is how it all looks.

The interface language is **Russian** (English is the source language). Use the Russian strings from the brief in the mockups; they are 20–40% longer than English, so layouts must hold them.

## Style

**Retro-futurism, but ultra-modern and minimal.** Picture an interface as the space-age and sci-fi of the 1960s–70s imagined it, built today with the precision of a modern product. The mood reference is the monumental scale and warm light of films like *Dune*, but **not the Dune aesthetic itself**: no desert, sand, arabesques, stone or fabric textures.

How it should show:
- **Geometry and precision.** A strict grid, hairline 1 px dividers, exact spacing. The feel of an instrument panel or a technical drawing, but very clean.
- **Nearly square corners.** Radius 0–4 px, never more. No pills, no soft bubbles.
- **Minimalism.** Few elements, plenty of air, no decoration for its own sake. The retro-futurism lives in the details: typography, thin rules, labels, rhythm — not ornaments.
- **Typography.** A geometric or technical sans for headings and labels, possibly with wide proportions. Small utility labels in small caps or letter-spaced uppercase (e.g. «ОСНОВНЫЕ», «ДОПОЛНИТЕЛЬНЫЕ»). Tabular/monospaced figures and labels are welcome. Fonts must be open-licensed (OFL) so they can be bundled with the browser; body text in the system font (Segoe UI Variable) or an equally open one. The fonts must support Cyrillic.
- **Light, not shadows.** Depth comes from background tone and thin lines, not heavy shadows. Accents may "glow" — a thin bar, an indicator glow — but with restraint.

## Color — matched to the logo

The logo is a geometric bird: yellow `#FFB300`, light yellow `#FFD020`, orange `#FF5F00`, indigo `#4433E0`, deep navy `#11132F`, teal `#00ADA0`.
- **Dark theme is the primary one.** Base on the deep navy `#11132F` (night sky, instrument panel). Warm yellow and orange for accents and active states, indigo for focus and selection, teal for status (success, "saved").
- **Light theme**: a warm paper/cream base, the same accent set, navy for text.
- Bright colors only as points of emphasis. The UI as a whole stays calm; the web page remains the main thing.
- Pick 6–8 space colors from the same palette, distinct from each other and clearly visible on both backgrounds.
- Text contrast at least WCAG AA.

## GNOME-style tabs

Style the vertical tab list on the left after GNOME tabs (libadwaita, AdwTabBar):
- flat rows, no borders or separators between tabs;
- the selected tab gets a soft fill slightly lighter than the background (not loud), and in our style a thin accent marker on the left;
- the close button appears on hover and is always visible on the selected tab;
- favicon, single-line title with ellipsis;
- indicators (audio, loading, pinned) small and quiet;
- the "main" and "additional" sections are divided by a thin line and a small uppercase label;
- collapsed mode: a column of favicons with the same selection logic.

The space switcher at the top follows the same spirit: an even row, no borders on inactive spaces, the active one gets a fill and a marker in the space's color.

## What to make

**Step 1 — directions.** Show 3 distinct style directions within the above, all on the same screen: the main window in the dark theme with an article open, 3 spaces («Работа», «Учёба», «Личное»), 2 main and 4 additional tabs. Label how the directions differ. I will pick one.

**Step 2 — for the chosen direction:**
1. Design tokens: colors (dark and light), space colors, radii, line weights, spacing, typography, shadows and glow. Deliver them as CSS custom properties (`--sf-…`) so they can go straight into code.
2. Screens in the dark and light themes:
   - the main window;
   - the notes window open (pops up at the top right under its button);
   - Glance over a page;
   - the Claude panel on the right: empty with suggestions, with a conversation, with an error;
   - the new space dialog (name, color, icon);
   - the tab context menu with our items.
3. Element states: hover, pressed, focus, disabled, and "on" for toggle buttons.
4. 16×16 icons as **single-color SVG** with `fill="context-fill"` (the theme sets the color, so no gradients): add space, notes, Claude, mobile view, screenshot, "open as tab" (Glance), "main tab", isolated space. Same style: geometry, thin lines, nearly square corners.
5. An app icon based on the logo, and a simplified mark for 16–32 px (e.g. the bird's head with beak and eye).

**Later:** the history page, Split View, the settings section.

## Constraints

- This is the UI of a Firefox-based browser: toolbars, arrow popups and context menus are native elements that we restyle with CSS. Don't invent anything that needs a custom rendering engine.
- Never use the name "Firefox" or Mozilla logos.
- Everything must work from the keyboard, with focus always visible.
