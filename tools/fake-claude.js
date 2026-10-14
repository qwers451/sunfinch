// Stand-in for the claude CLI in the prototype self-test: answers in the
// stream-json format and reports what it was given (arguments, stdin,
// working directory, leaked environment), so the test can check how the
// browser calls Claude without spending real requests.
//
// Point sunfinch.claude.path at this file; the browser runs it with node.

"use strict";

const args = process.argv.slice(2);
let stdin = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => (stdin += chunk));
process.stdin.on("end", () => {
  const resumeAt = args.indexOf("--resume");
  const sessionId = resumeAt >= 0 ? args[resumeAt + 1] : "fake-session-1";
  const out = obj => process.stdout.write(JSON.stringify(obj) + "\n");

  out({ type: "system", subtype: "init", session_id: sessionId, tools: [] });

  if (stdin.includes("FAIL_PLEASE")) {
    out({ type: "result", subtype: "error", is_error: true, result: "fake failure", session_id: sessionId });
    return;
  }

  const reply = [
    `ARGS=${JSON.stringify(args)}`,
    `CWD=${process.cwd()}`,
    `ENVLEAK=${!!process.env.SUNFINCH_TEST_SECRET}`,
    `STDIN=${stdin}`,
  ].join("\n");

  // Stream in a few pieces, like --include-partial-messages does.
  for (let i = 0; i < reply.length; i += 40) {
    out({
      type: "stream_event",
      session_id: sessionId,
      event: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: reply.slice(i, i + 40) } },
    });
  }
  out({ type: "assistant", session_id: sessionId, message: { content: [{ type: "text", text: reply }] } });
  out({ type: "result", subtype: "success", is_error: false, result: reply, session_id: sessionId });
});
