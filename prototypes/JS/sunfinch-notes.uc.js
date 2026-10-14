// ==UserScript==
// @name           SunFinch quick notes
// @description    Toolbar button on the top right with a drop-down panel of
//                 notes for the current space.
// ==/UserScript==

(function () {
  const { NotesStore } = ChromeUtils.importESModule(
    "chrome://userscripts/content/SunfinchNotes/NotesStore.sys.mjs"
  );
  const { SpacesStore } = ChromeUtils.importESModule(
    "chrome://userscripts/content/SunfinchSpaces/SpacesStore.sys.mjs"
  );

  const WIDGET_ID = "sunfinch-notes-button";
  const VIEW_ID = "PanelUI-sunfinch-notes";
  const TEXT_ID = "sunfinch-notes-text";
  const HTML_NS = "http://www.w3.org/1999/xhtml";
  // Without spaces all notes go to one bucket.
  const NO_SPACE = "default";

  const Notes = {
    get spaceId() {
      return window.SunfinchSpaces?.activeId ?? NO_SPACE;
    },

    get textarea() {
      return document.getElementById(TEXT_ID);
    },

    get isOpen() {
      return !!this.textarea?.closest("panel[panelopen]");
    },

    createView(doc) {
      if (doc.getElementById(VIEW_ID) || doc.getElementById("appMenu-viewCache")?.content.getElementById?.(VIEW_ID)) {
        return;
      }
      const view = doc.createXULElement("panelview");
      view.id = VIEW_ID;
      view.className = "PanelUI-subView";
      const body = doc.createXULElement("vbox");
      body.className = "panel-subview-body";
      const text = doc.createElementNS(HTML_NS, "textarea");
      text.id = TEXT_ID;
      text.setAttribute("placeholder", "Notes for this space…");
      text.setAttribute("spellcheck", "true");
      body.append(text);
      view.append(body);
      doc.getElementById("appMenu-viewCache").content.append(view);
    },

    /** Shows the current space's note. */
    fill(view) {
      const space = SpacesStore.get(this.spaceId);
      view.setAttribute("title", space ? `Notes — ${space.name}` : "Notes");
      const text = view.querySelector(`#${TEXT_ID}`);
      text.value = NotesStore.get(this.spaceId);
      text.dataset.spaceId = this.spaceId;
    },

    onInput(event) {
      const text = event.target;
      NotesStore.set(text.dataset.spaceId, text.value);
    },

    async init() {
      await NotesStore.init();
      await SpacesStore.init();
      // Another space became active in this window: show its note.
      window.addEventListener("SunfinchSpaceChanged", () => {
        const view = document.getElementById(VIEW_ID);
        if (view && this.isOpen) {
          this.fill(view);
        }
      });
      // Same note edited in another window.
      const observer = (subject, topic, spaceId) => {
        const text = this.textarea;
        if (text && text.dataset.spaceId == spaceId && document.activeElement != text) {
          text.value = NotesStore.get(spaceId);
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
        tooltiptext: "Quick notes for this space",
        onBeforeCreated(doc) {
          doc.defaultView.SunfinchNotes?.createView(doc);
          return true;
        },
        onViewShowing(event) {
          const view = event.target;
          const notes = view.ownerDocument.defaultView.SunfinchNotes;
          notes.fill(view);
          const text = view.querySelector(`#${TEXT_ID}`);
          if (!text.sunfinchBound) {
            text.addEventListener("input", e => notes.onInput(e));
            text.sunfinchBound = true;
          }
          view.addEventListener("ViewShown", () => text.focus(), { once: true });
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
