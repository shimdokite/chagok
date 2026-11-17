import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findSpacingIssues } from "./check-function-spacing.mjs";

describe("function spacing", () => {
  it.each([
    ['import { value } from "value";\nconst next = 1;', 1],
    ['import "setup";\nexport function Main() {}', 1],
    ['import type { Value } from "value";\nexport type Next = Value;', 1],
    ['import {\n  value,\n} from "value";\nconst next = 1;', 1],
    ['import value = require("value");\nconst next = 1;', 1],
    ["const context = {};\nexport function Provider() {}", 1],
    ["const context = {};\nexport default async function Provider() {}", 1],
    ["const value = 1;\nconst handler = () => value;", 1],
    ["class Example {\n  value = 1;\n  method() {}\n}", 1],
    ["const api = {\n  value: 1,\n  method() {},\n};", 1],
    ["const value = 1;\n/** Function docs. */\nexport function Main() {}", 1],
    ['import "setup";\n  \nconst next = 1;', 1],
    ['import "setup";\n\n\nconst next = 1;', 1],
    ['import "setup";\n/* comment\n\ninside */\nconst next = 1;', 1],
    ['import "setup";\nconst context = {};\nexport function Provider() {}', 2],
  ])("detects import and function-before gaps: %s", (source, count) => {
    expect(findSpacingIssues(source, "example.tsx")).toHaveLength(count);
  });

  it.each([
    'import "setup";\nimport type { Value } from "value";\n\nconst next = 1;',
    'import "setup";\r\n\r\nexport function Main() {}',
    'import "setup"; // setup\n\n/** Context docs. */\nconst context = {};\n\nexport function Provider() {}',
    "const value = 1;\n\n/** Function docs. */\nexport function Main() {}",
    "export function Main() {}\n",
    'import "setup";\n',
    "const value = 1;\nitems.map(() => value);",
    "const value = 1;\ninterface Handler { run(): void; }",
  ])("preserves import groups, docs and first declarations: %s", (source) => {
    expect(findSpacingIssues(source, "example.tsx")).toEqual([]);
  });

  it.each([
    "function first() {}\nconst next = 1;",
    "const first = () => 1;\nconst next = 1;",
    "const first = async function () {};\nconst next = 1;",
    "class Example {\n  first() {}\n  next() {}\n}",
    "class Example {\n  first = () => 1;\n  next = 2;\n}",
    "class Example {\n  constructor() {}\n  next = 2;\n}",
    "class Example {\n  get first() { return 1; }\n  next = 2;\n}",
    "const api = {\n  first() {},\n  next: 1,\n};",
    "const api = {\n  first: () => 1,\n  next: 1,\n};",
    "const first = useCallback(() => 1, []);\nreturn first;",
    "const First = React.forwardRef(() => null);\nFirst.displayName = 'First';",
    "const First = memo(() => null);\nconst next = 1;",
    "const first = (() => 1) satisfies (() => number);\nconst next = 1;",
    "export default function First() {}\nexport const next = 1;",
    "function first() {} // explanation\n/** Next item. */\nconst next = 1;",
    "function first() {}\n/* comment\n\ninside comment */\nconst next = 1;",
    "function first() {}\n  \nconst next = 1;",
    "function first() {}\n/** Next item. */\n\nconst next = 1;",
    "function first() {}\n\n/** Next item. */\n\nconst next = 1;",
  ])("detects a missing separator: %s", (source) => {
    expect(findSpacingIssues(source, "example.tsx")).toHaveLength(1);
  });

  it.each([
    "function first() {}\n\nconst next = 1;",
    "const api = {\n  first: () => 1,\n\n  next: 1,\n};",
    "function first() {} // explanation\n\n/** Next item. */\nconst next = 1;",
    "function first() {}\r\n\r\nconst next = 1;",
    "function last() {}\n",
    "function outer() {\n  function last() {}\n}\n",
    "declare function signature(): void;\nconst next = 1;",
    "items.map((item) => item.id);\nconst next = 1;",
    "const view = <Button onPress={() => {}} />;\nconst next = 1;",
    "const text = `function first() {}\nconst next = 1;`;\nconst next = 1;",
  ])("preserves valid spacing and inline callbacks: %s", (source) => {
    expect(findSpacingIssues(source, "example.tsx")).toEqual([]);
  });

  it("reports the function's location and excess empty lines", () => {
    expect(
      findSpacingIssues("function first() {}\n\n\nconst next = 1;", "a.ts"),
    ).toMatchObject([{ line: 1 }]);
  });

  it("checks new source files, excludes generated files, fails then passes without writing", () => {
    const cwd = mkdtempSync(join(tmpdir(), "chagok-style-"));
    const script = fileURLToPath(
      new URL("./check-function-spacing.mjs", import.meta.url),
    );
    const missing = "function first() {}\nconst next = 1;";
    try {
      for (const dir of [
        "apps",
        "packages",
        "scripts",
        "apps/node_modules",
        "apps/.next",
      ]) {
        mkdirSync(join(cwd, dir), { recursive: true });
      }
      writeFileSync(join(cwd, "apps/new.ts"), missing);
      writeFileSync(join(cwd, "apps/node_modules/vendor.js"), missing);
      writeFileSync(join(cwd, "apps/.next/generated.ts"), missing);
      writeFileSync(join(cwd, "apps/types.d.ts"), missing);
      const failed = spawnSync(process.execPath, [script], {
        cwd,
        encoding: "utf8",
      });
      expect(failed.status).toBe(1);
      expect(failed.stderr).toContain("apps/new.ts:1");
      expect(failed.stdout).toContain("1개 파일 검사, 위반 1건");
      const again = spawnSync(process.execPath, [script], {
        cwd,
        encoding: "utf8",
      });
      expect(again.status).toBe(1);
      writeFileSync(
        join(cwd, "apps/new.ts"),
        "function first() {}\n\nconst next = 1;",
      );
      const passed = spawnSync(process.execPath, [script], {
        cwd,
        encoding: "utf8",
      });
      expect(passed.status).toBe(0);
      expect(passed.stdout).toContain("1개 파일 검사, 위반 0건");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
