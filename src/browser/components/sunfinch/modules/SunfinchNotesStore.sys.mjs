/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Quick notes: one text shared by all spaces and windows. Stored as JSON in
// the profile, not in prefs: notes can be large and prefs.js is rewritten on
// every pref change. Windows listen to "sunfinch-notes-changed" and, for the
// "Saved" mark, "sunfinch-notes-saved".

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  DeferredTask: "resource://gre/modules/DeferredTask.sys.mjs",
});

const FILE_NAME = "sunfinch-notes.json";
const SAVE_DELAY_MS = 500;

class Store {
  #text = "";
  #ready = null;
  #saveTask = null;

  init() {
    if (!this.#ready) {
      this.#ready = this.#load();
    }
    return this.#ready;
  }

  get path() {
    return PathUtils.join(PathUtils.profileDir, FILE_NAME);
  }

  async #load() {
    try {
      const data = await IOUtils.readJSON(this.path);
      if (typeof data?.text == "string") {
        this.#text = data.text;
      }
    } catch (e) {
      if (e.name != "NotFoundError") {
        console.error("[SunFinch] notes: cannot read", e);
      }
    }
    this.#saveTask = new lazy.DeferredTask(() => this.#save(), SAVE_DELAY_MS);
    IOUtils.profileBeforeChange.addBlocker("SunFinch notes: save", () =>
      this.#saveTask.finalize()
    );
  }

  async #save() {
    await IOUtils.writeJSON(
      this.path,
      { version: 1, text: this.#text, updated: Date.now() },
      { tmpPath: this.path + ".tmp" }
    );
    Services.obs.notifyObservers(null, "sunfinch-notes-saved");
  }

  get text() {
    return this.#text;
  }

  set text(value) {
    if (value == this.#text) {
      return;
    }
    this.#text = value;
    this.#saveTask.arm();
    Services.obs.notifyObservers(null, "sunfinch-notes-changed");
  }

  /** Flush to disk now (tests). */
  async flush() {
    await this.#saveTask.finalize();
    this.#saveTask = new lazy.DeferredTask(() => this.#save(), SAVE_DELAY_MS);
  }
}

export const NotesStore = new Store();
