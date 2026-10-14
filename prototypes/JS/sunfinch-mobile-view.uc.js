// ==UserScript==
// @name           SunFinch mobile view button
// @description    Toolbar button that toggles Responsive Design Mode for the
//                 current tab with a phone-sized viewport.
// ==/UserScript==

(function () {
  const WIDGET_ID = "sunfinch-mobile-view-button";

  // Phone defaults for RDM. In the fork these become default prefs.
  const defaults = Services.prefs.getDefaultBranch("");
  defaults.setIntPref("devtools.responsive.viewport.width", 390);
  defaults.setIntPref("devtools.responsive.viewport.height", 844);
  defaults.setIntPref("devtools.responsive.viewport.pixelRatio", 3);
  defaults.setBoolPref("devtools.responsive.touchSimulation.enabled", true);
  defaults.setStringPref(
    "devtools.responsive.userAgent",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
  );
  // Reload so the page sees the mobile UA and touch events right away.
  defaults.setBoolPref("devtools.responsive.reloadConditions.userAgent", true);
  defaults.setBoolPref("devtools.responsive.reloadConditions.touchSimulation", true);
  defaults.setBoolPref("devtools.responsive.reloadNotification.enabled", false);

  const { DevToolsShim } = ChromeUtils.importESModule(
    "chrome://devtools-startup/content/DevToolsShim.sys.mjs"
  );

  let manager = null;
  function getManager() {
    if (!manager) {
      const { require } = ChromeUtils.importESModule(
        "resource://devtools/shared/loader/Loader.sys.mjs"
      );
      manager = require("resource://devtools/client/responsive/manager.js");
      manager.on("on", ({ tab }) => updateButton(tab.ownerDocument.defaultView));
      manager.on("off", ({ tab }) => updateButton(tab.ownerDocument.defaultView));
    }
    return manager;
  }

  function isMobileView(win) {
    const container = win.gBrowser.selectedBrowser.closest(".browserContainer");
    return !!container?.classList.contains("responsive-mode");
  }

  function updateButton(win) {
    const button = win.document.getElementById(WIDGET_ID);
    button?.toggleAttribute("checked", isMobileView(win));
  }

  // Widgets are global; scripts run per window, so create it only once.
  if (CustomizableUI.getWidget(WIDGET_ID)?.provider !== CustomizableUI.PROVIDER_API) {
    try {
      CustomizableUI.createWidget({
        id: WIDGET_ID,
        type: "button",
        defaultArea: CustomizableUI.AREA_NAVBAR,
        label: "Mobile view",
        tooltiptext: "Show this page as on a phone",
        onCreated(node) {
          node.setAttribute("type", "checkbox");
        },
        onCommand(event) {
          const win = event.view ?? event.target.ownerDocument.defaultView;
          getManager()
            .toggle(win, win.gBrowser.selectedTab, { trigger: "toolbar" })
            .then(() => updateButton(win));
        },
      });
    } catch (e) {
      console.error("[SunFinch] createWidget", e);
    }
  }

  const button = document.getElementById(WIDGET_ID);
  if (button && !DevToolsShim.isEnabled()) {
    button.hidden = true;
  }

  gBrowser.tabContainer.addEventListener("TabSelect", () => updateButton(window));
})();
