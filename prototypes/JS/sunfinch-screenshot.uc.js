// ==UserScript==
// @name           SunFinch one-click screenshot
// @description    Toolbar button: click captures the visible area,
//                 Shift+click the full page. Saves to Downloads and/or copies
//                 to the clipboard, per sunfinch.screenshot.target.
// ==/UserScript==

(function () {
  const WIDGET_ID = "sunfinch-screenshot-button";
  const TARGET_PREF = "sunfinch.screenshot.target"; // "file" | "clipboard" | "both"

  Services.prefs.getDefaultBranch("").setStringPref(TARGET_PREF, "both");

  const lazy = {};
  ChromeUtils.defineESModuleGetters(lazy, {
    BrowserUtils: "resource://gre/modules/BrowserUtils.sys.mjs",
    Downloads: "resource://gre/modules/Downloads.sys.mjs",
    PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
    ScreenshotsUtils:
      "moz-src:///browser/components/screenshots/ScreenshotsUtils.sys.mjs",
    getFilename: "chrome://browser/content/screenshots/fileHelpers.mjs",
  });

  // Page dimensions come from the content process. The Screenshots actor
  // only answers while its overlay is open, so we use our own.
  try {
    ChromeUtils.registerWindowActor("SunfinchScreenshot", {
      parent: {
        esModuleURI:
          "chrome://userscripts/content/SunfinchScreenshot/SunfinchScreenshotParent.sys.mjs",
      },
      child: {
        esModuleURI:
          "chrome://userscripts/content/SunfinchScreenshot/SunfinchScreenshotChild.sys.mjs",
      },
    });
  } catch (e) {
    // Registered by an earlier window.
  }

  async function captureVisible(browser) {
    const win = browser.ownerDocument.defaultView;
    const scale = win.devicePixelRatio * browser.fullZoom;
    // A null rect renders the current viewport.
    const bitmap = await browser.browsingContext.currentWindowGlobal.drawSnapshot(
      null,
      scale,
      "rgb(255,255,255)"
    );
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    bitmap.close();
    return canvas.convertToBlob();
  }

  async function captureFullPage(browser) {
    const bounds = await browser.browsingContext.currentWindowGlobal
      .getActor("SunfinchScreenshot")
      .getFullPageBounds();
    const region = {
      ...bounds,
      right: bounds.left + bounds.width,
      bottom: bounds.top + bounds.height,
    };
    // Tiles drawSnapshot calls and clamps huge pages.
    const canvas = await lazy.ScreenshotsUtils.createCanvas(region, browser);
    return canvas.convertToBlob();
  }

  function capture(browser, fullPage) {
    return fullPage ? captureFullPage(browser) : captureVisible(browser);
  }

  async function saveToFile(blob, browser) {
    const title = browser.contentTitle || browser.currentURI.host || "page";
    const { filename, accepted } = await lazy.getFilename(title, browser);
    if (!accepted) {
      return false;
    }
    const isPrivate = lazy.PrivateBrowsingUtils.isBrowserPrivate(browser);
    const blobURL = URL.createObjectURL(blob);
    try {
      // Goes through the download manager so the file shows up in the
      // Downloads panel.
      const download = await lazy.Downloads.createDownload({
        source: { url: blobURL, isPrivate },
        target: filename,
      });
      const list = await lazy.Downloads.getList(
        isPrivate ? lazy.Downloads.PRIVATE : lazy.Downloads.PUBLIC
      );
      list.add(download);
      await download.start();
      return true;
    } finally {
      URL.revokeObjectURL(blobURL);
    }
  }

  async function copyToClipboard(blob, win) {
    lazy.BrowserUtils.copyImageToClipboard(await blob.arrayBuffer());
    const anchor = win.document.getElementById(WIDGET_ID);
    if (anchor) {
      win.ConfirmationHint.show(anchor, "confirmation-hint-screenshot-copied");
    }
  }

  async function takeScreenshot(win, fullPage) {
    const browser = win.gBrowser.selectedBrowser;
    const target = Services.prefs.getStringPref(TARGET_PREF, "both");
    try {
      const blob = await capture(browser, fullPage);
      if (target === "clipboard" || target === "both") {
        await copyToClipboard(blob, win);
      }
      if (target === "file" || target === "both") {
        await saveToFile(blob, browser);
      }
    } catch (e) {
      // e.g. about: pages and PDFs have no Screenshots actor.
      console.error("[SunFinch] screenshot failed", e);
    }
  }

  if (CustomizableUI.getWidget(WIDGET_ID)?.provider !== CustomizableUI.PROVIDER_API) {
    try {
      CustomizableUI.createWidget({
        id: WIDGET_ID,
        type: "button",
        defaultArea: CustomizableUI.AREA_NAVBAR,
        label: "Screenshot",
        tooltiptext: "Screenshot of the visible area (Shift: full page)",
        onCommand(event) {
          takeScreenshot(event.view ?? event.target.ownerDocument.defaultView, event.shiftKey);
        },
      });
    } catch (e) {
      console.error("[SunFinch] createWidget", e);
    }
  }
})();
