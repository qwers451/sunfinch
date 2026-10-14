/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Gives the Claude panel the page's title, address, visible text and the
// current selection.

const MAX_CHARS_PREF = "sunfinch.claude.maxPageChars";

export class SunfinchPageTextChild extends JSWindowActorChild {
  receiveMessage(message) {
    if (message.name != "SunfinchPageText:Get") {
      return null;
    }
    const doc = this.document;
    const max = Services.prefs.getIntPref(MAX_CHARS_PREF, 100000);
    const text = doc.body?.innerText ?? doc.documentElement?.textContent ?? "";
    const selection = this.contentWindow.getSelection()?.toString() ?? "";
    return {
      title: doc.title,
      url: doc.URL,
      text: text.slice(0, max),
      truncated: text.length > max,
      selection: selection.slice(0, max),
    };
  }
}
