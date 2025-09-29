# 🚀 Metro Station Finder - Developer Commands

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
```

## Essential Development

```bash
# Development
bun run dev              # Start dev server with Turbopack
bun run dev:debug        # Start with debugging
bun run dev:profile      # Start with profiling

# Code Quality
bun run lint             # Check code quality
bun run format           # Fix and format code
bun run type-check       # TypeScript type checking

# UI Components (shadcn/ui)
bun run ui:add <component>  # Add a shadcn/ui component
bun run ui:diff             # Check for component updates
bun run ui:init             # Reinitialize shadcn/ui

# Testing
bun run test             # Run tests with UI
bun run test:run         # Run tests headless
bun run test:coverage    # Run with coverage
bun run e2e              # Run E2E tests

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

# Monitoring
bun run monitor:performance       # Performance monitoring
bun run monitor:memory           # Memory usage
bun run monitor:network          # Network monitoring

# Project Management
bun run setup:dev                # Setup development environment
bun run reset                    # Reset project completely
bun run clean                    # Clean build artifacts
```

## VS Code Integration

- **Extensions**: Auto-installed via `.vscode/extensions.json`
- **Debugging**: Pre-configured launch configurations
- **Formatting**: Auto-format on save with Ultracite
- **TypeScript**: Full IntelliSense and error checking

## Git Hooks (Lefthook)

- **Pre-commit**: Type checking, linting, formatting, tests
- **Pre-push**: Full validation, E2E tests, build verification
- **Commit-msg**: Conventional commit validation

## Performance Features

- **Turbopack**: Lightning-fast bundling
- **TypeScript**: Strict mode with latest features
- **Ultracite**: AI-ready linting and formatting
- **Bundle Analysis**: Built-in bundle size monitoring
- **Core Web Vitals**: Performance tracking

## 2025 Best Practices

- ✅ **Node.js 24+** - Latest stable runtime
- ✅ **Bun** - Ultra-fast package manager
- ✅ **Next.js 15** - Latest React framework
- ✅ **TypeScript 5.9** - Strictest type checking
- ✅ **Ultracite** - AI-ready code quality
- ✅ **Lefthook** - Fast Git hooks
- ✅ **Vitest** - Modern testing framework
- ✅ **Playwright** - Reliable E2E testing
