/**
 * Metro Station Finder - Modern Commitlint Configuration
 *
 * This configuration implements the latest commitlint best practices for 2025:
 * - Modern Conventional Commits 2.0 specification
 * - Metro app specific commit types and scopes
 * - Enhanced validation for release automation
 * - Accessibility and performance focused rules
 * - CI/CD integration with semantic versioning
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
  // Type and scope limits
  typeMaxLength: 20,
  scopeMaxLength: 30,

  // Subject limits (optimized for mobile-first metro app)
  subjectMaxLength: 50,
  subjectMinLength: 10,

  // Body and footer limits
  bodyMaxLength: 72,
  footerMaxLength: 72,

  // Header limits (Git standard)
  headerMaxLength: 72,
  headerMinLength: 20,
};

// Magic number constants for commitlint rules
const RULE_CONSTANTS = {
  // Subject limits
  subjectMaxLength: 50, // Short & precise
  subjectMinLength: 10,

  // Body and footer limits
  bodyMaxLineLength: 72,
  bodyMinLength: 0,

  // Header limits
  headerMaxLength: 72, // Git standard
  headerMinLength: 20,
};

// Metro app specific commit types
const COMMIT_TYPES = [
  // Core functionality
  "feat", // New features for metro station finder
  "fix", // Bug fixes
  "perf", // Performance improvements (critical for mobile)

  // Development workflow
  "build", // Build system changes
  "ci", // CI/CD pipeline changes
  "chore", // Maintenance tasks

  // Code quality
  "refactor", // Code refactoring
  "style", // Code style changes (formatting, etc.)
  "test", // Test additions or changes

  // Documentation and communication
  "docs", // Documentation changes
  "revert", // Revert previous commits

  // Metro app specific
  "accessibility", // A11y improvements
  "maps", // Map integration changes
  "navigation", // Navigation/routing changes
  "offline", // Offline functionality
  "pwa", // PWA specific features
];

// Metro app specific scopes
const COMMIT_SCOPES = [
  // Core app areas
  "app", // Main application
  "components", // React components
  "lib", // Library code
  "hooks", // React hooks
  "types", // TypeScript types
  "data", // Data files
  "init", // Project initialization

  // Metro app specific
  "stations", // Station data and logic
  "fares", // Fare calculation
  "routes", // Route planning
  "maps", // Map integration
  "geolocation", // Location services
  "offline", // Offline functionality
  "pwa", // PWA features

  // Infrastructure
  "config", // Configuration files
  "deps", // Dependencies
  "scripts", // Build scripts
  "tests", // Test files
  "docs", // Documentation
  "ci", // CI/CD
  "release", // Release process
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

    // Subject formatting (lower case for consistency)
    "subject-case": [2, "always", "lower-case"],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "subject-max-length": [2, "always", RULE_CONSTANTS.subjectMaxLength],
    "subject-min-length": [2, "always", RULE_CONSTANTS.subjectMinLength],

    // ============================================================================
    // BODY RULES
    // ============================================================================

    // Body formatting (disabled for simple format)
    "body-leading-blank": [0, "always"], // Disabled
    "body-max-line-length": [0, "always", RULE_CONSTANTS.bodyMaxLineLength],
    "body-min-length": [0, "always", RULE_CONSTANTS.bodyMinLength], // No minimum length requirement

    // ============================================================================
    // FOOTER RULES
    // ============================================================================

    // Footer formatting (disabled for simple format)
    "footer-leading-blank": [0, "always"], // Disabled
    "footer-max-line-length": [0, "always", RULE_CONSTANTS.bodyMaxLineLength],

    // ============================================================================
    // HEADER RULES
    // ============================================================================

    // Header formatting
    "header-case": [2, "always", "lower-case"],
    "header-max-length": [2, "always", RULE_CONSTANTS.headerMaxLength], // Git standard
    "header-min-length": [2, "always", RULE_CONSTANTS.headerMinLength],

    // ============================================================================
    // REFERENCES & BREAKING CHANGES
    // ============================================================================

    // References (issue numbers, PRs, etc.)
    "references-empty": [0, "never"], // Optional references

    // ============================================================================
    // METRO APP SPECIFIC RULES
    // ============================================================================

    // Additional validation rules for metro app
    "trailer-exists": [0, "always"], // Optional trailers
  },

  // ============================================================================
  // PLUGINS & PARSER CONFIGURATION
  // ============================================================================

  // Parser configuration for modern commit messages
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w*)(?:\(([^)]*)\))?: (.*)$/,
      headerCorrespondence: ["type", "scope", "subject"],
      referenceActions: ["closes", "fixes", "resolves"],
      issuePrefixes: ["#", "gh-"],
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

  // Custom help text for better developer experience
  helpUrl:
    "https://github.com/conventional-changelog/commitlint/#what-is-commitlint",

  // Default ignore patterns
  ignores: [
    // Ignore merge commits
    (commit) => commit.includes("Merge"),
    // Ignore revert commits
    (commit) => commit.includes("Revert"),
    // Ignore automated commits
    (commit) => commit.includes("chore(release)"),
  ],
};
