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
      await notesAfterRestart();
      return;
    }
    await defaults().catch(e => check("defaults: exception", false, String(e)));
    await buttons();
    await spacesSetup();
    await notesSetup();
    await glance();
    await claude();
    await settings();
    await spaceDialog();
  }

  // "New space" / "Edit space" dialog. Leaves the spaces as it found them
  // (phase 2 checks them).
  async function spaceDialog() {
    const S = window.SunfinchSpaces;
    const D = window.SunfinchSpaceDialog;
    const Store = lazy.SpacesStore;
    const before = Store.spaces.length;
    const active = S.activeId;
    const dialog = () => D.dialog;
    const press = (selector) => dialog().querySelector(selector).click();
    // Trusted key presses to the focused element, as EventUtils sends them.
    const key = (name, keyCode) => {
      const tip = Cc["@mozilla.org/text-input-processor;1"].createInstance(Ci.nsITextInputProcessor);
      tip.beginInputTransactionForTests(window);
      const event = new KeyboardEvent("", { key: name, code: name, keyCode });
      tip.keydown(event);
      tip.keyup(event);
    };

    // Cancel with Escape: nothing changes.
    S.promptNewSpace();
    check("space dialog: opens", await waitFor(() => D.isOpen));
    check("space dialog: modal", dialog()?.matches(":modal"));
    key("Escape", KeyboardEvent.DOM_VK_ESCAPE);
    check("space dialog: Escape cancels",
      (await waitFor(() => !D.isOpen)) && Store.spaces.length == before);

    // Create: name, color and icon from the dialog; Enter confirms.
    S.promptNewSpace();
    await waitFor(() => D.isOpen);
    check("space dialog: name field has focus",
      document.activeElement?.id == "sunfinch-space-dialog-name");
    check("space dialog: 8 colors and 12 icons",
      dialog().querySelectorAll(".sunfinch-space-dialog-color").length == 8 &&
      dialog().querySelectorAll(".sunfinch-space-dialog-icon").length == 12);
    press('.sunfinch-space-dialog-color[data-sf-color="pink"]');
    press('.sunfinch-space-dialog-icon[data-icon="code"]');
    const name = dialog().querySelector("#sunfinch-space-dialog-name");
    name.value = "Проекты";
    name.dispatchEvent(new Event("input"));
    check("space dialog: preview follows the choice",
      dialog().querySelector(".sunfinch-space-dialog-preview .sunfinch-space-name").textContent == "Проекты" &&
      dialog().querySelector(".sunfinch-space-dialog-preview .sunfinch-space-button").dataset.sfColor == "pink");
    name.focus();
    key("Enter", KeyboardEvent.DOM_VK_RETURN);
    await waitFor(() => !D.isOpen && Store.spaces.length == before + 1);
    const created = Store.spaces.at(-1);
    check("space dialog: creates the space",
      created?.name == "Проекты" && created.color == "pink" && created.icon == "code",
      JSON.stringify(created));
    check("space dialog: switches to the new space", S.activeId == created?.id);

    // Edit: same dialog, filled in.
    S.editSpace(Store.get(created.id));
    await waitFor(() => D.isOpen);
    check("space dialog: edit is filled in",
      dialog().querySelector("#sunfinch-space-dialog-name").value == "Проекты" &&
      dialog().querySelector('.sunfinch-space-dialog-color[aria-pressed="true"]')?.dataset.sfColor == "pink");
    press('.sunfinch-space-dialog-color[data-sf-color="sky"]');
    press(".sunfinch-space-dialog-ok");
    check("space dialog: edit saves",
      await waitFor(() => !D.isOpen && Store.get(created.id)?.color == "sky"),
      JSON.stringify(Store.get(created.id)));

    // Empty name: the default one.
    S.promptNewSpace();
    await waitFor(() => D.isOpen);
    press(".sunfinch-space-dialog-ok");
    await waitFor(() => !D.isOpen && Store.spaces.length == before + 2);
    const unnamed = Store.spaces.at(-1);
    check("space dialog: empty name gets the default", /\d/.test(unnamed?.name ?? ""), unnamed?.name);

    S.switchTo(active);
    Store.remove(unnamed.id);
    Store.remove(created.id);
    await Store.flush();
  }

  async function settings() {
    const tab = gBrowser.addTab("about:preferences", { triggeringPrincipal: system });
    gBrowser.selectedTab = tab;
    let doc = null;
    await waitFor(() => (doc = tab.linkedBrowser.contentDocument)?.getElementById("sunfinchGroup"));
    const group = doc?.getElementById("sunfinchGroup");
    check("settings: SunFinch group in General", group?.getAttribute("data-category") == "paneGeneral");
    check("settings: shown on the General pane", group && (await waitFor(() => !group.hidden)));
    if (!group) {
      return;
    }
    const modifier = doc.getElementById("sunfinchGlanceModifier");
    check("settings: shows current values",
      modifier?.value == "alt" && doc.getElementById("sunfinchUnloadMinutes")?.value == "30" &&
      doc.getElementById("sunfinchScreenshotTarget")?.value == "both");
    modifier.value = "shift";
    modifier.dispatchEvent(new Event("change"));
    check("settings: changing a value sets the pref",
      Services.prefs.getStringPref("sunfinch.glance.modifier") == "shift");
    Services.prefs.clearUserPref("sunfinch.glance.modifier");
    const unload = doc.getElementById("sunfinchUnloadMinutes");
    unload.value = "0";
    unload.dispatchEvent(new Event("change"));
    check("settings: unload can be turned off", Services.prefs.getIntPref("sunfinch.spaces.unloadAfterMinutes") == 0);
    Services.prefs.clearUserPref("sunfinch.spaces.unloadAfterMinutes");
    const labels = await doc.l10n.formatValues([{ id: "sunfinch-prefs-title" }]);
    check("settings: strings are localized", labels[0] == "SunFinch");
    gBrowser.removeTab(tab);
  }

  // Defaults decided for phase 1: Google search, no Firefox AI chatbot.
  async function defaults() {
    // Firefox 153 has no Services.search: the service is a module.
    const { SearchService } = ChromeUtils.importESModule(
      "moz-src:///toolkit/components/search/SearchService.sys.mjs"
    );
    await SearchService.init();
    const engine = SearchService.defaultEngine;
    check("defaults: search engine is Google", engine?.name == "Google", engine?.name);
    check("defaults: Firefox AI chatbot is off", !Services.prefs.getBoolPref("browser.ml.chat.enabled", true));
    check("defaults: UI is in Russian", Services.locale.appLocaleAsBCP47.startsWith("ru"),
      `${Services.prefs.getCharPref("intl.locale.requested", "")} -> ${Services.locale.appLocaleAsBCP47}`);
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

  // Imported lazily: if the fork code fails to load, the checks fail
  // instead of the whole self-test.
  const lazy = {};
  ChromeUtils.defineESModuleGetters(lazy, {
    SpacesStore: "chrome://browser/content/sunfinch/modules/SunfinchSpacesStore.sys.mjs",
    NotesStore: "chrome://browser/content/sunfinch/modules/SunfinchNotesStore.sys.mjs",
  });

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
    const headed = kind => gBrowser.tabs.filter(t => t.getAttribute("sunfinch-section") == kind);
    const [mainHead, tempHead] = [headed("main"), headed("temp")];
    check("spaces: section headers above the first main and additional tab",
      mainHead.length == 1 && S.kindOf(mainHead[0]) == "main" &&
      tempHead.length == 1 && S.kindOf(tempHead[0]) == "temp",
      `${mainHead.length} ${tempHead.length}`);
    check("spaces: section headers count the tabs",
      mainHead[0]?.getAttribute("sunfinch-section-count") ==
        String(visibleA.filter(t => S.kindOf(t) == "main").length).padStart(2, "0"),
      mainHead[0]?.getAttribute("sunfinch-section-count"));

    const second = lazy.SpacesStore.add("Second").id;
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
      document.l10n.getAttributes(document.getElementById("sunfinch-context-kind")).id == "sunfinch-tab-make-additional" &&
      document.getElementById("sunfinch-context-move")?.menupopup.childElementCount == 1);

    // Unloading a space you left: tabs stay in the list, without a process.
    await waitFor(() => [mainB, tempB].every(t => t.linkedBrowser.currentURI.spec.startsWith("data:")));
    S.switchTo(first);
    check("spaces: leaving a space schedules unloading", S.unloadTimers.has(second));
    await S.unloadSpace(second);
    check("spaces: tabs of a space you left are unloaded",
      [mainB, tempB].every(t => t.isConnected && t.hasAttribute("pending")),
      JSON.stringify([mainB, tempB].map(t => [t.isConnected, t.getAttribute("pending")])));
    check("spaces: the active space is never unloaded",
      !S.tabsOf(first).some(t => t.selected && t.hasAttribute("pending")));
    S.switchTo(second);
    check("spaces: coming back cancels unloading", !S.unloadTimers.has(second));
    gBrowser.selectedTab = mainB;
    check("spaces: unloaded tab loads again when selected",
      await waitFor(() => !mainB.hasAttribute("pending") && mainB.linkedBrowser.currentURI.spec.startsWith("data:")));

    // Phase 2 expects the second space to be active after the restart.
    S.switchTo(second);
    await waitFor(() => [mainA, tempA, mainB, tempB].every(t => t.linkedBrowser.currentURI.spec.startsWith("data:")));
    await lazy.SpacesStore.flush();
    const { TabStateFlusher } = ChromeUtils.importESModule(
      "resource:///modules/sessionstore/TabStateFlusher.sys.mjs"
    );
    await TabStateFlusher.flushWindow(window);
  }


  async function openNotes() {
    if (!window.SunfinchNotes.isOpen) {
      document.getElementById("sunfinch-notes-button").doCommand();
    }
    await waitFor(() => window.SunfinchNotes.panel?.state == "open");
    return document.getElementById("sunfinch-notes-text");
  }

  async function closeNotes() {
    const panel = window.SunfinchNotes.panel;
    if (panel?.state == "open") {
      const hidden = new Promise(r => panel.addEventListener("popuphidden", r, { once: true }));
      document.getElementById("sunfinch-notes-button").doCommand();
      await Promise.race([hidden, wait(5000)]);
    }
  }

  async function notesSetup() {
    const S = window.SunfinchSpaces;
    const N = window.SunfinchNotes;
    const button = document.getElementById("sunfinch-notes-button");
    check("notes: button in the toolbar", button?.closest("#nav-bar"));
    const placement = CustomizableUI.getPlacementOfWidget("sunfinch-notes-button");
    const switcher = CustomizableUI.getPlacementOfWidget("sunfinch-spaces-switcher");
    check("notes: button is on the right of the switcher", placement?.position > switcher?.position,
      JSON.stringify({ placement, switcher }));
    if (!button || !S?.ready) {
      return;
    }
    const [first, second] = lazy.SpacesStore.spaces.map(sp => sp.id);
    S.switchTo(second);

    const text = await openNotes();
    check("notes: panel opens", N.panel?.state == "open" && text);
    if (!text) {
      return;
    }
    check("notes: button shows the panel is open", button.hasAttribute("checked"));
    text.setUserInput("shared note");

    // Working with the page must not close the panel.
    gBrowser.selectedBrowser.focus();
    await wait(300);
    check("notes: stays open when the page gets focus", N.panel.state == "open");
    const otherTab = gBrowser.visibleTabs.find(t => t != gBrowser.selectedTab && !t.pinned);
    if (otherTab) {
      gBrowser.selectedTab = otherTab;
      await wait(300);
      check("notes: stays open when switching tabs", N.panel.state == "open");
    }
    S.switchTo(first);
    await wait(300);
    check("notes: stays open when switching spaces", N.panel.state == "open");
    check("notes: same note in every space", text.value == "shared note", text.value);
    // Escape and outside clicks end up in hidePopup().
    N.panel.hidePopup();
    await wait(300);
    check("notes: ignores other attempts to close it", N.panel.state == "open", N.panel.state);

    await closeNotes();
    check("notes: the button closes it", N.panel.state == "closed" && !button.hasAttribute("checked"), N.panel.state);
    S.switchTo(second);
    const again = await openNotes();
    check("notes: note is there after reopening", again?.value == "shared note", again?.value);
    await closeNotes();

    await lazy.NotesStore.flush();
    const saved = await IOUtils.readJSON(PathUtils.join(PathUtils.profileDir, "sunfinch-notes.json"));
    check("notes: saved to the profile", saved.text == "shared note", JSON.stringify(saved));
    const { TabStateFlusher } = ChromeUtils.importESModule(
      "resource:///modules/sessionstore/TabStateFlusher.sys.mjs"
    );
    await TabStateFlusher.flushWindow(window);
  }

  async function notesAfterRestart() {
    await lazy.NotesStore.init();
    check("restart: note is kept", lazy.NotesStore.text == "shared note", lazy.NotesStore.text);
    const text = await openNotes();
    check("restart: panel shows the note", text?.value == "shared note", text?.value);
    await closeNotes();
  }

  async function glance() {
    const G = window.SunfinchGlance;
    const S = window.SunfinchSpaces;
    check("glance: ready", G);
    if (!G) {
      return;
    }
    // Two local pages: a source with a big link and the link target.
    const dir = PathUtils.profileDir;
    const target = PathUtils.join(dir, "glance-target.html");
    const source = PathUtils.join(dir, "glance-source.html");
    await IOUtils.writeUTF8(target, "<title>sf-glance-target</title><p>target</p>");
    await IOUtils.writeUTF8(source,
      `<title>sf-glance-source</title><a id=l href="${PathUtils.toFileURI(target)}"
        style="display:block;width:100vw;height:100vh">link</a>`);
    const tab = gBrowser.addTab(PathUtils.toFileURI(source), { triggeringPrincipal: system });
    gBrowser.selectedTab = tab;
    await waitFor(() => tab.linkedBrowser.contentTitle == "sf-glance-source");
    await wait(500);

    // A real (trusted) Alt+click in the middle of the page.
    const altClick = () => {
      const rect = tab.linkedBrowser.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      for (const type of ["mousedown", "mouseup"]) {
        window.synthesizeMouseEvent(type, x, y, {
          button: 0,
          clickCount: 1,
          modifiers: Ci.nsIDOMWindowUtils.MODIFIER_ALT,
        });
      }
    };
    altClick();
    check("glance: Alt+click opens Glance", await waitFor(() => G.isOpen));
    if (!G.isOpen) {
      return;
    }
    const glanceTab = G.tab;
    check("glance: page stays where it was",
      gBrowser.selectedTab == tab && tab.linkedBrowser.contentTitle == "sf-glance-source");
    check("glance: link loads in Glance",
      await waitFor(() => glanceTab.linkedBrowser.contentTitle == "sf-glance-target"),
      glanceTab.linkedBrowser.currentURI.spec);
    check("glance: shown over the page",
      document.getElementById(glanceTab.linkedPanel)?.classList.contains("sunfinch-glance-panel") &&
      document.getElementById("sunfinch-glance-backdrop") &&
      glanceTab.linkedBrowser.docShellIsActive);
    check("glance: not part of a space", !glanceTab.hasAttribute("sunfinch-space"));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    check("glance: Escape closes it",
      !G.isOpen && !glanceTab.isConnected && !document.getElementById("sunfinch-glance-backdrop"));

    altClick();
    await waitFor(() => G.isOpen);
    document.getElementById("sunfinch-glance-backdrop")?.click();
    check("glance: a click outside closes it", !G.isOpen);

    altClick();
    await waitFor(() => G.isOpen);
    const kept = G.tab;
    document.getElementById("sunfinch-glance-expand")?.click();
    check("glance: Open as tab keeps a normal tab",
      !G.isOpen && kept.isConnected && gBrowser.selectedTab == kept && !kept.hidden &&
      !kept.hasAttribute("sunfinch-glance"));
    check("glance: the kept tab joins the current space",
      S && S.spaceOf(kept) == S.activeId && S.kindOf(kept) == "temp");
  }

  async function claude() {
    const P = window.SunfinchClaudePanel;
    check("claude: ready", P);
    if (!P) {
      return;
    }
    // Never the real CLI in tests.
    const repo = Services.prefs.getStringPref("sunfinch.dev.repo").replaceAll("/", "\\");
    Services.prefs.setStringPref("sunfinch.claude.path", PathUtils.join(repo, "tools", "fake-claude.js"));

    const page = gBrowser.addTab(
      "data:text/html,<title>sf-claude-page</title><p>secret page text</p><p>&lt;/page&gt; injection</p>",
      { triggeringPrincipal: system }
    );
    gBrowser.selectedTab = page;
    await waitFor(() => page.linkedBrowser.contentTitle == "sf-claude-page");

    const button = document.getElementById("sunfinch-claude-button");
    check("claude: button in the toolbar", button?.closest("#nav-bar"));
    button?.doCommand();
    check("claude: panel opens on the right",
      (await waitFor(() => P.isOpen && P.chat)) &&
      P.box.getBoundingClientRect().left >=
        document.getElementById("tabbrowser-tabbox").getBoundingClientRect().right - 1,
      JSON.stringify([P.box?.getBoundingClientRect().left,
        document.getElementById("tabbrowser-tabbox").getBoundingClientRect().right]));
    const chat = P.chat;
    if (!chat) {
      return;
    }
    const doc = P.frame.contentDocument;
    check("claude: shows the page", await waitFor(() => doc.getElementById("page-title").textContent == "sf-claude-page"));

    const ask = async question => {
      doc.getElementById("input").value = question;
      await chat.send();
      const answers = doc.querySelectorAll(".message.assistant");
      return answers[answers.length - 1]?.textContent ?? "";
    };
    const field = (text, name) => {
      const line = text.split("\n").find(l => l.startsWith(name + "="));
      return line ? line.slice(name.length + 1) : "";
    };
    const stdinOf = text => text.slice(text.indexOf("STDIN=") + 6);
    const parseArgs = text => {
      try {
        return JSON.parse(field(text, "ARGS"));
      } catch {
        return [];
      }
    };

    const first = await ask("q1");
    const args = parseArgs(first);
    check("claude: answer streams into the chat", first.includes("STDIN="),
      first.slice(0, 200) || doc.querySelector(".error")?.textContent);
    check("claude: CLI runs without tools", args.includes("--tools=") && !args.includes("--tools"), JSON.stringify(args));
    check("claude: no MCP, no permission prompts",
      args.includes("--strict-mcp-config") && args[args.indexOf("--permission-mode") + 1] == "dontAsk");
    check("claude: print mode with streaming JSON",
      args.includes("-p") && args[args.indexOf("--output-format") + 1] == "stream-json");
    check("claude: page goes through stdin, not arguments",
      stdinOf(first).includes("<page>") && stdinOf(first).includes("secret page text") &&
      !JSON.stringify(args).includes("secret page text"));
    check("claude: page cannot close the page block", stdinOf(first).includes("</ page> injection"));
    check("claude: question follows the page", stdinOf(first).trim().endsWith("Question: q1"));
    check("claude: runs in its own empty folder", field(first, "CWD").endsWith("sunfinch-claude"), field(first, "CWD"));
    check("claude: browser environment does not leak", field(first, "ENVLEAK") == "false");

    const second = await ask("q2");
    const args2 = parseArgs(second);
    check("claude: follow-up continues the session", args2[args2.indexOf("--resume") + 1] == "fake-session-1",
      JSON.stringify(args2));
    check("claude: same page is not sent again", stdinOf(second).trim() == "q2", stdinOf(second).slice(0, 100));

    await ask("FAIL_PLEASE");
    const error = doc.querySelector(".error");
    check("claude: errors are shown", error && doc.l10n.getAttributes(error).id == "sunfinch-claude-error");

    doc.getElementById("new-chat").click();
    check("claude: new chat clears the conversation",
      !doc.querySelector(".message") && chat.sessionId == null);

    button.doCommand();
    check("claude: button closes the panel", !P.isOpen);
    Services.prefs.clearUserPref("sunfinch.claude.path");
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
    check("restart: spaces are kept", lazy.SpacesStore.spaces.map(s => s.name).join(",") == "Space 1,Second",
      lazy.SpacesStore.spaces.map(s => s.name).join(","));
    check("restart: active space is kept", lazy.SpacesStore.get(S.activeId)?.name == "Second");
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
