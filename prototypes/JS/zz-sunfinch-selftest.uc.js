// ==UserScript==
// @name           SunFinch prototype self-test
// @description    Runs only when sunfinch.proto.selftest is true: exercises the
//                 prototype buttons, writes selftest.json into the profile and
//                 quits. Started by tools/proto-selftest.ps1.
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

  async function run() {
    await delayedStartupPromise;

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
        PathUtils.join(PathUtils.profileDir, "selftest.json"),
        { date: new Date().toISOString(), results }
      );
      Services.startup.quit(Ci.nsIAppStartup.eForceQuit);
    });
})();
