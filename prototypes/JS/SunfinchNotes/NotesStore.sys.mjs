/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Quick notes, one text per space. Stored as JSON in the profile, not in
// prefs: notes can be large and prefs.js is rewritten on every pref change.
// Windows listen to the "sunfinch-notes-changed" notification (data: space id).

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  DeferredTask: "resource://gre/modules/DeferredTask.sys.mjs",
});

const FILE_NAME = "sunfinch-notes.json";
const SAVE_DELAY_MS = 500;

class Store {
  #notes = {};
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
      if (data?.notes && typeof data.notes == "object") {
        this.#notes = data.notes;
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
      { version: 1, notes: this.#notes },
      { tmpPath: this.path + ".tmp" }
    );
  }

  get(spaceId) {
    return this.#notes[spaceId]?.text ?? "";
  }

  set(spaceId, text) {
    if (this.get(spaceId) == text) {
      return;
    }
    if (text) {
      this.#notes[spaceId] = { text, updated: Date.now() };
    } else {
      delete this.#notes[spaceId];
    }
    this.#saveTask.arm();
    Services.obs.notifyObservers(null, "sunfinch-notes-changed", spaceId);
  }

  /** Flush to disk now (tests). */
  async flush() {
    await this.#saveTask.finalize();
    this.#saveTask = new lazy.DeferredTask(() => this.#save(), SAVE_DELAY_MS);
  }
}

export const NotesStore = new Store();
