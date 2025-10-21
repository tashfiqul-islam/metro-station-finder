# Service Worker (TypeScript)

This project uses a TypeScript-based service worker for better type safety and development experience.

## Architecture

### Source Files

- **`public/sw.ts`** - TypeScript source code for the service worker
- **`public/sw.js`** - Compiled JavaScript output (auto-generated)
- **`scripts/build-sw.mjs`** - Build script for compiling TypeScript to JavaScript

### Registration

- **`components/providers/service-worker-provider.tsx`** - React component that handles service worker registration
- Automatically registered in production
- Can be enabled in development with `NEXT_PUBLIC_ENABLE_SW=true`

## Development Workflow

### 1. Development Mode

```bash
# Service worker is disabled by default in development
bun run dev

# Enable service worker in development
NEXT_PUBLIC_ENABLE_SW=true bun run dev
```

### 2. Building Service Worker

```bash
# Build for production (minified)
bun run build:sw

# Build for development (with sourcemaps)
bun run build:sw:dev
```

### 3. Full Build Process

```bash
# Builds service worker + Next.js app
bun run build
```

## Features

### Caching Strategies

- **Precache**: Core app shell and static assets
- **Cache First**: Static assets (JS, CSS, images, fonts)
- **Network First**: API calls and dynamic content
- **Stale While Revalidate**: Google Maps resources

### Offline Support

- Graceful fallback to `/offline.html`
- Automatic cache cleanup on updates
- Versioned caches for safe updates

### Type Safety

- Full TypeScript support with proper types
- Service Worker API types included
- Compile-time error checking

## Configuration

### Environment Variables

- `NEXT_PUBLIC_ENABLE_SW=true` - Enable service worker in development
- `NODE_ENV=production` - Automatically enables service worker

### Cache Configuration

```typescript
const CACHE_VERSION = "v1-2025-10-15";
const PRECACHE_NAME = `msf-precache-${CACHE_VERSION}`;
const RUNTIME_NAME = `msf-runtime-${CACHE_VERSION}`;
```

## File Structure

```text
public/
├── sw.ts          # TypeScript source
├── sw.js          # Compiled output (auto-generated)
└── offline.html   # Offline fallback page

scripts/
└── build-sw.mjs   # Build script

components/providers/
└── service-worker-provider.tsx  # Registration component
```

## Best Practices

### 1. Always Edit TypeScript Source

- Never edit `public/sw.js` directly
- All changes should be made in `public/sw.ts`
- The JavaScript file is auto-generated

### 2. Testing Service Worker

- Use browser DevTools > Application > Service Workers
- Test offline functionality by disabling network
- Verify cache behavior in DevTools > Application > Storage

### 3. Deployment

- Service worker is automatically built during `bun run build`
- Ensure `public/sw.js` is included in deployment
- Test service worker functionality after deployment

## Troubleshooting

### Service Worker Not Registering

1. Check browser console for errors
2. Verify `public/sw.js` exists and is accessible
3. Check if service worker is enabled in development

### Cache Issues

1. Clear browser cache and service worker storage
2. Increment `CACHE_VERSION` to force cache refresh
3. Check cache names in DevTools

### TypeScript Errors

1. Run `bun run type-check` to verify types
2. Ensure all Service Worker APIs are properly typed
3. Check for missing dependencies in build script

## Performance

- **Minified Size**: ~2.1 KB (production)
- **Development Size**: ~3.5 KB (with sourcemaps)
- **Cache Limit**: 40 entries for Google Maps, 60 for general runtime
- **Update Strategy**: Automatic cleanup of old caches
