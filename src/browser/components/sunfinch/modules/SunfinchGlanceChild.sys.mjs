/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Content side of Glance: a link click with the Glance modifier opens the
// link in Glance instead of navigating.
//
// Listens to "click" in the capture phase of the system group, before the
// page and before Firefox's own link handling (ClickHandler acts on the
// "chromelinkclick" event that a link dispatches only if the click was not
// prevented).

const MODIFIER_PREF = "sunfinch.glance.modifier"; // "alt" | "shift" | "ctrl" | "meta"
const ENABLED_PREF = "sunfinch.glance.enabled";

function modifierPressed(event) {
  const want = Services.prefs.getStringPref(MODIFIER_PREF, "alt");
  const pressed = {
    alt: event.altKey,
    shift: event.shiftKey,
    ctrl: event.ctrlKey,
    meta: event.metaKey,
  };
  // Exactly the configured modifier, so Ctrl+Shift+click etc. keep working.
  return (
    pressed[want] &&
    Object.entries(pressed).every(([key, down]) => key == want || !down)
  );
}

function findLink(node) {
  for (let el = node; el; el = el.flattenedTreeParentNode) {
    if (
      (el.localName == "a" || el.localName == "area") &&
      el.namespaceURI == "http://www.w3.org/1999/xhtml" &&
      el.hasAttribute("href")
    ) {
      return el;
    }
  }
  return null;
}

export class SunfinchGlanceChild extends JSWindowActorChild {
  handleEvent(event) {
    if (
      event.type != "click" ||
      !event.isTrusted ||
      event.button != 0 ||
      event.defaultPrevented ||
      !Services.prefs.getBoolPref(ENABLED_PREF, true) ||
      !modifierPressed(event)
    ) {
      return;
    }
    const link = findLink(event.composedTarget);
    if (!link) {
      return;
    }
    let url;
    try {
      url = new URL(link.href);
    } catch {
      return;
    }
    if (url.protocol == "javascript:") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.sendAsyncMessage("SunfinchGlance:Open", {
      url: url.href,
      referrerPolicy: link.referrerPolicy,
    });
  }
}
