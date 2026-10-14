// ==UserScript==
// @name           SunFinch quick notes
// @description    Toolbar button on the top right that toggles a notes panel.
//                 The panel stays open while you work with the page and closes
//                 only with the button. One note shared by all spaces and
//                 windows.
// ==/UserScript==

(function () {
  const { NotesStore } = ChromeUtils.importESModule(
    "chrome://userscripts/content/SunfinchNotes/NotesStore.sys.mjs"
  );

  const WIDGET_ID = "sunfinch-notes-button";
  const PANEL_ID = "sunfinch-notes-panel";
  const TEXT_ID = "sunfinch-notes-text";
  const HTML_NS = "http://www.w3.org/1999/xhtml";

  const Notes = {
    // Set only by the button (and window teardown): the panel ignores every
    // other attempt to hide it, Escape included.
    allowHide: false,

    get panel() {
      return document.getElementById(PANEL_ID);
    },

    get textarea() {
      return document.getElementById(TEXT_ID);
    },

    get isOpen() {
      return this.panel?.state == "open" || this.panel?.state == "showing";
    },

    get button() {
      return document.getElementById(WIDGET_ID);
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
      panel.setAttribute("aria-label", "Notes");

      const header = document.createXULElement("hbox");
      header.className = "sunfinch-notes-header";
      header.setAttribute("align", "center");
      const title = document.createXULElement("label");
      title.className = "sunfinch-notes-title";
      title.setAttribute("value", "Notes");
      header.append(title);

      const text = document.createElementNS(HTML_NS, "textarea");
      text.id = TEXT_ID;
      text.setAttribute("placeholder", "Notes…");
      text.setAttribute("spellcheck", "true");
      text.addEventListener("input", () => {
        NotesStore.text = text.value;
      });

      panel.append(header, text);
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
      panel.addEventListener("popupshown", () => this.textarea.focus(), { once: true });
      panel.openPopup(anchor.icon ?? anchor, { position: "bottomright topright" });
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
      Services.obs.addObserver(observer, "sunfinch-notes-changed");
      window.addEventListener("unload", () => {
        this.allowHide = true;
        Services.obs.removeObserver(observer, "sunfinch-notes-changed");
      }, { once: true });
      this.ready = true;
    },
  };

  if (CustomizableUI.getWidget(WIDGET_ID)?.provider !== CustomizableUI.PROVIDER_API) {
    try {
      CustomizableUI.createWidget({
        id: WIDGET_ID,
        type: "button",
        // End of the toolbar: top right.
        defaultArea: CustomizableUI.AREA_NAVBAR,
        label: "Notes",
        tooltiptext: "Quick notes",
        onCommand(event) {
          const win = event.view ?? event.target.ownerDocument.defaultView;
          win.SunfinchNotes.toggle();
        },
      });
    } catch (e) {
      console.error("[SunFinch] notes widget", e);
    }
  }

  window.SunfinchNotes = Notes;
  Notes.init().catch(e => console.error("[SunFinch] notes init", e));
})();
