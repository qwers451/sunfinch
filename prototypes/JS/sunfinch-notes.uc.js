// ==UserScript==
// @name           SunFinch quick notes
// @description    Toolbar button on the top right with a pop-up panel of
//                 notes shared by all spaces and windows.
// ==/UserScript==

(function () {
  const { NotesStore } = ChromeUtils.importESModule(
    "chrome://userscripts/content/SunfinchNotes/NotesStore.sys.mjs"
  );

  const WIDGET_ID = "sunfinch-notes-button";
  const VIEW_ID = "PanelUI-sunfinch-notes";
  const TEXT_ID = "sunfinch-notes-text";
  const HTML_NS = "http://www.w3.org/1999/xhtml";

  const Notes = {
    get textarea() {
      return document.getElementById(TEXT_ID);
    },

    get isOpen() {
      return !!this.textarea?.closest("panel[panelopen]");
    },

    createView(doc) {
      if (doc.getElementById(VIEW_ID) || doc.getElementById("appMenu-viewCache")?.content.getElementById(VIEW_ID)) {
        return;
      }
      const view = doc.createXULElement("panelview");
      view.id = VIEW_ID;
      view.className = "PanelUI-subView";
      view.setAttribute("title", "Notes");
      const body = doc.createXULElement("vbox");
      body.className = "panel-subview-body";
      const text = doc.createElementNS(HTML_NS, "textarea");
      text.id = TEXT_ID;
      text.setAttribute("placeholder", "Notes…");
      text.setAttribute("spellcheck", "true");
      text.addEventListener("input", () => {
        NotesStore.text = text.value;
      });
      body.append(text);
      view.append(body);
      doc.getElementById("appMenu-viewCache").content.append(view);
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
        Services.obs.removeObserver(observer, "sunfinch-notes-changed");
      }, { once: true });
      this.ready = true;
    },
  };

  if (CustomizableUI.getWidget(WIDGET_ID)?.provider !== CustomizableUI.PROVIDER_API) {
    try {
      CustomizableUI.createWidget({
        id: WIDGET_ID,
        type: "view",
        viewId: VIEW_ID,
        // End of the toolbar: top right.
        defaultArea: CustomizableUI.AREA_NAVBAR,
        label: "Notes",
        tooltiptext: "Quick notes",
        onBeforeCreated(doc) {
          doc.defaultView.SunfinchNotes?.createView(doc);
          return true;
        },
        onViewShowing(event) {
          const text = event.target.querySelector(`#${TEXT_ID}`);
          text.value = NotesStore.text;
          event.target.addEventListener("ViewShown", () => text.focus(), { once: true });
        },
      });
    } catch (e) {
      console.error("[SunFinch] notes widget", e);
    }
  }

  window.SunfinchNotes = Notes;
  Notes.createView(document);
  Notes.init().catch(e => console.error("[SunFinch] notes init", e));
})();
