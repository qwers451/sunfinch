/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// SunFinch default prefs.

// Interface language. Falls back to en-US when ru is not packaged.
pref("intl.locale.requested", "ru");

// Vertical tabs.
pref("sidebar.revamp", true);
pref("sidebar.verticalTabs", true);

// Spaces: main tabs survive restarts through session restore; additional
// tabs are closed at the next start.
pref("browser.startup.page", 3);
// Tabs of a space you left are unloaded after this many minutes (0: never).
pref("sunfinch.spaces.unloadAfterMinutes", 30);

// Mobile view button: Responsive Design Mode as a phone.
pref("devtools.responsive.viewport.width", 390);
pref("devtools.responsive.viewport.height", 844);
pref("devtools.responsive.viewport.pixelRatio", 3);
pref("devtools.responsive.touchSimulation.enabled", true);
pref("devtools.responsive.userAgent", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1");
// Reload so the page gets the mobile UA and touch events right away.
pref("devtools.responsive.reloadConditions.userAgent", true);
pref("devtools.responsive.reloadConditions.touchSimulation", true);
pref("devtools.responsive.reloadNotification.enabled", false);

// Glance: a link clicked with this modifier opens over the page.
// "alt", "shift", "ctrl" or "meta".
pref("sunfinch.glance.enabled", true);
pref("sunfinch.glance.modifier", "alt");

// Claude side panel: path to the claude CLI (empty: search PATH and the
// npm and native install locations), model (empty: CLI default) and how much
// page text goes to Claude.
pref("sunfinch.claude.path", "");
pref("sunfinch.claude.model", "");
pref("sunfinch.claude.maxPageChars", 100000);

// Screenshot button: "file", "clipboard" or "both".
pref("sunfinch.screenshot.target", "both");

// No Mozilla telemetry, studies or remote experiments.
pref("datareporting.policy.dataSubmissionEnabled", false);
pref("datareporting.healthreport.uploadEnabled", false);
pref("app.normandy.enabled", false);
pref("app.shield.optoutstudies.enabled", false);
pref("messaging-system.rsexperimentloader.enabled", false);

// No Mozilla onboarding and promo messages: they carry Firefox branding and
// some are modal.
pref("browser.aboutwelcome.enabled", false);
pref("browser.preonboarding.enabled", false);
pref("termsofuse.bypassNotification", true);
pref("browser.startup.upgradeDialog.enabled", false);
pref("browser.newtabpage.activity-stream.asrouter.userprefs.cfr.addons", false);
pref("browser.newtabpage.activity-stream.asrouter.userprefs.cfr.features", false);

// No promos of other Mozilla products (VPN, Relay, Focus, mobile apps,
// "More from Mozilla" in Settings) and no personalized add-on recommendations.
pref("browser.preferences.moreFromMozilla", false);
pref("browser.vpn_promo.enabled", false);
pref("browser.promo.focus.enabled", false);
pref("browser.promo.pin.enabled", false);
pref("browser.contentblocking.report.show_mobile_app", false);
pref("browser.contentblocking.report.monitor.enabled", false);
pref("signon.firefoxRelay.feature", "disabled");
pref("browser.discovery.enabled", false);
pref("extensions.htmlaboutaddons.recommendations.enabled", false);

// No sponsored content on the new tab page.
pref("browser.newtabpage.activity-stream.showSponsored", false);
pref("browser.newtabpage.activity-stream.showSponsoredTopSites", false);
pref("browser.newtabpage.activity-stream.feeds.section.topstories", false);
