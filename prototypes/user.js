// Prefs for the prototype profile (Firefox ESR 153 + fx-autoconfig).
// tools/proto.cmd copies this file into the profile on every start.

// Chrome debugging: Browser Toolbox and console for chrome code.
user_pref("devtools.chrome.enabled", true);
user_pref("devtools.debugger.remote-enabled", true);
user_pref("devtools.debugger.prompt-connection", false);
user_pref("browser.aboutConfig.showWarning", false);
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);

// Quiet profile.
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("datareporting.healthreport.uploadEnabled", false);
user_pref("app.normandy.enabled", false);
// Mozilla onboarding and promo messages (spotlight dialogs, CFR, welcome).
user_pref("browser.aboutwelcome.enabled", false);
user_pref("browser.startup.upgradeDialog.enabled", false);
user_pref("messaging-system.rsexperimentloader.enabled", false);
user_pref("browser.newtabpage.activity-stream.asrouter.userprefs.cfr.addons", false);
user_pref("browser.newtabpage.activity-stream.asrouter.userprefs.cfr.features", false);
user_pref("app.shield.optoutstudies.enabled", false);
// Terms of Use modal of official Mozilla builds (the fork is unofficial and skips it).
user_pref("browser.preonboarding.enabled", false);
user_pref("termsofuse.bypassNotification", true);

// SunFinch defaults (keep in sync with the fork's prefs).
user_pref("sidebar.revamp", true);
user_pref("sidebar.verticalTabs", true);
// Main tabs of spaces survive restarts through session restore.
user_pref("browser.startup.page", 3);

// The dev loader runs the fork code from this repo.
user_pref("sunfinch.dev.repo", "E:/dev/sunfinch");
