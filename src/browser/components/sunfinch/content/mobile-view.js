/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Mobile view button: toggles Responsive Design Mode for the current tab.
// Phone viewport, touch and user agent come from app-sunfinch-prefs.js.

{
  const WIDGET_ID = "sunfinch-mobile-view-button";

  const { DevToolsShim } = ChromeUtils.importESModule(
    "chrome://devtools-startup/content/DevToolsShim.sys.mjs"
  );

  let manager = null;
  const getManager = () => {
    if (!manager) {
      const { require } = ChromeUtils.importESModule(
        "resource://devtools/shared/loader/Loader.sys.mjs"
      );
      manager = require("resource://devtools/client/responsive/manager.js");
      const update = ({ tab }) =>
        tab.ownerDocument.defaultView.SunfinchMobileView?.updateButton();
      manager.on("on", update);
      manager.on("off", update);
    }
    return manager;
  };

  window.SunfinchMobileView = {
    get isActive() {
      const container = gBrowser.selectedBrowser.closest(".browserContainer");
      return !!container?.classList.contains("responsive-mode");
    },

    updateButton() {
      document
        .getElementById(WIDGET_ID)
        ?.toggleAttribute("checked", this.isActive);
    },

    toggle() {
      getManager()
        .toggle(window, gBrowser.selectedTab, { trigger: "toolbar" })
        .then(() => this.updateButton());
    },
  };

  // Widgets are global; this script runs per window, so create it once.
  if (
    CustomizableUI.getWidget(WIDGET_ID)?.provider !==
    CustomizableUI.PROVIDER_API
  ) {
    CustomizableUI.createWidget({
      id: WIDGET_ID,
      type: "button",
      defaultArea: CustomizableUI.AREA_NAVBAR,
      l10nId: "sunfinch-mobile-view-button",
      onCreated(node) {
        node.setAttribute("type", "checkbox");
      },
      onCommand(event) {
        const win = event.view ?? event.target.ownerDocument.defaultView;
        win.SunfinchMobileView.toggle();
      },
    });
  }

  if (!DevToolsShim.isEnabled()) {
    document.getElementById(WIDGET_ID)?.setAttribute("hidden", "true");
  }

  gBrowser.tabContainer.addEventListener("TabSelect", () =>
    window.SunfinchMobileView.updateButton()
  );
}
