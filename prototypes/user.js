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

// SunFinch defaults (keep in sync with the fork's prefs).
user_pref("sidebar.revamp", true);
user_pref("sidebar.verticalTabs", true);
