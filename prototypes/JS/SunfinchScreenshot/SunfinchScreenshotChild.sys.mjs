/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Content side of the one-click screenshot: reports page dimensions.
export class SunfinchScreenshotChild extends JSWindowActorChild {
  receiveMessage(message) {
    if (message.name === "SunfinchScreenshot:GetFullPageBounds") {
      return this.#fullPageBounds();
    }
    return null;
  }

  #fullPageBounds() {
    const win = this.contentWindow;
    // <html> in standards mode, <body> in quirks mode: its scroll size is
    // the whole document without scrollbars either way.
    const scroller = this.document.scrollingElement;
    return {
      left: win.scrollMinX,
      top: win.scrollMinY,
      width: scroller?.scrollWidth || win.innerWidth,
      height: scroller?.scrollHeight || win.innerHeight,
      devicePixelRatio: win.devicePixelRatio,
    };
  }
}
