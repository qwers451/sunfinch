/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Entry point of SunFinch window code, included from browser.xhtml right
// after browser-main.js. Feature scripts need gBrowser and CustomizableUI,
// so they load after delayed startup.

// Where JSWindowActor modules come from. The dev stand (prototypes/) points
// it to a package that its content processes can read.
var SUNFINCH_ACTOR_MODULES =
  window.SUNFINCH_ACTOR_MODULES ?? "chrome://browser/content/sunfinch/modules";

{
  const SUNFINCH_SCRIPTS = ["spaces.js", "notes.js", "glance.js", "claude.js", "preferences.js", "mobile-view.js", "screenshot.js"];

  delayedStartupPromise.then(() => {
    for (const name of SUNFINCH_SCRIPTS) {
      try {
        Services.scriptloader.loadSubScript(
          `chrome://browser/content/sunfinch/${name}`,
          window
        );
      } catch (e) {
        console.error(`[SunFinch] ${name}`, e);
      }
    }
  });
}
