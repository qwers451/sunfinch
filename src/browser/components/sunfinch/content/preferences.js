/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// "SunFinch" group in about:preferences (see SunfinchPreferencesChild).

try {
  ChromeUtils.registerWindowActor("SunfinchPreferences", {
    child: {
      esModuleURI: `${SUNFINCH_ACTOR_MODULES}/SunfinchPreferencesChild.sys.mjs`,
      // Capture: before the page's own DOMContentLoaded handler shows the
      // first pane, so the group is in place when panes are switched.
      events: { DOMContentLoaded: { capture: true } },
    },
    matches: ["about:preferences*", "about:settings*"],
    includeChrome: true,
    remoteTypes: ["parent"],
  });
} catch (e) {
  // Registered by an earlier window.
}
