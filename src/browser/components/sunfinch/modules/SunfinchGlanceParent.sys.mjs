/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Parent side of Glance: hands the link to the window that owns the tab.

export class SunfinchGlanceParent extends JSWindowActorParent {
  receiveMessage(message) {
    if (message.name != "SunfinchGlance:Open") {
      return;
    }
    const browser = this.browsingContext.top.embedderElement;
    const win = browser?.ownerDocument.defaultView;
    win?.SunfinchGlance?.open(message.data.url, {
      sourceBrowser: browser,
      // The link's page opens it, with that page's rights.
      triggeringPrincipal: this.manager.documentPrincipal,
    });
  }
}
