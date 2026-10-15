/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Quick notes: a toolbar button on the top right toggles a notes panel. The
// panel stays open while you work with the page and closes only with the
// button. One note shared by all spaces and windows.

{
  const { NotesStore } = ChromeUtils.importESModule(
    "chrome://browser/content/sunfinch/modules/SunfinchNotesStore.sys.mjs"
  );

  const WIDGET_ID = "sunfinch-notes-button";
  const PANEL_ID = "sunfinch-notes-panel";
  const TEXT_ID = "sunfinch-notes-text";
  const HTML_NS = "http://www.w3.org/1999/xhtml";

  window.SunfinchNotes = {
    // Set only by the button and on window teardown: the panel ignores every
    // other attempt to hide it, Escape included.
    allowHide: false,
    ready: false,

    get panel() {
      return document.getElementById(PANEL_ID);
    },

    get textarea() {
      return document.getElementById(TEXT_ID);
    },

    get button() {
      return document.getElementById(WIDGET_ID);
    },

    get isOpen() {
      return this.panel?.state == "open" || this.panel?.state == "showing";
    },

    createPanel() {
      if (this.panel) {
        return this.panel;
      }
      const panel = document.createXULElement("panel");
      panel.id = PANEL_ID;
      panel.setAttribute("type", "arrow");
      panel.setAttribute("noautohide", "true");
      // Above this window only, not above other apps.
      panel.setAttribute("level", "parent");
      panel.setAttribute("orient", "vertical");
      panel.setAttribute("aria-labelledby", "sunfinch-notes-title");

      const header = document.createXULElement("hbox");
      header.className = "sunfinch-notes-header";
      header.setAttribute("align", "center");
      const title = document.createXULElement("label");
      title.id = "sunfinch-notes-title";
      title.className = "sunfinch-notes-title";
      document.l10n.setAttributes(title, "sunfinch-notes-title");
      const saved = document.createElementNS(HTML_NS, "span");
      saved.id = "sunfinch-notes-saved";
      saved.setAttribute("role", "status");
      saved.hidden = true;
      document.l10n.setAttributes(saved, "sunfinch-notes-saved");
      header.append(title, saved);

      const text = document.createElementNS(HTML_NS, "textarea");
      text.id = TEXT_ID;
      text.setAttribute("spellcheck", "true");
      document.l10n.setAttributes(text, "sunfinch-notes-text");
      text.addEventListener("input", () => {
        saved.hidden = true;
        NotesStore.text = text.value;
      });

      const footer = document.createXULElement("label");
      footer.className = "sunfinch-notes-footer";
      document.l10n.setAttributes(footer, "sunfinch-notes-hint");

      panel.append(header, text, footer);
      panel.addEventListener("popuphiding", event => {
        if (event.target == panel && !this.allowHide) {
          event.preventDefault();
        }
      });
      panel.addEventListener("popuphidden", event => {
        if (event.target == panel) {
          this.allowHide = false;
          this.button?.removeAttribute("checked");
        }
      });
      document.getElementById("mainPopupSet").append(panel);
      return panel;
    },

    open() {
      const anchor = this.button;
      if (!anchor || this.isOpen) {
        return;
      }
      const panel = this.createPanel();
      this.textarea.value = NotesStore.text;
      anchor.setAttribute("checked", "true");
      panel.addEventListener("popupshown", () => this.textarea.focus(), {
        once: true,
      });
      panel.openPopup(anchor.icon ?? anchor, {
        position: "bottomright topright",
      });
    },

    close() {
      if (!this.isOpen) {
        return;
      }
      this.allowHide = true;
      this.panel.hidePopup();
    },

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    async init() {
      await NotesStore.init();
      // Edited in another window.
      const observer = () => {
        const text = this.textarea;
        if (text && document.activeElement != text) {
          text.value = NotesStore.text;
        }
      };
      const savedObserver = () => {
        const mark = document.getElementById("sunfinch-notes-saved");
        if (mark) {
          mark.hidden = false;
        }
      };
      Services.obs.addObserver(observer, "sunfinch-notes-changed");
      Services.obs.addObserver(savedObserver, "sunfinch-notes-saved");
      window.addEventListener(
        "unload",
        () => {
          this.allowHide = true;
          Services.obs.removeObserver(observer, "sunfinch-notes-changed");
          Services.obs.removeObserver(savedObserver, "sunfinch-notes-saved");
        },
        { once: true }
      );
      this.ready = true;
    },
  };

  if (
    CustomizableUI.getWidget(WIDGET_ID)?.provider !==
    CustomizableUI.PROVIDER_API
  ) {
    CustomizableUI.createWidget({
      id: WIDGET_ID,
      type: "button",
      // End of the toolbar: top right.
      defaultArea: CustomizableUI.AREA_NAVBAR,
      l10nId: "sunfinch-notes-button",
      onCommand(event) {
        const win = event.view ?? event.target.ownerDocument.defaultView;
        win.SunfinchNotes.toggle();
      },
    });
  }

  window.SunfinchNotes.init().catch(e =>
    console.error("[SunFinch] notes init", e)
  );
}
