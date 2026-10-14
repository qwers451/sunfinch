/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Spaces: switcher on top, the space's tabs in the vertical tab list. Each
// space has main tabs (kept) and additional tabs (closed when the browser
// quits).

{
  const { SpacesStore, SpacesSession, defaultName } = ChromeUtils.importESModule(
    "chrome://browser/content/sunfinch/modules/SunfinchSpacesStore.sys.mjs"
  );
  const lazy = {};
  ChromeUtils.defineESModuleGetters(lazy, {
    SessionStartup: "resource:///modules/sessionstore/SessionStartup.sys.mjs",
    SessionStore: "resource:///modules/sessionstore/SessionStore.sys.mjs",
  });

  const SPACE_ATTR = "sunfinch-space";
  const KIND_ATTR = "sunfinch-kind";
  const FIRST_TEMP_ATTR = "sunfinch-first-temp";
  const ACTIVE_SPACE_KEY = "sunfinch-active-space";
  const MAIN = "main";
  const TEMP = "temp";
  const WIDGET_ID = "sunfinch-spaces-switcher";
  const HTML_NS = "http://www.w3.org/1999/xhtml";

  // Temporary tabs of the previous run are closed once per app run, in all
  // restored windows, before any window applies its spaces.
  function closeTempTabsFromLastRun() {
    SpacesSession.cleanup ??= (async () => {
      await lazy.SessionStartup.onceInitialized;
      await lazy.SessionStore.promiseAllWindowsRestored;
      // After a crash the user gets everything back.
      if (lazy.SessionStartup.sessionType != lazy.SessionStartup.RESUME_SESSION) {
        return;
      }
      for (const win of Services.wm.getEnumerator("navigator:browser")) {
        const browser = win.gBrowser;
        const doomed = browser.tabs.filter(
          tab =>
            !tab.pinned &&
            lazy.SessionStore.getCustomTabValue(tab, KIND_ATTR) != MAIN
        );
        if (!doomed.length) {
          continue;
        }
        if (doomed.length == browser.tabs.length) {
          // Keep the window: give it a fresh tab first.
          browser.addTrustedTab(win.BROWSER_NEW_TAB_URL);
        }
        browser.removeTabs(doomed, { animate: false, skipPermitUnload: true });
      }
    })();
    return SpacesSession.cleanup;
  }

  const Spaces = {
    activeId: null,
    ready: false,
    lastTabBySpace: new Map(),

    async init() {
      await SpacesStore.init();
      await delayedStartupPromise;
      await lazy.SessionStore.promiseInitialized;
      await closeTempTabsFromLastRun();

      const saved = lazy.SessionStore.getCustomWindowValue(window, ACTIVE_SPACE_KEY);
      this.activeId = SpacesStore.get(saved)?.id ?? SpacesStore.first.id;
      for (const tab of gBrowser.tabs) {
        this.readTab(tab);
      }

      gBrowser.tabContainer.addEventListener("TabOpen", this);
      gBrowser.tabContainer.addEventListener("TabSelect", this);
      gBrowser.tabContainer.addEventListener("TabClose", this);
      gBrowser.tabContainer.addEventListener("SSTabRestoring", this);
      document.getElementById("tabContextMenu").addEventListener("popupshowing", this);
      Services.obs.addObserver(this, "sunfinch-spaces-changed");
      window.addEventListener("unload", () => {
        Services.obs.removeObserver(this, "sunfinch-spaces-changed");
      }, { once: true });

      this.buildContextMenu();
      this.ready = true;
      this.apply();
    },

    // --- Tab state --------------------------------------------------------

    spaceOf: tab => tab.getAttribute(SPACE_ATTR),
    kindOf: tab => tab.getAttribute(KIND_ATTR) || TEMP,

    isManaged(tab) {
      return !tab.pinned && tab != FirefoxViewHandler.tab && !tab.closing;
    },

    setTabState(tab, spaceId, kind) {
      tab.setAttribute(SPACE_ATTR, spaceId);
      tab.setAttribute(KIND_ATTR, kind);
      lazy.SessionStore.setCustomTabValue(tab, SPACE_ATTR, spaceId);
      lazy.SessionStore.setCustomTabValue(tab, KIND_ATTR, kind);
    },

    /** Takes the tab's space and kind from the session, or assigns defaults. */
    readTab(tab) {
      if (!this.isManaged(tab)) {
        return;
      }
      const spaceId = lazy.SessionStore.getCustomTabValue(tab, SPACE_ATTR);
      const kind = lazy.SessionStore.getCustomTabValue(tab, KIND_ATTR) == MAIN ? MAIN : TEMP;
      this.setTabState(tab, SpacesStore.get(spaceId)?.id ?? this.activeId, kind);
    },

    tabsOf(spaceId) {
      return gBrowser.tabs.filter(t => this.isManaged(t) && this.spaceOf(t) == spaceId);
    },

    // --- Applying the active space ---------------------------------------

    apply() {
      let inSpace = this.tabsOf(this.activeId);
      if (!inSpace.length) {
        const tab = gBrowser.addTrustedTab(BROWSER_NEW_TAB_URL);
        this.setTabState(tab, this.activeId, TEMP);
        inSpace = [tab];
      }
      const selected = gBrowser.selectedTab;
      if (!selected.pinned && !inSpace.includes(selected)) {
        const remembered = this.lastTabBySpace.get(this.activeId);
        gBrowser.selectedTab = inSpace.includes(remembered)
          ? remembered
          : inSpace.reduce((a, b) => (b.lastAccessed > a.lastAccessed ? b : a));
      }
      for (const tab of gBrowser.tabs) {
        if (!this.isManaged(tab)) {
          continue;
        }
        if (this.spaceOf(tab) == this.activeId) {
          gBrowser.showTab(tab);
        } else {
          gBrowser.hideTab(tab);
        }
      }
      lazy.SessionStore.setCustomWindowValue(window, ACTIVE_SPACE_KEY, this.activeId);
      this.updateDivider();
      this.renderSwitcher();
      window.dispatchEvent(
        new CustomEvent("SunfinchSpaceChanged", { detail: { spaceId: this.activeId } })
      );
    },

    switchTo(spaceId) {
      if (!SpacesStore.get(spaceId) || spaceId == this.activeId) {
        return;
      }
      this.activeId = spaceId;
      this.apply();
    },

    /** Marks the first additional tab after the main ones (divider in CSS). */
    updateDivider() {
      let seenMain = false;
      let marked = false;
      for (const tab of gBrowser.tabs) {
        tab.removeAttribute(FIRST_TEMP_ATTR);
        if (!this.isManaged(tab) || tab.hidden) {
          continue;
        }
        if (this.kindOf(tab) == MAIN) {
          seenMain = true;
        } else if (seenMain && !marked) {
          tab.setAttribute(FIRST_TEMP_ATTR, "true");
          marked = true;
        }
      }
    },

    // --- Main and additional tabs ----------------------------------------

    /** Keeps the space's main tabs above its additional tabs. */
    placeTab(tab) {
      const spaceTabs = this.tabsOf(this.spaceOf(tab)).filter(t => t != tab);
      const mains = spaceTabs.filter(t => this.kindOf(t) == MAIN);
      const lastMain = mains.at(-1);
      if (this.kindOf(tab) == MAIN) {
        const firstTemp = spaceTabs.find(t => this.kindOf(t) == TEMP);
        if (firstTemp && tab._tPos > firstTemp._tPos) {
          gBrowser.moveTabBefore(tab, firstTemp);
        }
      } else if (lastMain && tab._tPos < lastMain._tPos) {
        gBrowser.moveTabAfter(tab, lastMain);
      }
      this.updateDivider();
    },

    setKind(tab, kind) {
      this.setTabState(tab, this.spaceOf(tab), kind);
      this.placeTab(tab);
    },

    moveToSpace(tab, spaceId) {
      this.setTabState(tab, spaceId, this.kindOf(tab));
      this.placeTab(tab);
      this.apply();
    },

    // --- Events -----------------------------------------------------------

    handleEvent(event) {
      const tab = event.target;
      switch (event.type) {
        case "TabOpen": {
          if (!this.isManaged(tab)) {
            return;
          }
          // openerTab is the tab a link was opened from; tab.owner is just
          // the previously selected tab and says nothing about the space.
          const spaceId = (tab.openerTab && this.spaceOf(tab.openerTab)) || this.activeId;
          this.setTabState(tab, spaceId, TEMP);
          this.placeTab(tab);
          if (spaceId != this.activeId) {
            gBrowser.hideTab(tab);
          }
          break;
        }
        case "SSTabRestoring":
          // Restored tabs (undo close, session restore) bring their values.
          this.readTab(tab);
          this.placeTab(tab);
          if (this.spaceOf(tab) == this.activeId || tab.selected) {
            gBrowser.showTab(tab);
          } else {
            gBrowser.hideTab(tab);
          }
          break;
        case "TabSelect":
          if (!this.isManaged(tab)) {
            return;
          }
          // Picking a tab of another space (all-tabs menu, search) opens it.
          if (this.spaceOf(tab) != this.activeId) {
            this.switchTo(this.spaceOf(tab));
          }
          this.lastTabBySpace.set(this.spaceOf(tab), tab);
          break;
        case "TabClose": {
          if (!this.isManaged(tab) || this.spaceOf(tab) != this.activeId) {
            return;
          }
          const others = this.tabsOf(this.activeId).filter(t => t != tab);
          if (!others.length) {
            // Stay in the space instead of jumping to a hidden tab.
            const newTab = gBrowser.addTrustedTab(BROWSER_NEW_TAB_URL, { skipAnimation: true });
            this.setTabState(newTab, this.activeId, TEMP);
          }
          Promise.resolve().then(() => this.updateDivider());
          break;
        }
        case "popupshowing":
          if (event.target.id == "tabContextMenu") {
            this.updateContextMenu();
          }
          break;
      }
    },

    observe(subject, topic) {
      if (topic != "sunfinch-spaces-changed" || !this.ready) {
        return;
      }
      // Tabs of a removed space go to the first space.
      const first = SpacesStore.first.id;
      for (const tab of gBrowser.tabs) {
        if (this.isManaged(tab) && !SpacesStore.get(this.spaceOf(tab))) {
          this.setTabState(tab, first, this.kindOf(tab));
        }
      }
      if (!SpacesStore.get(this.activeId)) {
        this.activeId = first;
      }
      this.apply();
    },

    // --- Switcher -----------------------------------------------------------

    renderSwitcher() {
      const item = document.getElementById(WIDGET_ID);
      if (!item) {
        return;
      }
      item.replaceChildren();
      for (const space of SpacesStore.spaces) {
        const button = document.createElementNS(HTML_NS, "button");
        button.className = "sunfinch-space-button";
        button.textContent = space.name;
        button.dataset.spaceId = space.id;
        button.style.setProperty("--sunfinch-space-color", space.color);
        button.toggleAttribute("selected", space.id == this.activeId);
        button.addEventListener("click", () => this.switchTo(space.id));
        button.addEventListener("contextmenu", event => {
          event.preventDefault();
          this.spaceMenu(space, event);
        });
        item.append(button);
      }
      const add = document.createElementNS(HTML_NS, "button");
      add.className = "sunfinch-space-add";
      add.textContent = "+";
      document.l10n.setAttributes(add, "sunfinch-space-add");
      add.addEventListener("click", () => this.promptNewSpace());
      item.append(add);
    },

    async promptNewSpace() {
      const [title, label] = await document.l10n.formatValues([
        "sunfinch-space-new-title",
        "sunfinch-space-name-label",
      ]);
      const name = { value: await defaultName(SpacesStore.spaces.length + 1) };
      if (Services.prompt.prompt(window, title, label, name, null, {}) && name.value.trim()) {
        const space = SpacesStore.add(name.value.trim());
        this.switchTo(space.id);
      }
    },

    spaceMenu(space, event) {
      let popup = document.getElementById("sunfinch-space-menu");
      if (!popup) {
        popup = document.createXULElement("menupopup");
        popup.id = "sunfinch-space-menu";
        document.getElementById("mainPopupSet").append(popup);
      }
      popup.replaceChildren();
      const add = (l10nId, handler, disabled = false) => {
        const item = document.createXULElement("menuitem");
        document.l10n.setAttributes(item, l10nId);
        item.disabled = disabled;
        item.addEventListener("command", handler);
        popup.append(item);
      };
      add("sunfinch-space-rename", async () => {
        const [title, label] = await document.l10n.formatValues([
          "sunfinch-space-rename-title",
          "sunfinch-space-name-label",
        ]);
        const name = { value: space.name };
        if (Services.prompt.prompt(window, title, label, name, null, {})) {
          SpacesStore.rename(space.id, name.value.trim());
        }
      });
      add("sunfinch-space-delete", () => {
        SpacesStore.remove(space.id);
      }, SpacesStore.spaces.length < 2);
      popup.openPopupAtScreen(event.screenX, event.screenY, true);
    },

    // --- Tab context menu -------------------------------------------------

    buildContextMenu() {
      const menu = document.getElementById("tabContextMenu");
      const separator = document.createXULElement("menuseparator");
      separator.id = "sunfinch-context-separator";

      const kind = document.createXULElement("menuitem");
      kind.id = "sunfinch-context-kind";
      kind.addEventListener("command", () => {
        const tab = TabContextMenu.contextTab;
        this.setKind(tab, this.kindOf(tab) == MAIN ? TEMP : MAIN);
      });

      const move = document.createXULElement("menu");
      move.id = "sunfinch-context-move";
      document.l10n.setAttributes(move, "sunfinch-tab-move-to-space");
      move.append(document.createXULElement("menupopup"));

      menu.append(separator, kind, move);
    },

    updateContextMenu() {
      const tab = TabContextMenu.contextTab;
      const managed = tab && this.isManaged(tab);
      for (const id of ["sunfinch-context-separator", "sunfinch-context-kind", "sunfinch-context-move"]) {
        document.getElementById(id).hidden = !managed;
      }
      if (!managed) {
        return;
      }
      document.l10n.setAttributes(
        document.getElementById("sunfinch-context-kind"),
        this.kindOf(tab) == MAIN ? "sunfinch-tab-make-additional" : "sunfinch-tab-make-main"
      );
      const move = document.getElementById("sunfinch-context-move");
      const popup = move.menupopup;
      popup.replaceChildren();
      const others = SpacesStore.spaces.filter(s => s.id != this.spaceOf(tab));
      move.disabled = !others.length;
      for (const space of others) {
        const item = document.createXULElement("menuitem");
        item.setAttribute("label", space.name);
        item.addEventListener("command", () => this.moveToSpace(tab, space.id));
        popup.append(item);
      }
    },
  };

  // The switcher widget is global; its contents are rendered per window.
  if (CustomizableUI.getWidget(WIDGET_ID)?.provider !== CustomizableUI.PROVIDER_API) {
    {
      CustomizableUI.createWidget({
        id: WIDGET_ID,
        type: "custom",
        defaultArea: CustomizableUI.AREA_NAVBAR,
        onBuild(doc) {
          const item = doc.createXULElement("toolbaritem");
          item.id = WIDGET_ID;
          item.className = "sunfinch-spaces";
          doc.l10n.setAttributes(item, "sunfinch-spaces-switcher");
          return item;
        },
      });
      // First run: put the switcher at the start of the toolbar.
      if (!Services.prefs.getBoolPref("sunfinch.spaces.placed", false)) {
        CustomizableUI.addWidgetToArea(WIDGET_ID, CustomizableUI.AREA_NAVBAR, 0);
        Services.prefs.setBoolPref("sunfinch.spaces.placed", true);
      }
    }
  }

  window.SunfinchSpaces = Spaces;
  Spaces.init().catch(e => console.error("[SunFinch] spaces init", e));
}
