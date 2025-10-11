/**
 * Metro Station Finder - Commitlint Configuration
 *
 * Configuration for enforcing conventional commit messages in the metro station finder project.
 * Includes metro app specific commit types, scopes, and validation rules.
 *
 * @type {import('@commitlint/types').UserConfig}
 * @see https://commitlint.js.org/
 * @see https://www.conventionalcommits.org/
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Commit message validation constants
const COMMIT_LIMITS = {
  typeMaxLength: 20,
  scopeMaxLength: 30,
  subjectMaxLength: 72,
  subjectMinLength: 5,
  bodyMaxLength: 72,
  footerMaxLength: 72,
  headerMaxLength: 72,
  headerMinLength: 20,
};

// Metro app specific commit types
const COMMIT_TYPES = [
  "feat",
  "fix",
  "perf",
  "build",
  "ci",
  "chore",
  "refactor",
  "style",
  "test",
  "docs",
  "revert",
  "accessibility",
  "maps",
  "navigation",
  "offline",
  "pwa",
];

// Metro app specific scopes
const COMMIT_SCOPES = [
  "app",
  "components",
  "lib",
  "hooks",
  "types",
  "data",
  "pages",
  "ui",
  "stations",
  "fares",
  "routes",
  "maps",
  "geolocation",
  "offline",
  "pwa",
  "config",
  "deps",
  "scripts",
  "tests",
  "docs",
  "ci",
  "release",
  "utils",
  "init",
];

// ============================================================================
// COMMITLINT CONFIGURATION
// ============================================================================

export default {
  // ============================================================================
  // EXTENDS CONFIGURATION
  // ============================================================================

  extends: ["@commitlint/config-conventional"],

  // ============================================================================
  // RULES CONFIGURATION
  // ============================================================================

  rules: {
    // ============================================================================
    // TYPE RULES
    // ============================================================================

    // Enforce allowed commit types
    "type-enum": [2, "always", COMMIT_TYPES],

    // Type formatting
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],
    "type-max-length": [2, "always", COMMIT_LIMITS.typeMaxLength],

    // ============================================================================
    // SCOPE RULES
    // ============================================================================

    // Scope formatting
    "scope-case": [2, "always", "lower-case"],
    "scope-empty": [0, "never"], // Optional scope
    "scope-max-length": [2, "always", COMMIT_LIMITS.scopeMaxLength],

    // Enforce allowed scopes for metro app
    "scope-enum": [2, "always", COMMIT_SCOPES],

    // ============================================================================
    // SUBJECT RULES
    // ============================================================================

    // Subject formatting
    "subject-case": [2, "always", "lower-case"],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "subject-max-length": [2, "always", COMMIT_LIMITS.subjectMaxLength],
    "subject-min-length": [2, "always", COMMIT_LIMITS.subjectMinLength],

    // ============================================================================
    // BODY RULES
    // ============================================================================

    // Body formatting
    "body-leading-blank": [0, "always"],
    "body-max-line-length": [0, "always", COMMIT_LIMITS.bodyMaxLength],
    "body-min-length": [0, "always", 0],

    // ============================================================================
    // FOOTER RULES
    // ============================================================================

    // Footer formatting
    "footer-leading-blank": [0, "always"],
    "footer-max-line-length": [0, "always", COMMIT_LIMITS.footerMaxLength],

    // ============================================================================
    // HEADER RULES
    // ============================================================================

    // Header formatting
    "header-case": [2, "always", "lower-case"],
    "header-max-length": [2, "always", COMMIT_LIMITS.headerMaxLength],
    "header-min-length": [2, "always", COMMIT_LIMITS.headerMinLength],

    // ============================================================================
    // REFERENCES & BREAKING CHANGES
    // ============================================================================

    // References
    "references-empty": [0, "never"],

    // Trailers
    "trailer-exists": [0, "always"],
  },

  // ============================================================================
  // PLUGINS & PARSER CONFIGURATION
  // ============================================================================

  // Parser configuration
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w*)(?:\(([^)]*)\))?: (.*)$/,
      headerCorrespondence: ["type", "scope", "subject"],
      referenceActions: ["closes", "fixes", "resolves", "refs"],
      issuePrefixes: ["#", "gh-", "metro-"],
      noteKeywords: ["BREAKING CHANGE", "BREAKING CHANGES"],
      fieldPattern: /^-(.*?)-$/,
      revertPattern:
        /^(?:Revert|revert:)\s"?([\s\S]*?)"?\s*This reverts commit (\w*)\./i,
      revertCorrespondence: ["header", "hash"],
      warn() {
        // No-op warning function
      },
      mergePattern: null,
      mergeCorrespondence: null,
    },
  },

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  // Help URL
  helpUrl:
    "https://github.com/conventional-changelog/commitlint/#what-is-commitlint",

  // Ignore patterns
  ignores: [
    (commit) => commit.includes("Merge"),
    (commit) => commit.includes("Revert"),
    (commit) => commit.includes("chore(release)"),
    (commit) => commit.includes("WIP:"),
    (commit) => commit.includes("wip:"),
  ],
};
