import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

function isFunctionValue(node) {
  if (!node) return false;
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return true;
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node)
  ) {
    return isFunctionValue(node.expression);
  }
  if (!ts.isCallExpression(node)) return false;
  const name = ts.isPropertyAccessExpression(node.expression)
    ? node.expression.name.text
    : node.expression.getText();
  return (
    ["useCallback", "memo", "forwardRef"].includes(name) &&
    isFunctionValue(node.arguments[0])
  );
}

function definesFunction(node) {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  ) {
    return Boolean(node.body);
  }
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.some((item) =>
      isFunctionValue(item.initializer),
    );
  }
  if (ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node)) {
    return isFunctionValue(node.initializer);
  }
  return false;
}

function isImport(node) {
  return ts.isImportDeclaration(node) || ts.isImportEqualsDeclaration(node);
}

export function findSpacingIssues(source, fileName) {
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const issues = [];

  function visitList(nodes) {
    for (let index = 0; index < nodes.length - 1; index += 1) {
      const node = nodes[index];
      const next = nodes[index + 1];
      const afterFunction = definesFunction(node);
      const beforeFunction = definesFunction(next);
      const afterImports = isImport(node) && !isImport(next);
      if (!afterFunction && !beforeFunction && !afterImports) continue;
      const end = next.getStart(file);
      // Comments can contain empty lines; those are not code separators.
      const gap = source
        .slice(node.end, end)
        .replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, "comment");
      // Keep same-line comments attached to the function. The separator must
      // precede the next declaration's leading comments, not occur inside them.
      const boundary = gap.replace(/^[\t ,;]*(?:comment[\t ]*)*/, "");
      const hasOneEmptyLine = /^\r?\n\r?\n(?![\t ]*\r?\n)/.test(boundary);
      const lastDoc = next.jsDoc?.at(-1);
      const detachedDoc =
        lastDoc && /\r?\n[\t ]*\r?\n/.test(source.slice(lastDoc.end, end));
      if (!hasOneEmptyLine || detachedDoc) {
        issues.push({
          line:
            file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
          end: node.end,
          nextStart: end,
          reason: afterImports ? "import 묶음 뒤" : "함수 선언 앞·뒤",
        });
      }
    }
    nodes.forEach(visit);
  }

  function visit(node) {
    ts.forEachChild(node, visit, visitList);
  }

  visit(file);
  return issues;
}

function sourceFiles(directory) {
  const excluded = new Set([
    "node_modules",
    ".next",
    ".expo",
    "ios",
    "android",
    "dist",
    "generated",
  ]);
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !excluded.has(entry.name)) {
      files.push(...sourceFiles(path));
    } else if (
      entry.isFile() &&
      /\.(?:[cm]?[jt]s|[jt]sx)$/.test(entry.name) &&
      !/\.d\.[cm]?ts$/.test(entry.name)
    ) {
      files.push(path);
    }
  }
  return files.sort();
}

function main() {
  const files =
    process.argv.length > 2
      ? process.argv.slice(2)
      : ["apps", "packages", "scripts"].flatMap(sourceFiles);
  let count = 0;
  for (const path of files) {
    const issues = findSpacingIssues(readFileSync(path, "utf8"), path);
    for (const issue of issues) {
      console.error(
        `${path}:${issue.line}: ${issue.reason}에 빈 줄 한 줄이 필요합니다.`,
      );
    }
    count += issues.length;
  }
  console.log(`코드 간격: ${files.length}개 파일 검사, 위반 ${count}건`);
  process.exitCode = count ? 1 : 0;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
