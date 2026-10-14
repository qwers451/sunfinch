/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// One-click screenshot button: click captures the visible area, Shift+click
// the whole page. Saves through the download manager and/or copies to the
// clipboard, per sunfinch.screenshot.target.

{
  const WIDGET_ID = "sunfinch-screenshot-button";
  const TARGET_PREF = "sunfinch.screenshot.target"; // "file" | "clipboard" | "both"
  const MODULES = "chrome://browser/content/sunfinch/modules";

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
      parent: { esModuleURI: `${MODULES}/SunfinchScreenshotParent.sys.mjs` },
      child: { esModuleURI: `${MODULES}/SunfinchScreenshotChild.sys.mjs` },
    });
  } catch (e) {
    // Registered by an earlier window.
  }

  async function captureVisible(browser) {
    const scale = window.devicePixelRatio * browser.fullZoom;
    // A null rect renders the current viewport.
    const bitmap =
      await browser.browsingContext.currentWindowGlobal.drawSnapshot(
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

  async function saveToFile(blob, browser) {
    const title = browser.contentTitle || browser.currentURI.host || "page";
    const { filename: suggested, accepted } = await lazy.getFilename(
      title,
      browser
    );
    if (!accepted) {
      return false;
    }
    // Names carry the time to the second; don't overwrite a shot taken
    // within the same second.
    let filename = suggested;
    for (let i = 2; await IOUtils.exists(filename); i++) {
      filename = suggested.replace(/\.png$/, ` (${i}).png`);
    }
    const isPrivate = lazy.PrivateBrowsingUtils.isBrowserPrivate(browser);
    const blobURL = URL.createObjectURL(blob);
    try {
      // Through the download manager, so the file shows in the Downloads panel.
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

  async function copyToClipboard(blob) {
    lazy.BrowserUtils.copyImageToClipboard(await blob.arrayBuffer());
    const anchor = document.getElementById(WIDGET_ID);
    if (anchor) {
      ConfirmationHint.show(anchor, "confirmation-hint-screenshot-copied");
    }
  }

  window.SunfinchScreenshot = {
    async take(fullPage) {
      const browser = gBrowser.selectedBrowser;
      const target = Services.prefs.getStringPref(TARGET_PREF, "both");
      try {
        const blob = fullPage
          ? await captureFullPage(browser)
          : await captureVisible(browser);
        if (target == "clipboard" || target == "both") {
          await copyToClipboard(blob);
        }
        if (target == "file" || target == "both") {
          await saveToFile(blob, browser);
        }
      } catch (e) {
        // e.g. pages without our actor (some about: pages, PDF viewer).
        console.error("[SunFinch] screenshot failed", e);
      }
    },
  };

  if (
    CustomizableUI.getWidget(WIDGET_ID)?.provider !==
    CustomizableUI.PROVIDER_API
  ) {
    CustomizableUI.createWidget({
      id: WIDGET_ID,
      type: "button",
      defaultArea: CustomizableUI.AREA_NAVBAR,
      l10nId: "sunfinch-screenshot-button",
      onCommand(event) {
        const win = event.view ?? event.target.ownerDocument.defaultView;
        win.SunfinchScreenshot.take(event.shiftKey);
      },
    });
  }
}
