import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Check the exported native callback evidence, not synthetic expected events.
const report = JSON.parse(
  readFileSync(
    process.argv[2] ?? "docs/verification/m08-m09/m08-native.json",
    "utf8",
  ),
);
assert.deepEqual(report.before, {
  ready: true,
  running: false,
  result: null,
  error: false,
});
assert.deepEqual(report.after, report.before);
const rejected = [
  "invalid-json",
  "null",
  "wrong-channel",
  "wrong-version",
  "unknown-type",
  "nonempty-payload",
  "extra-key",
  "missing-id",
];
const navigation = [
  "external-origin",
  "same-origin-other-path",
  "query",
  "custom-scheme",
];
const popups = ["new-window", "target-blank"];
const alive = ["unmatched-pong", "final-document"];
assert.equal(report.platform, "ios");
assert.deepEqual(report.cases, [
  ...rejected,
  alive[0],
  ...navigation,
  ...popups,
  alive[1],
]);
for (const id of report.cases) {
  const events = report.events.filter((event) => event.case === id);
  assert.equal(events.length, 1, `${id}: expected one actual callback`);
  const event = events[0];
  if (rejected.includes(id))
    assert.equal(event.decision, "rejected-schema", id);
  if (navigation.includes(id)) {
    assert.equal(event.kind, "navigation", id);
    assert.equal(event.allowed, false, id);
  }
  if (popups.includes(id)) assert.equal(event.kind, "new-window-blocked", id);
  if (alive.includes(id)) {
    assert.equal(event.decision, "accepted", id);
    assert.equal(event.url, "http://127.0.0.1:3000/apply", id);
  }
}
console.log(
  "M08: 16/16 actual callback assertions passed; bridge state unchanged.",
);
