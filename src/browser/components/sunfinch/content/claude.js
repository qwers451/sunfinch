/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Claude side panel on the right: a chat about the current page with the
// local Claude Code CLI. The chat itself is claude.html; this script adds the
// panel to the window, the toolbar button and access to the page text.

{
  const WIDGET_ID = "sunfinch-claude-button";
  const BOX_ID = "sunfinch-claude-box";
  const SPLITTER_ID = "sunfinch-claude-splitter";
  const HTML_NS = "http://www.w3.org/1999/xhtml";

  try {
    ChromeUtils.registerWindowActor("SunfinchPageText", {
      parent: { esModuleURI: `${SUNFINCH_ACTOR_MODULES}/SunfinchPageTextParent.sys.mjs` },
      child: { esModuleURI: `${SUNFINCH_ACTOR_MODULES}/SunfinchPageTextChild.sys.mjs` },
    });
  } catch (e) {
    // Registered by an earlier window.
  }

  window.SunfinchClaudePanel = {
    get box() {
      return document.getElementById(BOX_ID);
    },

    get frame() {
      return this.box?.querySelector("iframe");
    },

    get isOpen() {
      return !!this.box && !this.box.hidden;
    },

    /** The chat page's controller (claude.mjs), once it has loaded. */
    get chat() {
      return this.frame?.contentWindow?.SunfinchClaudeChat;
    },

    create() {
      if (this.box) {
        return this.box;
      }
      const splitter = document.createXULElement("splitter");
      splitter.id = SPLITTER_ID;
      splitter.setAttribute("resizebefore", "sibling");
      splitter.setAttribute("resizeafter", "none");
      splitter.hidden = true;

      const box = document.createXULElement("vbox");
      box.id = BOX_ID;
      box.hidden = true;
      const frame = document.createElementNS(HTML_NS, "iframe");
      frame.setAttribute("src", "chrome://browser/content/sunfinch/claude.html");
      box.append(frame);

      // To the right of the page.
      document.getElementById("tabbrowser-tabbox").after(splitter, box);
      return box;
    },

    open() {
      this.create();
      // The sidebar code gives every child of #browser an explicit order;
      // ours take the page's, so they follow it (DOM order breaks the tie).
      const splitter = document.getElementById(SPLITTER_ID);
      const order = getComputedStyle(document.getElementById("tabbrowser-tabbox")).order;
      splitter.style.order = order;
      this.box.style.order = order;
      this.box.hidden = false;
      splitter.hidden = false;
      document.getElementById(WIDGET_ID)?.setAttribute("checked", "true");
      this.chat?.focusInput();
    },

    close() {
      if (!this.box) {
        return;
      }
      this.box.hidden = true;
      document.getElementById(SPLITTER_ID).hidden = true;
      document.getElementById(WIDGET_ID)?.removeAttribute("checked");
      gBrowser.selectedBrowser.focus();
    },

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    /** Title, address, text and selection of the current page, or null. */
    async getPage() {
      const browser = gBrowser.selectedBrowser;
      try {
        return await browser.browsingContext.currentWindowGlobal
          .getActor("SunfinchPageText")
          .getPage();
      } catch (e) {
        // about: pages, PDF viewer and other pages without the actor.
        return { title: browser.contentTitle, url: browser.currentURI.spec, text: "", selection: "" };
      }
    },

    /** Title of the current page for the chat header. */
    get pageTitle() {
      return gBrowser.selectedBrowser.contentTitle || gBrowser.selectedBrowser.currentURI.spec;
    },
  };

  // The chat shows which page it talks about.
  const notifyPage = () => window.SunfinchClaudePanel.chat?.pageChanged();
  gBrowser.tabContainer.addEventListener("TabSelect", notifyPage);
  gBrowser.addTabsProgressListener({
    onLocationChange(browser, webProgress) {
      if (webProgress.isTopLevel && browser == gBrowser.selectedBrowser) {
        notifyPage();
      }
    },
  });

  if (
    CustomizableUI.getWidget(WIDGET_ID)?.provider !==
    CustomizableUI.PROVIDER_API
  ) {
    CustomizableUI.createWidget({
      id: WIDGET_ID,
      type: "button",
      defaultArea: CustomizableUI.AREA_NAVBAR,
      l10nId: "sunfinch-claude-button",
      onCommand(event) {
        const win = event.view ?? event.target.ownerDocument.defaultView;
        win.SunfinchClaudePanel.toggle();
      },
    });
  }
}
