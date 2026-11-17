/**
 * Finds workflow steps that have no `name:`. An unnamed `uses:` step is shown as "Run owner/action@sha"
 * and an unnamed `run:` step as raw command text, which makes the run page hard to read.
 * Line-based on purpose: Node has no YAML parser and the workflow files use plain block style.
 */
export function unnamedSteps(text: string): string[] {
  const lines = text.split("\n");
  const found: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const header = /^(\s*)steps:\s*$/u.exec(lines[index] ?? "");
    if (header === null) continue;
    const itemIndent = (header[1]?.length ?? 0) + 2;
    let start = -1;
    const finish = (end: number) => {
      if (start < 0) return;
      const block = lines.slice(start, end);
      const named = block.some((line, offset) =>
        offset === 0
          ? /^\s*- name:/u.test(line)
          : new RegExp(`^ {${itemIndent + 2}}name:`, "u").test(line),
      );
      if (!named) found.push(`line ${start + 1}: ${(lines[start] ?? "").trim()}`);
    };
    let cursor = index + 1;
    for (; cursor < lines.length; cursor += 1) {
      const line = lines[cursor] ?? "";
      if (line.trim() === "" || line.trim().startsWith("#")) continue;
      const indent = line.length - line.trimStart().length;
      if (indent < itemIndent) break;
      if (indent === itemIndent && line.trimStart().startsWith("- ")) {
        finish(cursor);
        start = cursor;
      }
    }
    finish(cursor);
    index = cursor - 1;
  }
  return found;
}
