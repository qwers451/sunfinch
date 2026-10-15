# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

## Mobile view button

sunfinch-mobile-view-button =
    .label = Mobile view
    .tooltiptext = Show this page as on a phone

## Screenshot button

sunfinch-screenshot-button =
    .label = Screenshot
    .tooltiptext = Screenshot of the visible area (Shift: whole page)

## Spaces

sunfinch-spaces-switcher =
    .label = Spaces
sunfinch-space-add =
    .title = New space
# Variables:
#   $number (Number) - position of the new space in the list
sunfinch-space-default-name = Space { $number }
sunfinch-space-edit =
    .label = Edit…
sunfinch-space-delete =
    .label = Delete space (its tabs move to the first space)
sunfinch-tab-make-main =
    .label = Make main tab (kept after restart)
sunfinch-tab-make-additional =
    .label = Make additional tab (closed on exit)
sunfinch-tab-move-to-space =
    .label = Move to space

## Notes

sunfinch-notes-button =
    .label = Notes
    .tooltiptext = Quick notes
sunfinch-notes-title = Notes
sunfinch-notes-text =
    .placeholder = Write anything…
sunfinch-notes-saved = Saved
sunfinch-notes-hint = One note for all spaces

## Glance

sunfinch-glance-expand = Open as tab
sunfinch-glance-close =
    .title = Close (Esc)
    .aria-label = Close

## Claude side panel

sunfinch-claude-button =
    .label = Claude
    .tooltiptext = Ask Claude about this page
sunfinch-claude-title = Claude
sunfinch-claude-new-chat = New chat
sunfinch-claude-use-page = Use the page:
sunfinch-claude-input =
    .placeholder = Ask about this page…
sunfinch-claude-send = Send
sunfinch-claude-stop = Stop
sunfinch-claude-stopped = Stopped.
sunfinch-claude-not-found = Claude Code is not found. Install it, or set the path to claude.exe in about:config: sunfinch.claude.path
# Variables:
#   $message (String) - error text from Claude Code
sunfinch-claude-error = Claude did not answer: { $message }
sunfinch-claude-empty-title = Ask about this page
sunfinch-claude-empty-text = Claude reads the text of the page, or only the selected part. Follow-up questions continue the same conversation.
sunfinch-claude-suggestions = Suggestions
sunfinch-claude-suggest-summary = Summarize briefly
sunfinch-claude-suggest-facts = Find dates and numbers
sunfinch-claude-suggest-simple = Explain in simple words
sunfinch-claude-suggest-quiz = Make questions to test myself
sunfinch-claude-hint = Enter to send · Shift+Enter for a new line

## SunFinch section in Settings

sunfinch-prefs-title = SunFinch
sunfinch-prefs-glance-enabled = Open links in Glance with a modifier click
sunfinch-prefs-glance-modifier = Glance modifier key:
sunfinch-prefs-modifier-alt = Alt
sunfinch-prefs-modifier-shift = Shift
sunfinch-prefs-modifier-ctrl = Ctrl
sunfinch-prefs-modifier-meta = Windows
sunfinch-prefs-unload = Unload tabs of a space you left after:
sunfinch-prefs-unload-0 = Never
sunfinch-prefs-unload-5 = 5 minutes
sunfinch-prefs-unload-15 = 15 minutes
sunfinch-prefs-unload-30 = 30 minutes
sunfinch-prefs-unload-60 = 1 hour
sunfinch-prefs-unload-120 = 2 hours
sunfinch-prefs-screenshot = Screenshot button:
sunfinch-prefs-screenshot-both = Save to Downloads and copy
sunfinch-prefs-screenshot-file = Save to Downloads
sunfinch-prefs-screenshot-clipboard = Copy to clipboard
sunfinch-prefs-claude-path = Path to Claude Code:
sunfinch-prefs-claude-path-input =
    .placeholder = Found automatically
sunfinch-prefs-claude-model = Claude model:
sunfinch-prefs-claude-model-input =
    .placeholder = Claude Code default

## Bookmarks of a new profile

sunfinch-bookmarks-title = Bookmarks
sunfinch-bookmarks-heading = Bookmarks
sunfinch-bookmarks-folder = { -brand-short-name }
sunfinch-bookmarks-project = { -brand-short-name } on GitHub
sunfinch-bookmarks-releases = Releases and changes
sunfinch-bookmarks-issues = Report a problem

## Spaces: section headers of the tab list (shown in capitals), color and icon of a space

sunfinch-section-main = Main
sunfinch-section-additional = Additional
sunfinch-space-color-orange =
    .title = Orange
sunfinch-space-color-indigo =
    .title = Indigo
sunfinch-space-color-teal =
    .title = Teal
sunfinch-space-color-amber =
    .title = Amber
sunfinch-space-color-pink =
    .title = Pink
sunfinch-space-color-green =
    .title = Green
sunfinch-space-color-sky =
    .title = Sky blue
sunfinch-space-color-slate =
    .title = Slate
sunfinch-space-icon-space =
    .title = Plain
sunfinch-space-icon-work =
    .title = Work
sunfinch-space-icon-study =
    .title = Study
sunfinch-space-icon-home =
    .title = Home
sunfinch-space-icon-book =
    .title = Book
sunfinch-space-icon-code =
    .title = Code
sunfinch-space-icon-flask =
    .title = Science
sunfinch-space-icon-globe =
    .title = Globe
sunfinch-space-icon-heart =
    .title = Heart
sunfinch-space-icon-music =
    .title = Music
sunfinch-space-icon-plane =
    .title = Travel
sunfinch-space-icon-star =
    .title = Star
sunfinch-space-icon-cart =
    .title = Shopping

## Dialog for a new space and for editing one

sunfinch-space-dialog-new-title = New space
sunfinch-space-dialog-edit-title = Edit space
sunfinch-space-dialog-close =
    .title = Close
    .aria-label = Close
sunfinch-space-dialog-name = Name
# Variables:
#   $name (String) - the name the space gets when the field is left empty
sunfinch-space-dialog-name-hint = If left empty: “{ $name }”
sunfinch-space-dialog-color = Color
sunfinch-space-dialog-icon = Icon
sunfinch-space-dialog-preview = How it looks in the toolbar
sunfinch-space-dialog-keys-new = Enter to create · Esc to cancel
sunfinch-space-dialog-keys-edit = Enter to save · Esc to cancel
sunfinch-space-dialog-cancel = Cancel
sunfinch-space-dialog-create = Create
sunfinch-space-dialog-save = Save
