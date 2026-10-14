/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Glance: a link opened with the Glance modifier (Alt+click by default)
// shows in a window over the current page. Escape or a click outside closes
// it, "Open as tab" keeps it as a normal tab.
//
// The page lives in a real background tab, so everything a tab has (loading,
// permissions, downloads, security UI) works; we only show its panel on top.

{
  const MODULES = "chrome://browser/content/sunfinch/modules";
  const GLANCE_ATTR = "sunfinch-glance";
  const PANEL_CLASS = "sunfinch-glance-panel";
  const HTML_NS = "http://www.w3.org/1999/xhtml";

  try {
    ChromeUtils.registerWindowActor("SunfinchGlance", {
      parent: { esModuleURI: `${MODULES}/SunfinchGlanceParent.sys.mjs` },
      child: {
        esModuleURI: `${MODULES}/SunfinchGlanceChild.sys.mjs`,
        events: { click: { capture: true, mozSystemGroup: true } },
      },
      allFrames: true,
    });
  } catch (e) {
    // Registered by an earlier window.
  }

  window.SunfinchGlance = {
    tab: null,
    // True while addTab() runs, so spaces leaves the new tab alone.
    opening: false,

    get isOpen() {
      return !!this.tab;
    },

    isGlanceTab(tab) {
      return this.opening || tab.hasAttribute(GLANCE_ATTR);
    },

    open(url, { triggeringPrincipal, sourceBrowser }) {
      this.close();
      const sourceTab = gBrowser.getTabForBrowser(sourceBrowser);
      if (!sourceTab?.selected) {
        return;
      }
      let tab;
      this.opening = true;
      try {
        tab = gBrowser.addTab(url, {
          triggeringPrincipal,
          inBackground: true,
          skipAnimation: true,
          userContextId: sourceTab.userContextId,
          relatedToCurrent: false,
        });
      } finally {
        this.opening = false;
      }
      tab.setAttribute(GLANCE_ATTR, "true");
      gBrowser.hideTab(tab);
      this.tab = tab;

      const panel = document.getElementById(tab.linkedPanel);
      panel.classList.add(PANEL_CLASS);
      // Background tabs don't render; this one is on screen.
      tab.linkedBrowser.docShellIsActive = true;
      tab.linkedBrowser.renderLayers = true;

      this.buildChrome(panel);
      gBrowser.tabpanels.setAttribute("sunfinch-glance-open", "true");
      tab.linkedBrowser.focus();

      gBrowser.tabContainer.addEventListener("TabSelect", this);
      gBrowser.tabContainer.addEventListener("TabClose", this);
      window.addEventListener("keydown", this, true);
    },

    /** Backdrop over the current page and the buttons of the Glance window. */
    buildChrome(panel) {
      const backdrop = document.createElementNS(HTML_NS, "div");
      backdrop.id = "sunfinch-glance-backdrop";
      backdrop.addEventListener("click", () => this.close());
      gBrowser.selectedBrowser.closest(".browserStack").append(backdrop);

      const bar = document.createElementNS(HTML_NS, "div");
      bar.id = "sunfinch-glance-bar";
      const expand = document.createElementNS(HTML_NS, "button");
      expand.id = "sunfinch-glance-expand";
      document.l10n.setAttributes(expand, "sunfinch-glance-expand");
      expand.addEventListener("click", () => this.expand());
      const close = document.createElementNS(HTML_NS, "button");
      close.id = "sunfinch-glance-close";
      document.l10n.setAttributes(close, "sunfinch-glance-close");
      close.addEventListener("click", () => this.close());
      bar.append(expand, close);
      panel.querySelector(".browserStack").append(bar);
    },

    teardown() {
      gBrowser.tabContainer.removeEventListener("TabSelect", this);
      gBrowser.tabContainer.removeEventListener("TabClose", this);
      window.removeEventListener("keydown", this, true);
      document.getElementById("sunfinch-glance-backdrop")?.remove();
      document.getElementById("sunfinch-glance-bar")?.remove();
      gBrowser.tabpanels.removeAttribute("sunfinch-glance-open");
      const tab = this.tab;
      this.tab = null;
      if (tab?.linkedPanel) {
        document.getElementById(tab.linkedPanel)?.classList.remove(PANEL_CLASS);
      }
      return tab;
    },

    close() {
      const tab = this.teardown();
      if (tab && !tab.closing) {
        gBrowser.removeTab(tab, { animate: false, skipPermitUnload: true });
        gBrowser.selectedBrowser.focus();
      }
    },

    /** Keeps the page as a normal tab next to the current one. */
    expand() {
      const tab = this.teardown();
      if (!tab) {
        return;
      }
      tab.removeAttribute(GLANCE_ATTR);
      gBrowser.moveTabAfter(tab, gBrowser.selectedTab);
      // A new tab of the current space (spaces skipped it while it was a
      // Glance).
      window.SunfinchSpaces?.adoptTab?.(tab);
      gBrowser.showTab(tab);
      gBrowser.selectedTab = tab;
    },

    handleEvent(event) {
      switch (event.type) {
        case "TabSelect":
          this.close();
          break;
        case "TabClose":
          if (event.target == this.tab) {
            this.teardown();
          }
          break;
        case "keydown":
          if (event.key == "Escape" && !event.defaultPrevented) {
            event.preventDefault();
            this.close();
          }
          break;
      }
    },
  };
}
