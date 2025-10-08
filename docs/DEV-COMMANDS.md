# 🚀 Metro Station Finder - Developer Commands

A comprehensive guide to development commands for the Metro Station Finder project - a passion project for helping commuters navigate Dhaka's metro system.

This documentation provides all the commands needed to develop, test, build, and deploy the Metro Station Finder application. The project uses modern tooling and follows best practices for optimal development experience.

## Quick Start Commands

```bash
# Start development (with all optimizations)
bun run quick

# Fix all code issues
bun run fix

# Prepare for commit
bun run ready

# Emergency reset
bun run fresh

# Update package manager version
bun run update-package-manager
```

## Essential Development

```bash
# Development
bun run dev              # Start dev server with Turbopack
bun run dev:debug        # Start with debugging
bun run build            # Build for production
bun run build:analyze    # Build with bundle analysis
bun run start            # Start production server

# Code Quality
bun run lint             # Check code quality with Ultracite
bun run format           # Fix and format code
bun run type-check       # TypeScript type checking
bun run type-check:scripts # TypeScript for scripts

# UI Components (shadcn/ui)
bun run ui:add <component>  # Add a shadcn/ui component
bun run ui:init             # Reinitialize shadcn/ui

# Testing
bun run test             # Run tests with Vitest
bun run test:run         # Run tests headless
bun run test:coverage    # Run with coverage
bun run test:ui          # Run tests with UI
bun run e2e              # Run E2E tests with Playwright
bun run e2e:ui           # Run E2E tests with UI

# Analysis
bun run analyze          # Bundle analysis
bun run perf:lighthouse  # Performance audit
bun run health           # Project health check
```

## Advanced Tools

```bash
# Development Tools
bun run dev-tools dev:full        # Full dev environment
bun run dev-tools quality:check   # Complete quality check
bun run dev-tools perf:quick      # Quick performance check
bun run dev-tools git:ready       # Prepare for commit

# Dependencies
bun run deps:update             # Update dependencies
bun run deps:audit              # Security audit
bun run deps:check              # Check outdated packages

# Release Management
bun run release                 # Semantic release
bun run release:dry-run        # Test release process
bun run release:beta           # Beta release
bun run release:alpha          # Alpha release
bun run release:manual         # Manual release
bun run release:patch          # Patch release
bun run release:minor          # Minor release
bun run release:major          # Major release

# Git Hooks
bun run hooks:install           # Install Lefthook hooks
bun run precommit               # Pre-commit checks
bun run prepush                # Pre-push checks

# Project Management
bun run setup                   # Setup development environment
bun run clean                   # Clean build artifacts
bun run clean:all              # Clean everything including node_modules
bun run validate               # Validate project configuration
bun run health                 # Project health check
```

## VS Code Integration

- **Extensions**: Auto-installed via `.vscode/extensions.json`
- **Debugging**: Pre-configured launch configurations
- **Formatting**: Auto-format on save with Ultracite
- **TypeScript**: Full IntelliSense and error checking

## Git Hooks (Lefthook)

The project uses Lefthook for automated Git hooks that ensure code quality:

- **Pre-commit**: Type checking, linting, formatting, tests, dependency check, package manager update
- **Pre-push**: Full validation, E2E tests, build verification, bundle analysis (on main branches)
- **Commit-msg**: Conventional commit validation with metro app specific types
- **Post-merge**: Install dependencies, update package manager, health check
- **Post-checkout**: Install dependencies, update package manager, health check

## Performance Features

The project is optimized for performance with modern tooling:

- **Turbopack**: Lightning-fast bundling with Next.js 15
- **TypeScript**: Strict mode with latest features
- **Ultracite**: AI-ready linting and formatting
- **Bundle Analysis**: Built-in bundle size monitoring with webpack-bundle-analyzer
- **Core Web Vitals**: Performance tracking
- **Bunfig.toml**: Optimized Bun configuration for development and testing
- **Playwright**: Cross-browser E2E testing with mobile device simulation

## Configuration Files

The project uses several configuration files for optimal development experience:

- **Next.js**: `next.config.ts` - Optimized for static export with image optimization
- **TypeScript**: `tsconfig.json` - Strict configuration with path aliases
- **Vitest**: `vitest.config.ts` - Modern testing with coverage and parallel execution
- **Playwright**: `playwright.config.ts` - Cross-browser testing with accessibility and performance projects
- **Commitlint**: `commitlint.config.mjs` - Conventional commits with metro app specific types
- **Lefthook**: `lefthook.yml` - Git hooks with comprehensive validation
- **Bun**: `bunfig.toml` - Optimized Bun configuration
- **Semantic Release**: `.releaserc.json` - Automated versioning and changelog generation

## Best Practices

The project follows modern development best practices:

- ✅ **Node.js 24+** - Latest stable runtime
- ✅ **Bun** - Ultra-fast package manager with automatic version updates
- ✅ **Next.js 15** - Latest React framework with Turbopack
- ✅ **TypeScript 5.9** - Strictest type checking
- ✅ **Ultracite** - AI-ready code quality
- ✅ **Lefthook** - Fast Git hooks with comprehensive validation
- ✅ **Vitest** - Modern testing framework with coverage
- ✅ **Playwright** - Reliable E2E testing with mobile simulation
- ✅ **Semantic Release** - Automated versioning and changelog generation
- ✅ **Conventional Commits** - Structured commit messages with metro app types

---

**Last Updated**: 2025-10-08  
**Version**: 1.0.0  
**Maintainer**: Tashfiqul Islam ([@tashfiqul-islam](https://github.com/tashfiqul-islam))  
**Project**: Metro Station Finder - A passion project for Dhaka's commuters
