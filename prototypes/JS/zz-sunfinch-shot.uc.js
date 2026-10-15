// ==UserScript==
// @name           SunFinch prototype screenshots
// @description    Runs only when sunfinch.proto.shot is set: builds a sample
//                 window (spaces, main and additional tabs) and saves
//                 screenshots of the scenes listed in the pref into
//                 <profile>/shots, then quits. Started by tools/proto-shot.ps1.
// ==/UserScript==

(function () {
  const scenes = Services.prefs.getStringPref("sunfinch.proto.shot", "");
  if (!scenes) {
    return;
  }
  if (Services.wm.getMostRecentWindow("navigator:browser") !== window) {
    return;
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function waitFor(fn, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await fn()) {
        return true;
      }
      await wait(100);
    }
    return false;
  }
  const system = Services.scriptSecurityManager.getSystemPrincipal();
  const page = (title, body) =>
    "data:text/html;charset=utf-8," +
    encodeURIComponent(
      `<title>${title}</title><body style="font:18px/1.6 Georgia,serif;max-width:640px;margin:56px auto;color:#1e1b16;background:#fbfaf6"><h1>${title}</h1>${body}</body>`
    );
  const text =
    "<p>Весной первые песни звучат ещё в темноте, за час до восхода. Орнитологи называют это утренним хором.</p>".repeat(4);

  async function setup() {
    const { SpacesStore } = ChromeUtils.importESModule(
      "chrome://browser/content/sunfinch/modules/SunfinchSpacesStore.sys.mjs"
    );
    const S = window.SunfinchSpaces;
    await waitFor(() => S?.ready);
    const first = SpacesStore.first.id;
    SpacesStore.rename(first, "Работа");
    SpacesStore.restyle(first, { color: "orange", icon: "work" });
    const study = SpacesStore.add("Учёба", { color: "indigo", icon: "study" }).id;
    SpacesStore.add("Личное", { color: "teal", icon: "home" });
    S.switchTo(study);

    const tabs = [
      ["Расписание — электронный журнал", "main"],
      ["Орнитология: материалы курса", "main"],
      ["Утренний хор: почему птицы поют на рассвете", "temp"],
      ["утренний хор птиц — Поиск", "temp"],
      ["Зяблик: записи песни — Звуковой архив", "temp"],
    ];
    const opened = [];
    for (const [title, kind] of tabs) {
      const tab = gBrowser.addTab(page(title, text), { triggeringPrincipal: system });
      opened.push(tab);
      if (kind == "main") {
        S.setKind(tab, "main");
      }
    }
    // The empty tab the space started with.
    for (const tab of S.tabsOf(study)) {
      if (!opened.includes(tab)) {
        gBrowser.removeTab(tab, { animate: false });
      }
    }
    gBrowser.selectedTab = opened[2];
    await waitFor(() => opened.every(t => t.linkedBrowser.contentTitle));
    return opened;
  }

  // Headed runs (tools/proto-shot.ps1 -Headed) take the picture from the
  // screen, popups included: we ask for it and wait for the file.
  const fromScreen = Services.prefs.getBoolPref("sunfinch.proto.shot.screen", false);

  async function shoot(name) {
    await wait(400);
    const dir = PathUtils.join(PathUtils.profileDir, "shots");
    await IOUtils.makeDirectory(dir, { ignoreExisting: true });
    const file = PathUtils.join(dir, `${name}.png`);
    if (fromScreen) {
      const scale = window.devicePixelRatio;
      const request = PathUtils.join(dir, `${name}.request.json`);
      await IOUtils.writeJSON(request, {
        file,
        x: Math.round(window.mozInnerScreenX * scale),
        y: Math.round(window.mozInnerScreenY * scale),
        width: Math.round(window.innerWidth * scale),
        height: Math.round(window.innerHeight * scale),
      }, { tmpPath: request + ".tmp" });
      await waitFor(() => IOUtils.exists(file), 20000);
      return;
    }
    const bitmap = await window.browsingContext.currentWindowGlobal.drawSnapshot(
      null, 1, "white"
    );
    const canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
    await IOUtils.write(file, new Uint8Array(await blob.arrayBuffer()));
  }

  async function run() {
    await delayedStartupPromise;
    window.moveTo(0, 0);
    window.resizeTo(1440, 900);
    await wait(500);
    const tabs = await setup();
    const theme = Services.prefs.getIntPref("ui.systemUsesDarkTheme", 0) ? "dark" : "light";
    for (const scene of scenes.split(",")) {
      switch (scene) {
        case "main":
          await shoot(`main-${theme}`);
          // Tab state next to the picture, for debugging the layout.
          await IOUtils.writeJSON(
            PathUtils.join(PathUtils.profileDir, "shots", `tabs-${theme}.json`),
            gBrowser.tabs.map(t => ({
              label: t.label,
              hidden: t.hidden,
              pinned: t.pinned,
              space: t.getAttribute("sunfinch-space"),
              kind: t.getAttribute("sunfinch-kind"),
              section: t.getAttribute("sunfinch-section"),
              count: t.getAttribute("sunfinch-section-count"),
            }))
          );
          break;
        case "notes": {
          const N = window.SunfinchNotes;
          await waitFor(() => N.ready);
          N.open();
          await waitFor(() => N.panel?.state == "open");
          N.textarea.value = "Орнитология — на неделю\n— отчёт о наблюдениях до пятницы\n— записи зарянки, сравнить с зябликом";
          N.textarea.dispatchEvent(new Event("input"));
          await wait(900);
          await shoot(`notes-${theme}`);
          N.close();
          break;
        }
        case "glance": {
          const G = window.SunfinchGlance;
          G.open(page("Зарянка — Справочник птиц", text), {
            triggeringPrincipal: system,
            sourceBrowser: tabs[2].linkedBrowser,
          });
          await waitFor(() => G.tab?.linkedBrowser.contentTitle);
          await shoot(`glance-${theme}`);
          const bar = document.getElementById("sunfinch-glance-bar");
          const box = el => {
            const r = el.getBoundingClientRect();
            return [el.id || el.className || el.localName, Math.round(r.left), Math.round(r.width), getComputedStyle(el).display];
          };
          await IOUtils.writeJSON(
            PathUtils.join(PathUtils.profileDir, "shots", `glance-${theme}.json`),
            { bar: box(bar), parent: box(bar.parentNode), panel: box(bar.closest("tabpanels > *")), children: [...bar.children].map(box) }
          );
          G.close();
          break;
        }
        case "claude": {
          const P = window.SunfinchClaudePanel;
          P.toggle?.() ?? P.open?.();
          await waitFor(() => P.isOpen);
          await wait(800);
          await shoot(`claude-${theme}`);
          break;
        }
        case "menu": {
          const S = window.SunfinchSpaces;
          const button = document.querySelector(".sunfinch-space-button[selected]");
          const rect = button.getBoundingClientRect();
          S.spaceMenu(
            JSON.parse(JSON.stringify(
              ChromeUtils.importESModule("chrome://browser/content/sunfinch/modules/SunfinchSpacesStore.sys.mjs")
                .SpacesStore.get(button.dataset.spaceId)
            )),
            { screenX: window.screenX + rect.left, screenY: window.screenY + rect.bottom }
          );
          await wait(600);
          await shoot(`menu-${theme}`);
          document.getElementById("sunfinch-space-menu").hidePopup();
          break;
        }
      }
    }
  }

  run()
    .catch(e => console.error("[SunFinch shot]", e))
    .finally(() => Services.startup.quit(Ci.nsIAppStartup.eForceQuit));
})();
