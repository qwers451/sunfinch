// ==UserScript==
// @name           SunFinch prototype check
// @description    Confirms that fx-autoconfig loads scripts from the repo:
//                 logs to the Browser Console and writes proto-check.txt
//                 into the profile.
// ==/UserScript==

console.log("[SunFinch proto] loaded into", document.documentURI);
IOUtils.writeUTF8(
  PathUtils.join(PathUtils.profileDir, "proto-check.txt"),
  `${new Date().toISOString()} ${document.documentURI}\n`
);
