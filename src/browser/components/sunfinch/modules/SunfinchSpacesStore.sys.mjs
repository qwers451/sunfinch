/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// List of spaces, shared by all windows. Stored as JSON in the profile.
// Windows listen to the "sunfinch-spaces-changed" notification.

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  DeferredTask: "resource://gre/modules/DeferredTask.sys.mjs",
});

const FILE_NAME = "sunfinch-spaces.json";
const SAVE_DELAY_MS = 500;
// Space colors and icons are names: the colors are --sf-space-<name> design
// tokens, the icons content/icons/sp-<name>.svg ("space" is the plain one).
export const COLORS = ["orange", "indigo", "teal", "amber", "pink", "green", "sky", "slate"];
export const ICONS = [
  "space", "work", "study", "home", "book", "code", "flask",
  "globe", "heart", "music", "plane", "star", "cart",
];
// Colors of the first versions, stored as hex.
const OLD_COLORS = {
  "#ff5f00": "orange",
  "#4433e0": "indigo",
  "#00ada0": "teal",
  "#ffb300": "amber",
  "#e0338a": "pink",
  "#5b8c00": "green",
};

function normalize(space, index) {
  let color = OLD_COLORS[space.color] ?? space.color;
  if (!COLORS.includes(color)) {
    color = COLORS[index % COLORS.length];
  }
  const icon = ICONS.includes(space.icon) ? space.icon : "space";
  return { ...space, color, icon };
}

/** "Space N" in the UI language. */
export function defaultName(number) {
  return new Localization(["browser/sunfinch.ftl"]).formatValue(
    "sunfinch-space-default-name",
    { number }
  );
}

function newId() {
  return Services.uuid.generateUUID().toString().slice(1, 9);
}

class Store {
  #spaces = [];
  #ready = null;
  #saveTask = null;

  /** Resolves once the list is loaded; there is always at least one space. */
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
      if (Array.isArray(data?.spaces)) {
        this.#spaces = data.spaces
          .filter(s => s?.id && typeof s.name == "string")
          .map(normalize);
      }
    } catch (e) {
      if (e.name != "NotFoundError") {
        console.error("[SunFinch] spaces: cannot read", e);
      }
    }
    this.#saveTask = new lazy.DeferredTask(() => this.#save(), SAVE_DELAY_MS);
    if (!this.#spaces.length) {
      this.#spaces.push({
        id: newId(),
        name: await defaultName(1),
        color: COLORS[0],
        icon: "space",
      });
      this.#scheduleSave();
    }
    // Flush pending writes before the profile goes away.
    IOUtils.profileBeforeChange.addBlocker("SunFinch spaces: save", () =>
      this.#saveTask.finalize()
    );
  }

  async #save() {
    await IOUtils.writeJSON(
      this.path,
      { version: 1, spaces: this.#spaces },
      { tmpPath: this.path + ".tmp" }
    );
  }

  #scheduleSave() {
    this.#saveTask?.arm();
  }

  #changed() {
    this.#scheduleSave();
    Services.obs.notifyObservers(null, "sunfinch-spaces-changed");
  }

  get spaces() {
    return this.#spaces.map(s => ({ ...s }));
  }

  get(id) {
    const space = this.#spaces.find(s => s.id == id);
    return space ? { ...space } : null;
  }

  get first() {
    return { ...this.#spaces[0] };
  }

  add(name, { color, icon } = {}) {
    const space = normalize(
      { id: newId(), name, color, icon },
      this.#spaces.length
    );
    this.#spaces.push(space);
    this.#changed();
    return { ...space };
  }

  rename(id, name) {
    const space = this.#spaces.find(s => s.id == id);
    if (space && name) {
      space.name = name;
      this.#changed();
    }
  }

  /** Changes the color and/or icon; unknown names are ignored. */
  restyle(id, { color, icon }) {
    const space = this.#spaces.find(s => s.id == id);
    if (!space) {
      return;
    }
    if (COLORS.includes(color)) {
      space.color = color;
    }
    if (ICONS.includes(icon)) {
      space.icon = icon;
    }
    this.#changed();
  }

  /** The last space cannot be removed. */
  remove(id) {
    if (this.#spaces.length < 2) {
      return false;
    }
    this.#spaces = this.#spaces.filter(s => s.id != id);
    this.#changed();
    return true;
  }

  /** Flush to disk now (tests). */
  flush() {
    return this.#saveTask ? this.#saveTask.finalize().then(() => {
      this.#saveTask = new lazy.DeferredTask(() => this.#save(), SAVE_DELAY_MS);
    }) : Promise.resolve();
  }
}

export const SpacesStore = new Store();

// Per-app-run state shared by windows.
export const SpacesSession = {
  // Temporary tabs from the previous run are closed once, in the first
  // restored window set.
  tempTabsCleanupStarted: false,
};
