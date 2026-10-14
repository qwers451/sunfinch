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
sunfinch-space-new-title = New space
sunfinch-space-rename-title = Rename space
sunfinch-space-name-label = Name:
sunfinch-space-rename =
    .label = Rename…
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

## Glance

sunfinch-glance-expand = Open as tab
sunfinch-glance-close = Close
    .title = Close (Esc)

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
