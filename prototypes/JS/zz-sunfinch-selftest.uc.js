// ==UserScript==
// @name           SunFinch prototype self-test
// @description    Runs only when sunfinch.proto.selftest is true: exercises the
//                 prototypes, writes selftest-<phase>.json into the profile and
//                 quits. Phase 1 sets things up, phase 2 runs after a restart
//                 with session restore. Started by tools/proto-selftest.ps1.
// ==/UserScript==

(function () {
  if (!Services.prefs.getBoolPref("sunfinch.proto.selftest", false)) {
    return;
  }
  // Only the first window runs the test.
  if (Services.wm.getMostRecentWindow("navigator:browser") !== window) {
    return;
  }

  const results = [];
  const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function waitFor(fn, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await fn()) {
        return true;
      }
      await wait(200);
    }
    return false;
  }

  const phase = Services.prefs.getStringPref("sunfinch.proto.selftest.phase", "1");
  const system = Services.scriptSecurityManager.getSystemPrincipal();
  const openTab = name =>
    gBrowser.addTab(`data:text/html,<title>${name}</title>${name}`, {
      triggeringPrincipal: system,
    });
  // URL of a tab, also for restored tabs that have not loaded yet.
  function tabUrl(tab) {
    const state = JSON.parse(SessionStore.getTabState(tab));
    return state.entries?.[state.index - 1]?.url ?? tab.linkedBrowser.currentURI.spec;
  }

  async function run() {
    await delayedStartupPromise;
    if (phase == "2") {
      await spacesAfterRestart();
      return;
    }
    await buttons();
    await spacesSetup();
  }

  async function buttons() {

    // The page puts its user agent into the title, which chrome can read.
    const url =
      "data:text/html,<body style='height:3000px'>" +
      "<script>document.title=navigator.userAgent</script>";
    const tab = gBrowser.addTab(url, {
      triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
    });
    gBrowser.selectedTab = tab;
    await waitFor(() => tab.linkedBrowser.currentURI.spec.startsWith("data:"));
    await wait(1000);

    for (const id of ["sunfinch-mobile-view-button", "sunfinch-screenshot-button"]) {
      const w = CustomizableUI.getWidget(id);
      check(`widget ${id} registered`, w?.provider === CustomizableUI.PROVIDER_API,
        JSON.stringify({ provider: w?.provider, area: w?.areaType, placement: CustomizableUI.getPlacementOfWidget(id) }));
    }

    // Vertical tabs.
    check("vertical tabs pref", Services.prefs.getBoolPref("sidebar.verticalTabs", false));

    // Mobile view.
    const mobile = document.getElementById("sunfinch-mobile-view-button");
    check("mobile button exists", mobile);
    if (mobile) {
      mobile.doCommand();
      const on = await waitFor(() =>
        gBrowser.selectedBrowser.closest(".browserContainer")?.classList.contains("responsive-mode")
      );
      check("mobile view turns on", on);
      check("mobile button checked", await waitFor(() => mobile.hasAttribute("checked")));
      const uaOk = await waitFor(() =>
        gBrowser.selectedBrowser.contentTitle.includes("iPhone")
      );
      check("mobile UA in page", uaOk, gBrowser.selectedBrowser.contentTitle);
      mobile.doCommand();
      const off = await waitFor(() =>
        !gBrowser.selectedBrowser.closest(".browserContainer")?.classList.contains("responsive-mode")
      );
      check("mobile view turns off", off);
      check("mobile button unchecked", await waitFor(() => !mobile.hasAttribute("checked")));
    }

    // Screenshot to file.
    const shot = document.getElementById("sunfinch-screenshot-button");
    check("screenshot button exists", shot);
    if (shot) {
      const dir = Services.prefs.getStringPref("browser.download.dir", "");
      Services.prefs.setStringPref("sunfinch.screenshot.target", "file");

      // Returns [width, height] of the new PNG, or null.
      async function shoot(name, shiftKey) {
        const before = new Set(await IOUtils.getChildren(dir).catch(() => []));
        const event = document.createEvent("XULCommandEvent");
        event.initCommandEvent("command", true, true, window, 0,
          false, false, shiftKey, false, 0, null, 0);
        shot.dispatchEvent(event);
        let file = null;
        await waitFor(async () => {
          const now = await IOUtils.getChildren(dir).catch(() => []);
          file = now.find(p => !before.has(p) && p.endsWith(".png"));
          return !!file;
        });
        check(`${name}: file saved`, file, file || dir);
        if (!file) {
          return null;
        }
        await wait(500);
        const bytes = await IOUtils.read(file);
        const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e;
        const view = new DataView(bytes.buffer);
        const size = [view.getUint32(16), view.getUint32(20)];
        check(`${name}: PNG`, png, `${bytes.length} bytes, ${size.join("x")}`);
        return size;
      }

      const visible = await shoot("visible screenshot", false);
      const full = await shoot("full-page screenshot", true);
      if (visible && full) {
        // The test page is 3000px tall plus the default 8px body margins.
        const dpr = window.devicePixelRatio;
        check("full page height matches the document", Math.abs(full[1] / dpr - 3016) <= 4,
          `${visible.join("x")} vs ${full.join("x")}`);
      }
      Services.prefs.clearUserPref("sunfinch.screenshot.target");
    }
  }

  const { SpacesStore } = ChromeUtils.importESModule(
    "chrome://userscripts/content/SunfinchSpaces/SpacesStore.sys.mjs"
  );

  async function spacesSetup() {
    const S = window.SunfinchSpaces;
    check("spaces: ready", await waitFor(() => S?.ready));
    if (!S?.ready) {
      return;
    }
    check("spaces: switcher in the toolbar",
      document.getElementById("sunfinch-spaces-switcher")?.closest("#nav-bar"));
    const first = S.activeId;

    const mainA = openTab("sf-main-A");
    const tempA = openTab("sf-temp-A");
    check("spaces: new tab is additional", S.kindOf(tempA) == "temp" && S.spaceOf(tempA) == first);
    S.setKind(mainA, "main");
    const visibleA = gBrowser.visibleTabs.filter(t => !t.pinned);
    check("spaces: main tabs come first",
      visibleA.findIndex(t => S.kindOf(t) == "temp") > visibleA.findIndex(t => S.kindOf(t) == "main"),
      visibleA.map(t => S.kindOf(t)).join(","));
    const divided = gBrowser.tabs.filter(t => t.hasAttribute("sunfinch-first-temp"));
    check("spaces: one divider above the first additional tab",
      divided.length == 1 && S.kindOf(divided[0]) == "temp");

    const second = SpacesStore.add("Second").id;
    S.switchTo(second);
    check("spaces: switching hides the other space", mainA.hidden && tempA.hidden);
    const dump = () => JSON.stringify({
      active: S.activeId, first, second,
      modal: document.documentElement.hasAttribute("window-modal-open"), toolboxCollapsed: gNavToolbox.collapsed,
      dialog: [gDialogBox.isOpen, gDialogBox.dialog?._frame?.contentDocument?.documentURI, gDialogBox.dialog?._frame?.contentDocument?.body?.innerText?.slice(0, 200), gDialogBox.dialog?._frame?.contentWindow?.arguments?.[0]?.message?.id ?? gDialogBox.dialog?._frame?.contentWindow?.arguments?.[0]?.wrappedJSObject?.message?.id],
      selected: [S.spaceOf(gBrowser.selectedTab), S.kindOf(gBrowser.selectedTab), gBrowser.selectedTab.hidden],
      tabs: gBrowser.tabs.map(t => [tabUrl(t).slice(-12), S.spaceOf(t), S.kindOf(t), t.hidden ? "h" : "v"]),
    });
    check("spaces: empty space gets a new tab",
      S.tabsOf(second).length == 1 && S.spaceOf(gBrowser.selectedTab) == second, dump());
    check("spaces: switcher marks the active space",
      document.querySelector(`.sunfinch-space-button[data-space-id="${second}"]`)?.hasAttribute("selected"));

    const mainB = openTab("sf-main-B");
    S.setKind(mainB, "main");
    const tempB = openTab("sf-temp-B");
    check("spaces: tabs of the active space are visible", !mainB.hidden && !tempB.hidden);

    gBrowser.selectedTab = tempA;
    check("spaces: selecting a tab of another space opens that space",
      S.activeId == first && !tempA.hidden && mainB.hidden, dump());

    S.moveToSpace(tempA, second);
    check("spaces: move to space", S.spaceOf(tempA) == second && tempA.hidden && S.activeId == first, dump());
    S.moveToSpace(tempA, first);

    TabContextMenu.contextTab = mainA;
    S.updateContextMenu();
    check("spaces: tab context menu",
      document.getElementById("sunfinch-context-kind")?.getAttribute("label")?.startsWith("Make additional") &&
      document.getElementById("sunfinch-context-move")?.menupopup.childElementCount == 1);

    // Phase 2 expects the second space to be active after the restart.
    S.switchTo(second);
    await waitFor(() => [mainA, tempA, mainB, tempB].every(t => t.linkedBrowser.currentURI.spec.startsWith("data:")));
    await SpacesStore.flush();
    const { TabStateFlusher } = ChromeUtils.importESModule(
      "resource:///modules/sessionstore/TabStateFlusher.sys.mjs"
    );
    await TabStateFlusher.flushWindow(window);
  }

  async function spacesAfterRestart() {
    const S = window.SunfinchSpaces;
    check("restart: spaces ready", await waitFor(() => S?.ready, 30000));
    if (!S?.ready) {
      return;
    }
    const find = name => gBrowser.tabs.find(t => tabUrl(t).includes(name));
    const urls = gBrowser.tabs.map(tabUrl).join(" | ");
    check("restart: main tabs are kept", find("sf-main-A") && find("sf-main-B"), urls);
    check("restart: additional tabs are closed", !find("sf-temp-A") && !find("sf-temp-B"), urls);
    check("restart: spaces are kept", SpacesStore.spaces.map(s => s.name).join(",") == "Space 1,Second",
      SpacesStore.spaces.map(s => s.name).join(","));
    check("restart: active space is kept", SpacesStore.get(S.activeId)?.name == "Second");
    const mainA = find("sf-main-A");
    const mainB = find("sf-main-B");
    check("restart: visibility follows the active space", mainA?.hidden && mainB && !mainB.hidden);
    check("restart: kinds are kept", mainA && S.kindOf(mainA) == "main" && S.kindOf(mainB) == "main");
  }

  // Errors from prototype scripts that reached the console.
  function consoleErrors() {
    const scriptErrors = Services.console
      .getMessageArray()
      .filter(m => m instanceof Ci.nsIScriptError && !(m.flags & Ci.nsIScriptError.warningFlag))
      .filter(m => /sunfinch|chrome\/JS|userchromejs|userscripts/i.test(`${m.sourceName} ${m.errorMessage}`))
      .map(m => `${m.sourceName}:${m.lineNumber} ${m.errorMessage}`);
    // console.error() calls from chrome scripts.
    const apiErrors = Cc["@mozilla.org/consoleAPI-storage;1"]
      .getService(Ci.nsIConsoleAPIStorage)
      .getEvents()
      .filter(e => e.level === "error")
      .map(e => e.arguments.map(a => (a?.stack ? `${a}\n${a.stack}` : String(a))).join(" "))
      .filter(text => /sunfinch/i.test(text));
    return [...scriptErrors, ...apiErrors];
  }

  run()
    .catch(e => check("exception", false, String(e) + "\n" + e.stack))
    .finally(async () => {
      const errors = consoleErrors();
      check("no script errors", !errors.length, errors.join("\n"));
      await IOUtils.writeJSON(
        PathUtils.join(PathUtils.profileDir, `selftest-${phase}.json`),
        { date: new Date().toISOString(), results }
      );
      Services.startup.quit(Ci.nsIAppStartup.eForceQuit);
    });
})();
