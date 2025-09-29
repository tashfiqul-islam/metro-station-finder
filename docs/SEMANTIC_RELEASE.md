# 🚀 Semantic Release Documentation

This document describes the comprehensive semantic-release setup for the Metro Station Finder project, implementing 2025 best practices for automated versioning, changelog generation, and release management.

## 📋 Overview

Our semantic-release workflow provides:

- **Automated Versioning**: Based on conventional commits
- **Beautiful Release Notes**: Categorized and formatted changelog
- **GitHub Integration**: Automatic releases and issue linking
- **CI/CD Integration**: Seamless GitHub Actions workflow
- **Manual Release Support**: For emergency releases
- **Dry Run Testing**: Safe testing of release process

## 🏗️ Architecture

### Components

1. **Semantic Release Core**: `semantic-release` package
2. **Commit Analysis**: `@semantic-release/commit-analyzer`
3. **Release Notes**: `@semantic-release/release-notes-generator`
4. **Changelog**: `@semantic-release/changelog`
5. **Git Integration**: `@semantic-release/git`
6. **GitHub Integration**: `@semantic-release/github`
7. **Commit Validation**: `@commitlint/config-conventional`

### Configuration Files

- `.releaserc.json` - Main semantic-release configuration
- `commitlint.config.js` - Commit message validation rules
- `.github/workflows/release.yml` - GitHub Actions workflow
- `scripts/release.mjs` - Manual release script
- `CHANGELOG.md` - Generated changelog

## 🔧 Configuration

### Semantic Release Configuration

```json
{
  "branches": [
    "main",
    { "name": "beta", "prerelease": true },
    { "name": "alpha", "prerelease": true }
  ],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/git",
    "@semantic-release/github"
  ]
}
```

### Commit Message Rules

Our commitlint configuration enforces:

- **Type**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- **Scope**: Optional, lowercase, max 20 characters
- **Subject**: Sentence case, 10-100 characters, no period
- **Body**: Optional, max 100 characters per line
- **Footer**: Optional, for breaking changes and issue references

### Release Types

| Commit Type | Release Type | Example |
|-------------|--------------|---------|
| `feat:` | Minor | `1.0.0` → `1.1.0` |
| `fix:` | Patch | `1.0.0` → `1.0.1` |
| `perf:` | Patch | `1.0.0` → `1.0.1` |
| `refactor:` | Patch | `1.0.0` → `1.0.1` |
| `docs:` | Patch | `1.0.0` → `1.0.1` |
| `style:` | Patch | `1.0.0` → `1.0.1` |
| `test:` | Patch | `1.0.0` → `1.0.1` |
| `build:` | Patch | `1.0.0` → `1.0.1` |
| `ci:` | Patch | `1.0.0` → `1.0.1` |
| `chore:` | Patch | `1.0.0` → `1.0.1` |
| `revert:` | Patch | `1.0.0` → `1.0.1` |
| `BREAKING CHANGE:` | Major | `1.0.0` → `2.0.0` |

## 🚀 Usage

### Automatic Release

The release process runs automatically on:

- **Push to `main`**: Creates a new release
- **Push to `beta`**: Creates a beta prerelease
- **Push to `alpha`**: Creates an alpha prerelease

### Manual Release

```bash
# Automatic semantic release
bun run semantic-release

# Manual release types
bun run release patch    # 1.0.0 → 1.0.1
bun run release minor    # 1.0.0 → 1.1.0
bun run release major    # 1.0.0 → 2.0.0
bun run release prerelease # 1.0.0 → 1.0.0-beta.1

# Dry run (test without making changes)
bun run semantic-release:dry-run

# Debug mode
bun run semantic-release:debug
```

### Commit Message Examples

```bash
# Feature (minor release)
git commit -m "feat(station): add real-time arrival times"

# Bug fix (patch release)
git commit -m "fix(map): resolve marker positioning issue"

# Breaking change (major release)
git commit -m "feat(api): redesign station data structure

BREAKING CHANGE: Station interface has been completely redesigned.
The `coordinates` field is now `location` and uses a different format."

# Documentation (patch release)
git commit -m "docs(readme): update installation instructions"

# Performance improvement (patch release)
git commit -m "perf(map): optimize marker rendering for large datasets"

# Refactoring (patch release)
git commit -m "refactor(utils): extract distance calculation logic"

# Chore (patch release)
git commit -m "chore(deps): update dependencies to latest versions"
```

## 📋 Release Notes Format

Our release notes are automatically generated with:

### Categories

- 🚀 **Features**: New functionality
- 🐛 **Bug Fixes**: Bug fixes and corrections
- ⚡ **Performance Improvements**: Performance optimizations
- ♻️ **Code Refactoring**: Code improvements without behavior changes
- 📚 **Documentation**: Documentation updates
- 💄 **Styles**: Code style changes
- 🧪 **Tests**: Test additions and improvements
- 🏗️ **Build System**: Build and tooling changes
- 👷 **CI/CD**: Continuous integration improvements
- 🔧 **Chores**: Maintenance tasks
- ⏪ **Reverts**: Reverted changes

### Example Release Notes

```markdown
## [1.2.0](https://github.com/tashfiqul-islam/metro-station-finder/compare/v1.1.0...v1.2.0) (2025-01-15)

### 🚀 Features
- **station**: add real-time arrival times display
- **map**: implement custom marker clustering
- **fare**: add MRT Pass discount calculation

### 🐛 Bug Fixes
- **map**: resolve marker positioning on mobile devices
- **search**: fix autocomplete not showing results
- **fare**: correct off-peak hour calculation

### ⚡ Performance Improvements
- **map**: optimize marker rendering for large datasets
- **search**: improve autocomplete response time
- **bundle**: reduce initial bundle size by 15%

### 📚 Documentation
- **readme**: update installation instructions
- **api**: add comprehensive API documentation
- **contributing**: add development guidelines
```

## 🔄 Workflow

### 1. Development

```bash
# Make changes
git add .
git commit -m "feat(station): add new feature"
git push origin main
```

### 2. Automatic Release

1. GitHub Actions detects push to `main`
2. Runs tests and validation
3. Analyzes commit messages
4. Determines release type
5. Updates version in `package.json`
6. Generates changelog
7. Creates git tag
8. Publishes GitHub release
9. Updates repository

### 3. Manual Release

```bash
# For emergency releases
bun run release patch --debug

# For major version bumps
bun run release major
```

## 🛠️ Troubleshooting

### Common Issues

1. **Commit Message Validation Fails**

   ```bash
   # Check commit message format
   npx commitlint --edit $1
   
   # Fix commit message
   git commit --amend -m "feat(scope): correct message format"
   ```

2. **Release Fails in CI**

   ```bash
   # Check logs
   bun run semantic-release:debug
   
   # Validate configuration
   bun run validate:config
   ```

3. **Dry Run Issues**

   ```bash
   # Test release process
   bun run semantic-release:dry-run
   
   # Check what would be released
   bun run semantic-release:debug
   ```

### Debug Commands

```bash
# Debug semantic-release
DEBUG=semantic-release:* bun run semantic-release

# Check commit analysis
bun run semantic-release:dry-run

# Validate configuration
bun run validate:config
```

## 🔐 Security

### Required Secrets

- `GITHUB_TOKEN`: GitHub API access
- `NPM_TOKEN`: NPM publishing (if applicable)

### Branch Protection

- `main` branch requires:
  - Status checks to pass
  - Up-to-date branches
  - Linear history
  - No force pushes

## 📊 Monitoring

### Release Metrics

- Release frequency
- Time to release
- Success rate
- Rollback frequency

### Quality Gates

- All tests must pass
- TypeScript compilation must succeed
- Linting must pass
- Security audit must pass
- Performance budgets must be met

## 🎯 Best Practices

### Commit Messages

1. **Use conventional commits format**
2. **Be descriptive but concise**
3. **Include scope when relevant**
4. **Use present tense**
5. **Reference issues when applicable**

### Release Management

1. **Test with dry runs first**
2. **Use feature flags for large changes**
3. **Monitor release metrics**
4. **Keep releases frequent and small**
5. **Document breaking changes clearly**

### CI/CD Integration

1. **Run all quality checks**
2. **Test in multiple environments**
3. **Use proper secrets management**
4. **Monitor release pipeline**
5. **Have rollback procedures**

## 📚 Resources

- [Semantic Release Documentation](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://conventionalcommits.org/)
- [Commitlint Documentation](https://commitlint.js.org/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Last Updated**: 2025-09-29  
**Version**: 1.0.0  
**Maintainer**: Tashfiqul Islam
