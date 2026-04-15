import type { Options } from "semantic-release";

// https://semantic-release.gitbook.io/semantic-release/usage/configuration
//
// semantic-release templates — `${nextRelease.version}` placeholders are
// interpolated by semantic-release at runtime, not by JavaScript. Using
// a Unicode-escaped dollar sign keeps the linter's template-curly-in-string
// rule happy without changing the emitted string.
const DOLLAR = "\u0024";
const RELEASE_MESSAGE = `chore(release): ${DOLLAR}{nextRelease.version} [skip ci]\n\n${DOLLAR}{nextRelease.notes}`;
const TAG_FORMAT = `v${DOLLAR}{version}`;

const config: Options = {
  branches: [
    "master",
    "main",
    "next",
    "next-major",
    { name: "beta", prerelease: true },
    { name: "alpha", prerelease: true },
  ],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          { release: "patch", type: "docs" },
          { release: "patch", type: "refactor" },
          { release: false, type: "build" },
          { release: false, type: "chore" },
          { release: false, type: "ci" },
          { release: false, type: "style" },
          { release: false, type: "test" },
          { breaking: true, release: "major" },
        ],
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        presetConfig: {
          types: [
            { section: "Features", type: "feat" },
            { section: "Bug Fixes", type: "fix" },
            { section: "Performance", type: "perf" },
            { section: "Refactoring", type: "refactor" },
            { section: "Documentation", type: "docs" },
            { section: "Reverts", type: "revert" },
          ],
        },
      },
    ],
    ["@semantic-release/changelog", { changelogFile: "CHANGELOG.md" }],
    [
      "@semantic-release/github",
      {
        failComment: false,
        releasedLabels: false,
        successComment: false,
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json"],
        message: RELEASE_MESSAGE,
      },
    ],
  ],
  tagFormat: TAG_FORMAT,
};

export default config;
