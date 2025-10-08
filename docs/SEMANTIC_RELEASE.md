# 🚀 Semantic Release Documentation

This document describes the semantic-release setup for the Metro Station Finder project - a passion project for helping commuters navigate Dhaka's metro system with automated versioning, changelog generation, and release management.

## 📋 Overview

The semantic-release workflow provides:

- **Automated Versioning**: Based on conventional commits with metro app specific types
- **Beautiful Release Notes**: Categorized and formatted changelog
- **GitHub Integration**: Automatic releases and issue linking
- **CI/CD Integration**: Seamless GitHub Actions workflow
- **Manual Release Support**: For emergency releases
- **Dry Run Testing**: Safe testing of release process
- **Multi-Branch Strategy**: Support for main, beta, and alpha releases

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

- `.releaserc.json` - Main semantic-release configuration with multi-branch support
- `commitlint.config.mjs` - Commit message validation rules with metro app specific types
- `.github/workflows/release.yml` - GitHub Actions workflow
- `scripts/release.mjs` - Manual release script
- `CHANGELOG.md` - Generated changelog
- `lefthook.yml` - Git hooks integration for commit validation

## 🔧 Configuration

### Semantic Release Configuration

```json
{
  "branches": [
    "master",
    { "name": "beta", "prerelease": true },
    { "name": "alpha", "prerelease": "alpha" }
  ],
  "plugins": [
    ["@semantic-release/commit-analyzer", {
      "preset": "conventionalcommits",
      "releaseRules": [
        { "type": "feat", "release": "minor" },
        { "type": "fix", "release": "patch" },
        { "type": "perf", "release": "patch" },
        { "type": "docs", "release": "patch" },
        { "type": "style", "release": "patch" },
        { "type": "refactor", "release": "patch" },
        { "type": "test", "release": "patch" },
        { "type": "build", "release": "patch" },
        { "type": "ci", "release": "patch" },
        { "type": "chore", "release": "patch" },
        { "type": "revert", "release": "patch" },
        { "breaking": true, "release": "major" }
      ]
    }],
    ["@semantic-release/release-notes-generator", {
      "preset": "conventionalcommits",
      "presetConfig": {
        "types": [
          { "type": "feat", "section": "Features" },
          { "type": "fix", "section": "Bug Fixes" },
          { "type": "perf", "section": "Performance Improvements" },
          { "type": "docs", "section": "Documentation" },
          { "type": "style", "section": "Styles" },
          { "type": "refactor", "section": "Code Refactoring" },
          { "type": "test", "section": "Tests" },
          { "type": "build", "section": "Build System" },
          { "type": "ci", "section": "Continuous Integration" },
          { "type": "chore", "section": "Miscellaneous" },
          { "type": "revert", "section": "Reverts" }
        ]
      }
    }],
    ["@semantic-release/changelog", {
      "changelogFile": "CHANGELOG.md"
    }],
    ["@semantic-release/git", {
      "assets": ["package.json", "package-lock.json", "bun.lock", "CHANGELOG.md"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    ["@semantic-release/github", {
      "successComment": "🎉 This issue has been resolved in version ${nextRelease.version} :tada:\n\nThe release is available on:\n- [GitHub release](https://github.com/${context.repository}/releases/tag/${nextRelease.gitTag})\n- [npm package](https://www.npmjs.com/package/${context.repository})\n\nYour **[semantic-release](https://github.com/semantic-release/semantic-release)** bot :package::rocket:",
      "releasedLabels": {
        "repository": "${context.repository}"
      },
      "addReleases": "bottom"
    }]
  ],
  "tagFormat": "v${version}",
  "repositoryUrl": "https://github.com/tashfiqul-islam/metro-station-finder.git"
}
```

### Commit Message Rules

The commitlint configuration enforces:

- **Type**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, `accessibility`, `maps`, `navigation`, `offline`, `pwa`
- **Scope**: Optional, lowercase, max 30 characters, metro app specific scopes
- **Subject**: Lowercase, 10-50 characters, no period
- **Body**: Optional, max 72 characters per line
- **Footer**: Optional, for breaking changes and issue references
- **Validation**: Automatic validation via Lefthook Git hooks

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

- **Push to `master`**: Creates a new release
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
git commit -m "feat(stations): add real-time arrival times"

# Bug fix (patch release)
git commit -m "fix(maps): resolve marker positioning issue"

# Metro app specific types
git commit -m "accessibility(ui): add screen reader support"
git commit -m "maps(geolocation): improve location accuracy"
git commit -m "offline(stations): add offline station data"
git commit -m "pwa(manifest): add app installation prompt"

# Breaking change (major release)
git commit -m "feat(api): redesign station data structure

BREAKING CHANGE: Station interface has been completely redesigned.
The `coordinates` field is now `location` and uses a different format."

# Documentation (patch release)
git commit -m "docs(readme): update installation instructions"

# Performance improvement (patch release)
git commit -m "perf(maps): optimize marker rendering for large datasets"

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

### Development Branch Strategy

The Metro Station Finder project uses a standalone development branch strategy:

- **`001-metro-station-finder`**: Development branch (no releases)
- **`master`**: Production branch (triggers releases)
- **`beta`**: Beta testing branch (prereleases)
- **`alpha`**: Alpha testing branch (prereleases)

### 1. Development on Feature Branch

```bash
# Work on development branch (no releases triggered)
git checkout 001-metro-station-finder
git add .
git commit -m "feat(stations): add new metro station data"
git push origin 001-metro-station-finder
```

### 2. Release Process

#### For v1.0.0 Initial Release

```bash
# When v1.0.0 is ready, create pull request from development branch
# After PR is merged to master, release is automatically triggered
```

#### For Future Releases

```bash
# Any commits merged to master will trigger releases based on commit messages
# feat: → minor version bump
# fix: → patch version bump
# BREAKING CHANGE: → major version bump
```

### 3. Creating Pull Request from Standalone Branch

Since your `001-metro-station-finder` branch is standalone (not based on master), you'll need to:

```bash
# Option 1: Create a new branch from master and merge your changes
git checkout master
git pull origin master
git checkout -b feature/merge-development-branch
git merge 001-metro-station-finder --allow-unrelated-histories
git push origin feature/merge-development-branch
# Then create PR: feature/merge-development-branch → master

# Option 2: Force push your branch to master (if you want to replace master completely)
git checkout 001-metro-station-finder
git push origin 001-metro-station-finder:master --force
```

### 4. Manual Release (Emergency)

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

## 🎯 Metro Station Finder - Release Workflow

### Project Development Strategy

This project uses a **standalone development branch strategy** for building a comprehensive metro station finder:

- **`001-metro-station-finder`**: Active development branch (standalone, not based on master)
- **`master`**: Production branch (currently contains legacy Next.js 14 app)
- **Goal**: Merge development work to master for v1.0.0 release

### Development Workflow

#### Phase 1: Active Development

```bash
# Continue working on the development branch
git checkout 001-metro-station-finder

# Make commits with proper conventional commit format
git commit -m "feat(stations): add new metro station data"
git commit -m "fix(maps): resolve marker positioning issue"
git commit -m "accessibility(ui): add screen reader support"

# Push to development branch (no releases triggered)
git push origin 001-metro-station-finder
```

#### Phase 2: v1.0.0 Release Preparation

When ready for v1.0.0, there are two approaches:

#### Option A: Create Pull Request (Recommended)

```bash
# Create a new branch from master
git checkout master
git pull origin master
git checkout -b feature/v1.0.0-release

# Merge the development work
git merge 001-metro-station-finder --allow-unrelated-histories
# Resolve any conflicts if they occur

# Push and create PR
git push origin feature/v1.0.0-release
# Create PR: feature/v1.0.0-release → master
```

#### Option B: Direct Merge (Replace master completely)

```bash
# Force push the development branch to master
git checkout 001-metro-station-finder
git push origin 001-metro-station-finder:master --force
```

#### Phase 3: Automatic Release

Once merged to master:

1. **Semantic Release** automatically analyzes all commits
2. **Determines version** based on commit types (feat = minor, fix = patch, etc.)
3. **Generates CHANGELOG.md** from all commit messages
4. **Creates GitHub release** with release notes
5. **Updates package.json** version

#### Phase 4: Future Releases

After v1.0.0:

```bash
# Any future commits merged to master will trigger new releases
git checkout master
git commit -m "feat(maps): add new feature"  # → v1.1.0
git commit -m "fix(ui): resolve bug"         # → v1.1.1
git commit -m "feat(api): BREAKING CHANGE"   # → v2.0.0
```

### Commit Message Strategy

For the current development work, use these commit types:

```bash
# Features (will create minor releases)
git commit -m "feat(stations): add real-time arrival times"
git commit -m "feat(maps): implement custom markers"

# Bug fixes (will create patch releases)
git commit -m "fix(geolocation): resolve location accuracy"
git commit -m "fix(ui): correct mobile layout issues"

# Metro app specific types
git commit -m "accessibility(ui): add screen reader support"
git commit -m "maps(geolocation): improve location services"
git commit -m "offline(stations): add offline data caching"
git commit -m "pwa(manifest): add app installation prompt"

# Documentation
git commit -m "docs(readme): update installation guide"

# Performance improvements
git commit -m "perf(maps): optimize marker rendering"

# Code refactoring
git commit -m "refactor(utils): extract distance calculation"
```

### Expected Release Notes for v1.0.0

When merged to master, semantic-release will generate something like:

```markdown
## [1.0.0](https://github.com/tashfiqul-islam/metro-station-finder/compare/v0.0.0...v1.0.0) (2025-01-15)

### 🚀 Features
- **stations**: add real-time arrival times
- **maps**: implement custom marker clustering
- **accessibility**: add screen reader support
- **offline**: add offline data caching
- **pwa**: add app installation prompt

### 🐛 Bug Fixes
- **maps**: resolve marker positioning on mobile
- **geolocation**: improve location accuracy
- **ui**: fix mobile layout issues

### ⚡ Performance Improvements
- **maps**: optimize marker rendering
- **bundle**: reduce initial bundle size

### 📚 Documentation
- **readme**: update installation guide
- **api**: add comprehensive documentation
```

## 📚 Resources

- [Semantic Release Documentation](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://conventionalcommits.org/)
- [Commitlint Documentation](https://commitlint.js.org/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Last Updated**: 2025-10-08  
**Version**: 1.0.0  
**Maintainer**: Tashfiqul Islam ([@tashfiqul-islam](https://github.com/tashfiqul-islam))  
**Project**: Metro Station Finder - A passion project for Dhaka's commuters
