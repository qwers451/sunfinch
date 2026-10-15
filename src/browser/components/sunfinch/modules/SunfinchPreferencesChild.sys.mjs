/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Adds a "SunFinch" group to the General pane of about:preferences.
// The settings page lives in the parent process, so this actor reads and
// writes prefs directly. The page's own pane switching shows and hides the
// group by its data-category, like the page's own groups.

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const HTML_NS = "http://www.w3.org/1999/xhtml";

const GLANCE_MODIFIERS = ["alt", "shift", "ctrl", "meta"];
const UNLOAD_MINUTES = [0, 5, 15, 30, 60, 120];
const SCREENSHOT_TARGETS = ["both", "file", "clipboard"];

export class SunfinchPreferencesChild extends JSWindowActorChild {
  handleEvent(event) {
    if (event.type == "DOMContentLoaded" && event.target == this.document) {
      this.#build();
    }
  }

  #build() {
    const doc = this.document;
    const pane = doc.getElementById("mainPrefPane");
    if (!pane || doc.getElementById("sunfinchGroup")) {
      return;
    }
    doc.l10n.addResourceIds(["browser/sunfinch.ftl"]);

    const el = (ns, name, attrs = {}) => {
      const node = doc.createElementNS(ns, name);
      for (const [key, value] of Object.entries(attrs)) {
        if (key == "l10n") {
          doc.l10n.setAttributes(node, value);
        } else {
          node.setAttribute(key, value);
        }
      }
      return node;
    };

    const group = el(XUL_NS, "groupbox", {
      id: "sunfinchGroup",
      "data-category": "paneGeneral",
      hidden: "true",
    });
    const caption = el(XUL_NS, "label");
    caption.append(el(HTML_NS, "h2", { l10n: "sunfinch-prefs-title" }));
    group.append(caption);

    const row = (labelId, control) => {
      const box = el(XUL_NS, "hbox", { align: "center", class: "sunfinch-pref-row" });
      const label = el(XUL_NS, "label", { l10n: labelId, control: control.id });
      box.append(label, control);
      group.append(box);
    };

    const select = (id, pref, values, getter, setter, l10nPrefix) => {
      const node = el(HTML_NS, "select", { id });
      for (const value of values) {
        node.append(el(HTML_NS, "option", { value, l10n: `${l10nPrefix}-${value}` }));
      }
      node.value = String(getter(pref));
      node.addEventListener("change", () => setter(pref, node.value));
      return node;
    };

    const prefs = Services.prefs;
    const getString = (pref, fallback) => prefs.getStringPref(pref, fallback);

    // Glance
    const glanceOn = el(HTML_NS, "input", { type: "checkbox", id: "sunfinchGlanceEnabled" });
    glanceOn.checked = prefs.getBoolPref("sunfinch.glance.enabled", true);
    glanceOn.addEventListener("change", () =>
      prefs.setBoolPref("sunfinch.glance.enabled", glanceOn.checked)
    );
    const glanceLabel = el(HTML_NS, "label", { for: "sunfinchGlanceEnabled", l10n: "sunfinch-prefs-glance-enabled" });
    const glanceBox = el(XUL_NS, "hbox", { align: "center", class: "sunfinch-pref-row" });
    glanceBox.append(glanceOn, glanceLabel);
    group.append(glanceBox);
    row(
      "sunfinch-prefs-glance-modifier",
      select(
        "sunfinchGlanceModifier",
        "sunfinch.glance.modifier",
        GLANCE_MODIFIERS,
        pref => getString(pref, "alt"),
        (pref, value) => prefs.setStringPref(pref, value),
        "sunfinch-prefs-modifier"
      )
    );

    // Spaces
    row(
      "sunfinch-prefs-unload",
      select(
        "sunfinchUnloadMinutes",
        "sunfinch.spaces.unloadAfterMinutes",
        UNLOAD_MINUTES,
        pref => prefs.getIntPref(pref, 30),
        (pref, value) => prefs.setIntPref(pref, Number(value)),
        "sunfinch-prefs-unload"
      )
    );

    // Screenshot
    row(
      "sunfinch-prefs-screenshot",
      select(
        "sunfinchScreenshotTarget",
        "sunfinch.screenshot.target",
        SCREENSHOT_TARGETS,
        pref => getString(pref, "both"),
        (pref, value) => prefs.setStringPref(pref, value),
        "sunfinch-prefs-screenshot"
      )
    );

    // Claude
    const text = (id, pref, l10n) => {
      const node = el(HTML_NS, "input", { type: "text", id, l10n, class: "sunfinch-pref-text" });
      node.value = getString(pref, "");
      node.addEventListener("change", () => prefs.setStringPref(pref, node.value.trim()));
      return node;
    };
    row("sunfinch-prefs-claude-path", text("sunfinchClaudePath", "sunfinch.claude.path", "sunfinch-prefs-claude-path-input"));
    row("sunfinch-prefs-claude-model", text("sunfinchClaudeModel", "sunfinch.claude.model", "sunfinch-prefs-claude-model-input"));

    // After the last group of the General pane.
    const general = [...pane.children].filter(
      node => node.getAttribute("data-category") == "paneGeneral"
    );
    if (general.length) {
      general.at(-1).after(group);
    } else {
      pane.append(group);
    }
    // If the page already showed its first pane, match it; later pane
    // switches show and hide the group by its data-category.
    const shown = this.contentWindow.gLastCategory?.category;
    group.hidden = !!shown && shown != "paneGeneral";
  }
}
