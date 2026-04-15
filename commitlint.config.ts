import type { UserConfig } from "@commitlint/types";

// https://commitlint.js.org/reference/configuration
// Extends @commitlint/config-conventional (Conventional Commits 1.0.0).
// We only override the defaults we actually care to enforce strictly.
const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "body-leading-blank": [2, "always"],
    "body-max-line-length": [2, "always", 120],
    "footer-leading-blank": [2, "always"],
    "header-max-length": [2, "always", 100],
    "scope-case": [2, "always", "lower-case"],
    "subject-case": [2, "always", "lower-case"],
    "subject-full-stop": [2, "never", "."],
    "subject-max-length": [2, "always", 100],
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "revert",
        "style",
        "test",
      ],
    ],
  },
};

export default config;
