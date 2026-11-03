import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import ts from "@typescript/typescript6";

/** Narrow scaffold guard. The full dependency graph gate belongs to METRO-12. */
export async function checkCoreBoundary(root: string): Promise<string[]> {
  const errors: string[] = [];
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  for (const section of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    if (Object.keys(manifest[section] ?? {}).length) errors.push(`Core cannot declare ${section}`);
  }
  const sourceRoot = resolve(root, "src");
  const within = (file: string) => {
    const path = relative(sourceRoot, file);
    return (
      path !== ".." &&
      !path.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) &&
      !isAbsolute(path)
    );
  };
  async function visitDirectory(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        errors.push(`Core source cannot contain a symlink: ${file}`);
        continue;
      }
      if (entry.isDirectory()) {
        await visitDirectory(file);
        continue;
      }
      if (!/\.[cm]?[jt]sx?$/.test(file) || /\.test\.[jt]sx?$/.test(file)) continue;
      const source = ts.createSourceFile(
        file,
        await readFile(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      function checkSpecifier(node: ts.Node | undefined): void {
        if (!node || !ts.isStringLiteralLike(node)) {
          errors.push(`${file}: computed module reference`);
          return;
        }
        const specifier = node.text;
        if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
          errors.push(`${file}: external module ${specifier}`);
        } else if (!within(resolve(directory, specifier))) {
          errors.push(`${file}: import escapes core source ${specifier}`);
        }
      }
      function visit(node: ts.Node): void {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
          if (node.moduleSpecifier) checkSpecifier(node.moduleSpecifier);
        } else if (
          ts.isImportEqualsDeclaration(node) &&
          ts.isExternalModuleReference(node.moduleReference)
        ) {
          checkSpecifier(node.moduleReference.expression);
        } else if (ts.isImportTypeNode(node)) {
          checkSpecifier(ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined);
        } else if (
          ts.isCallExpression(node) &&
          (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(node.expression) && node.expression.text === "require"))
        ) {
          checkSpecifier(node.arguments[0]);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  await visitDirectory(sourceRoot);
  return errors;
}

if (import.meta.main) {
  const errors = await checkCoreBoundary(resolve("packages/core"));
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else console.log("Core boundary passed");
}
