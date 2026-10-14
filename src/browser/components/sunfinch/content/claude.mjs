/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Chat page of the Claude side panel (runs inside claude.html).
//
// Answers are derived from untrusted page text, so they are shown as plain
// text only (textContent), never as HTML.

const { SunfinchClaude, pageBlock } = ChromeUtils.importESModule(
  "chrome://browser/content/sunfinch/modules/SunfinchClaude.sys.mjs"
);

const panel = window.browsingContext.topChromeWindow.SunfinchClaudePanel;
const $ = id => document.getElementById(id);

const Chat = {
  sessionId: null,
  // Page (address + selection) already sent in this conversation.
  sentPageKey: null,
  request: null,

  init() {
    $("send").addEventListener("click", () => this.send());
    $("stop").addEventListener("click", () => this.stop());
    $("new-chat").addEventListener("click", () => this.newChat());
    $("input").addEventListener("keydown", event => {
      if (event.key == "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        this.send();
      }
    });
    this.pageChanged();
  },

  pageChanged() {
    $("page-title").textContent = panel.pageTitle;
  },

  focusInput() {
    $("input").focus();
  },

  get busy() {
    return !!this.request;
  },

  setBusy(busy) {
    $("send").hidden = busy;
    $("stop").hidden = !busy;
  },

  addMessage(role, text = "") {
    const message = document.createElement("div");
    message.className = `message ${role}`;
    message.textContent = text;
    $("messages").append(message);
    message.scrollIntoView({ block: "end" });
    return message;
  },

  newChat() {
    this.stop();
    this.sessionId = null;
    this.sentPageKey = null;
    $("messages").replaceChildren();
    this.focusInput();
  },

  /** Sends the question; the page goes along once per conversation and
   * again whenever the page or the selection changes. */
  async send() {
    const input = $("input");
    const question = input.value.trim();
    if (!question || this.busy) {
      return;
    }
    input.value = "";
    this.addMessage("user", question);

    let prompt = question;
    if ($("use-page").checked) {
      const page = await panel.getPage();
      const key = `${page.url}\n${page.selection ?? ""}`;
      if (key != this.sentPageKey) {
        prompt = `${pageBlock(page)}\n\nQuestion: ${question}`;
        this.sentPageKey = key;
      }
    }

    const answer = this.addMessage("assistant");
    answer.classList.add("pending");
    this.setBusy(true);
    this.request = SunfinchClaude.ask({
      prompt,
      sessionId: this.sessionId,
      onEvent: event => this.onEvent(answer, event),
    });
    await this.request.finished;
    this.request = null;
    answer.classList.remove("pending");
    this.setBusy(false);
  },

  onEvent(answer, event) {
    switch (event.type) {
      case "text":
        answer.textContent += event.text;
        answer.scrollIntoView({ block: "end" });
        break;
      case "done":
        this.sessionId = event.sessionId;
        break;
      case "error": {
        const error = document.createElement("div");
        error.className = "error";
        if (event.message == "not-found") {
          document.l10n.setAttributes(error, "sunfinch-claude-not-found");
        } else {
          document.l10n.setAttributes(error, "sunfinch-claude-error", {
            message: event.message,
          });
        }
        answer.after(error);
        if (!answer.textContent) {
          answer.remove();
        }
        // The CLI did not keep this turn: send the page again next time.
        this.sentPageKey = null;
        break;
      }
    }
  },

  stop() {
    if (this.request) {
      this.request.cancel();
      const stopped = document.createElement("div");
      stopped.className = "note";
      document.l10n.setAttributes(stopped, "sunfinch-claude-stopped");
      $("messages").append(stopped);
    }
  },
};

window.SunfinchClaudeChat = Chat;
Chat.init();
