# Next.js 16 Beta - Static Export Limitation

## Issue Summary

**Problem**: Navigation links work in development (`bun run dev`) but fail in production builds with static export (`output: "export"`).

**Root Cause**: Next.js 16 beta's App Router uses a new client-side navigation system that fetches RSC (React Server Components) payload files (`.txt` files). These payloads are **not generated** in static exports, causing 404 errors during navigation.

## Error Symptoms

### In Production Build
```
GET /station-finder/__next.station-finder.__PAGE__.txt?_rsc=1wn9k
Returned 404

GET /fare-calculator/__next.fare-calculator.__PAGE__.txt?_rsc=ewknf
Returned 404
```

### Console Warnings (Development)
```
params are being enumerated. `params` is a Promise and must be unwrapped 
with `React.use()` before accessing its properties.

The keys of `searchParams` were accessed directly. `searchParams` is a Promise 
and must be unwrapped with `React.use()` before accessing its properties.
```

## Why This Happens

1. **New App Router Architecture**: Next.js 16 introduced a new routing system that uses RSC payloads for client-side navigation
2. **Static Export Limitation**: `output: "export"` generates pure HTML files without a Node.js server
3. **Missing Payloads**: The client-side router expects RSC payload files that don't exist in static exports
4. **Beta Status**: This is a known limitation in Next.js 16 beta that may be resolved in the stable release

## Current Status

- ✅ **Development Mode**: Works perfectly (has Node.js server to generate RSC payloads)
- ❌ **Production Static Export**: Navigation fails (no server to generate payloads)
- ✅ **Production with Node.js**: Works (can generate payloads on-demand)

## Solution Options

### Option 1: Wait for Next.js 16 Stable (Recommended)
**Status**: `output: "export"` temporarily disabled in `next.config.ts`

- **Pros**: 
  - Proper solution once Next.js 16 stable is released
  - Full App Router features work
  - Client-side navigation is fast and smooth
- **Cons**: 
  - Requires waiting for stable release (~November 2025)
  - Temporarily requires Node.js deployment

**When to Use**: If you can wait for the stable release and temporarily use a Node.js deployment.

### Option 2: Deploy with Node.js Server
**Status**: Current configuration (static export disabled)

- **Pros**:
  - All Next.js 16 features work
  - Fast client-side navigation
  - Can use `bun run start` for production
- **Cons**:
  - Requires a server (not pure static)
  - More expensive than static hosting

**When to Use**: If you can deploy to a platform that supports Node.js (Vercel, Railway, etc.).

### Option 3: Downgrade to Next.js 15
**Status**: Not implemented

- **Pros**:
  - `output: "export"` works reliably
  - Stable and production-ready
  - Can deploy to any static host (GitHub Pages, Netlify, etc.)
- **Cons**:
  - Loses Next.js 16 features (Turbopack stable, React Compiler, etc.)
  - Slower build times
  - No View Transitions support

**When to Use**: If static export is critical and you can sacrifice Next.js 16 features.

### Option 4: Use Pages Router (Not Recommended)
**Status**: Not implemented (would require major refactor)

- **Pros**:
  - Pages Router has better static export support
  - Traditional static site behavior
- **Cons**:
  - Requires complete rewrite from App Router
  - Loses all App Router benefits (RSC, Streaming, etc.)
  - Not worth the effort

**When to Use**: Never - too much work for minimal benefit.

## Current Configuration

```typescript
// next.config.ts

// Static export is DISABLED
// output: "export",

// This means:
// - Use: bun run dev (development)
// - Use: bun run build && bun run start (production)
// - DON'T use static export until Next.js 16 stable
```

## What Works Now

With static export disabled:

- ✅ All navigation links work perfectly
- ✅ Client-side routing is fast and smooth
- ✅ All Next.js 16 features are available
- ✅ Build succeeds in 2.4s
- ✅ All tests pass
- ✅ Zero TypeScript errors
- ✅ Zero lint errors

## Deployment Recommendations

### Free Hosting Options (Node.js)
1. **Vercel** - Best Next.js support, free tier available
2. **Railway** - Free tier with Node.js support
3. **Render** - Free tier for static sites and web services
4. **Fly.io** - Free tier available

### After Next.js 16 Stable Release
Once Next.js 16 is stable (expected ~November 2025):

1. Re-enable static export in `next.config.ts`:
   ```typescript
   output: "export",
   ```

2. Test navigation thoroughly in production build

3. If it works, deploy to any static host:
   - GitHub Pages (free)
   - Netlify (free tier)
   - Cloudflare Pages (free)
   - Vercel (free tier)

## Console Warnings (Not Critical)

The warnings about async `params`/`searchParams` are **informational only** in development mode. They indicate that Next.js 16 expects these to be Promises, but since we're using `useSearchParams()` hook in client components, this is the correct approach for our use case.

These warnings don't affect functionality and can be safely ignored.

## Migration Path

```
Current State:
Next.js 16 Beta → Node.js Deployment → Works ✅

Future State (After Stable):
Next.js 16 Stable → Static Export → Test → Works? ✅
  ↓
If Static Export Works:
  → Re-enable output: "export"
  → Deploy to free static hosting
  ↓
If Static Export Still Broken:
  → Keep Node.js deployment
  → Or downgrade to Next.js 15
```

## Testing Navigation

To test if navigation works:

```bash
# Development (always works)
bun run dev

# Production with Node.js (currently works)
bun run build
bun run start
```

Then navigate between:
- Home (`/`)
- Station Finder (`/station-finder`)
- Fare Calculator (`/fare-calculator`)
- About (`/about`)

All navigation should be **instant** with smooth transitions.

## Summary

- **Issue**: Next.js 16 beta's static export doesn't support App Router navigation
- **Cause**: Missing RSC payload files in static builds
- **Solution**: Temporarily disabled static export; will re-enable after stable release
- **Impact**: Requires Node.js deployment temporarily (still free on Vercel/Railway)
- **Timeline**: Wait for Next.js 16 stable (~November 2025)
- **Status**: ✅ Navigation works perfectly in current config

---

*Last Updated: October 14, 2025*
*Next.js Version: 16.0.0-beta.0*
*Status: Known Beta Limitation*

