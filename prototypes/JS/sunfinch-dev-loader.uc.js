// ==UserScript==
// @name           SunFinch dev loader
// @description    Runs the fork's own code from the repo (src/) on the
//                 prototype browser: chrome://browser/content/sunfinch/ is
//                 overridden to the files in src/, Fluent strings and default
//                 prefs come from src/ too. The repo path is the
//                 sunfinch.dev.repo pref (set in prototypes/user.js).
// ==/UserScript==

(function () {
  // PathUtils wants native separators.
  const repo = Services.prefs
    .getStringPref("sunfinch.dev.repo", "")
    .replaceAll("/", "\\");
  if (!repo) {
    console.error("[SunFinch dev] sunfinch.dev.repo is not set");
    return;
  }
  const component = PathUtils.join(repo, "src", "browser", "components", "sunfinch");
  const fileURL = path => PathUtils.toFileURI(path);

  // Once per app run: chrome overrides, Fluent sources, default prefs.
  const registry = L10nRegistry.getInstance();
  if (!registry.hasSource("sunfinch-dev-en-US")) {
    const lines = [];
    for (const dir of ["content", "modules"]) {
      const base = PathUtils.join(component, dir);
      const prefix = dir == "content" ? "" : "modules/";
      // Synchronous walk: the overrides must exist before the scripts load.
      const root = new FileUtils.File(base);
      const walk = (file, rel) => {
        for (const child of file.directoryEntries) {
          const childRel = rel ? `${rel}/${child.leafName}` : child.leafName;
          if (child.isDirectory()) {
            walk(child, childRel);
          } else {
            lines.push(
              `override chrome://browser/content/sunfinch/${prefix}${childRel} ${fileURL(child.path)}`
            );
          }
        }
      };
      if (root.exists()) {
        walk(root, "");
      }
    }
    const manifest = new FileUtils.File(PathUtils.join(PathUtils.profileDir, "sunfinch-dev.manifest"));
    const stream = FileUtils.openFileOutputStream(manifest);
    const text = lines.join("\n") + "\n";
    stream.write(text, text.length);
    stream.close();
    Components.manager.QueryInterface(Ci.nsIComponentRegistrar).autoRegister(manifest);

    registry.registerSources([
      new L10nFileSource(
        "sunfinch-dev-en-US",
        "app",
        ["en-US"],
        fileURL(PathUtils.join(repo, "src", "browser", "locales", "en-US")) + "/"
      ),
      new L10nFileSource(
        "sunfinch-dev-ru",
        "app",
        ["ru"],
        fileURL(PathUtils.join(repo, "l10n", "ru", "browser")) + "/"
      ),
    ]);

    // Default prefs as the fork ships them (pref() lines are valid JS).
    // intl.locale.requested is skipped: this browser has no ru package.
    const prefsFile = new FileUtils.File(PathUtils.join(component, "app-sunfinch-prefs.js"));
    const source = Cu.readUTF8File(prefsFile);
    const defaults = Services.prefs.getDefaultBranch("");
    const pref = (name, value) => {
      if (name == "intl.locale.requested") {
        return;
      }
      switch (typeof value) {
        case "boolean":
          defaults.setBoolPref(name, value);
          break;
        case "number":
          defaults.setIntPref(name, value);
          break;
        default:
          defaults.setStringPref(name, String(value));
      }
    };
    // eval is blocked in the parent process; the file is one pref() per line
    // with JSON-compatible values.
    for (const line of source.split("\n")) {
      const match = line.match(/^\s*pref\(\s*"([^"]+)"\s*,\s*(.+?)\s*\);\s*$/);
      if (match) {
        pref(match[1], JSON.parse(match[2]));
      }
    }
  }

  // Overrides apply in the parent process only, so actor modules come from
  // the sunfinchdev package that content processes know: the launch scripts
  // copy the modules into the profile (the content sandbox reads nothing
  // outside it) and add the package to chrome/utils/chrome.manifest.
  window.SUNFINCH_ACTOR_MODULES = "chrome://sunfinchdev/content";

  // Per window: what browser.xhtml does in the fork.
  document.l10n.addResourceIds(["browser/sunfinch.ftl"]);
  window.windowUtils.loadSheetUsingURIString(
    "chrome://browser/content/sunfinch/sunfinch.css",
    window.windowUtils.AUTHOR_SHEET
  );
  Services.scriptloader.loadSubScript(
    "chrome://browser/content/sunfinch/browser-sunfinch.js",
    window
  );
})();
