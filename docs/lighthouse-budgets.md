# Lighthouse Performance Budgets

This document outlines the performance budgets configured for the Metro Station Finder application using Lighthouse CI.

## Overview

Performance budgets are thresholds that help maintain optimal website performance by setting limits on various metrics. When these limits are exceeded, it indicates potential performance regressions that need attention.

## Budget Configuration

### Global Budgets (All Pages)

**Resource Size Limits (in KB):**

- **Total**: 2,500 KB - Maximum total page size
- **Scripts**: 800 KB - JavaScript bundle size limit
- **Stylesheets**: 200 KB - CSS bundle size limit
- **Images**: 1,000 KB - Total image assets
- **Fonts**: 100 KB - Web font files
- **Document**: 50 KB - HTML document size
- **Media**: 500 KB - Video/audio content
- **Other**: 200 KB - Miscellaneous resources

**Resource Count Limits:**

- **Total**: 100 requests - Maximum total HTTP requests
- **Scripts**: 20 requests - JavaScript files
- **Stylesheets**: 5 requests - CSS files
- **Images**: 30 requests - Image assets
- **Fonts**: 5 requests - Font files
- **Document**: 1 request - HTML document
- **Media**: 10 requests - Video/audio files
- **Third-party**: 15 requests - External services
- **Other**: 20 requests - Miscellaneous resources

**Performance Timing Limits (in ms):**

- **First Contentful Paint (FCP)**: 1,800 ms
- **Largest Contentful Paint (LCP)**: 2,500 ms
- **Speed Index**: 3,000 ms
- **Time to Interactive (TTI)**: 4,000 ms
- **Total Blocking Time (TBT)**: 200 ms
- **Cumulative Layout Shift (CLS)**: 0.1
- **Max Potential FID**: 100 ms
- **First Meaningful Paint (FMP)**: 2,000 ms
- **Estimated Input Latency**: 50 ms

### Page-Specific Budgets

#### Station Finder Page (`/station-finder`)

- **Total Size**: 3,000 KB (increased for map functionality)
- **Scripts**: 1,000 KB (Google Maps API)
- **Images**: 1,200 KB (map tiles and station images)
- **Total Requests**: 120
- **Third-party**: 20 (Google Maps, analytics)
- **FCP**: 2,000 ms
- **LCP**: 3,000 ms
- **TTI**: 5,000 ms

#### Fare Calculator Page (`/fare-calculator`)

- **Total Size**: 2,800 KB
- **Scripts**: 900 KB
- **Images**: 1,000 KB
- **Total Requests**: 110
- **Third-party**: 18
- **FCP**: 1,900 ms
- **LCP**: 2,800 ms
- **TTI**: 4,500 ms

#### About Page (`/about`)

- **Total Size**: 2,000 KB (lightweight content)
- **Scripts**: 600 KB
- **Images**: 800 KB
- **Total Requests**: 80
- **Third-party**: 10
- **FCP**: 1,500 ms
- **LCP**: 2,200 ms
- **TTI**: 3,500 ms

## 2025 Performance Standards

These budgets are based on the latest 2025 performance standards and Core Web Vitals:

### Core Web Vitals (2025)

- **LCP (Largest Contentful Paint)**: ≤ 2.5s (Good), ≤ 4.0s (Needs Improvement)
- **FID (First Input Delay)**: ≤ 100ms (Good), ≤ 300ms (Needs Improvement)
- **CLS (Cumulative Layout Shift)**: ≤ 0.1 (Good), ≤ 0.25 (Needs Improvement)
- **INP (Interaction to Next Paint)**: ≤ 200ms (Good), ≤ 500ms (Needs Improvement)

### Additional Metrics

- **FCP (First Contentful Paint)**: ≤ 1.8s (Good)
- **TTI (Time to Interactive)**: ≤ 4.0s (Good)
- **TBT (Total Blocking Time)**: ≤ 200ms (Good)

## Implementation

### Using with Lighthouse CI

```bash
# Run Lighthouse with budgets
lighthouse https://metro-station-finder.vercel.app --budget-path=./lighthouse-budgets.json

# Run Lighthouse CI with budgets
lhci collect --url=https://metro-station-finder.vercel.app --budgetPath=./lighthouse-budgets.json
lhci assert --budgetsFile=./lighthouse-budgets.json
```

### Integration with CI/CD

The budgets are automatically enforced in the CI pipeline:

```yaml
- name: Run Lighthouse CI with Budgets
  run: |
    lhci collect --url=https://metro-station-finder.vercel.app
    lhci assert --budgetsFile=./lighthouse-budgets.json
```

## Monitoring and Alerts

### Performance Monitoring

- Budget violations are automatically detected during CI runs
- Failed builds indicate performance regressions
- Detailed reports show which metrics exceeded limits

### Optimization Strategies

1. **Bundle Optimization**
   - Code splitting for JavaScript
   - Tree shaking for unused code
   - Minification and compression

2. **Image Optimization**
   - WebP/AVIF format usage
   - Responsive images
   - Lazy loading implementation

3. **Third-party Optimization**
   - Critical resource preloading
   - Deferred non-critical scripts
   - CDN optimization

4. **Caching Strategies**
   - Service worker implementation
   - Resource caching
   - API response caching

## Maintenance

### Regular Review

- Monthly budget review based on performance trends
- Quarterly updates based on new web standards
- Annual comprehensive budget revision

### Adjustment Guidelines

- Increase budgets only when necessary for new features
- Decrease budgets when performance improvements are achieved
- Maintain consistency across similar page types

## Troubleshooting

### Common Issues

1. **Bundle Size Exceeded**: Review dependencies and implement code splitting
2. **Image Size Exceeded**: Optimize images and implement lazy loading
3. **Third-party Count Exceeded**: Audit external services and remove unused ones
4. **Timing Metrics Failed**: Optimize critical rendering path and reduce JavaScript execution time

### Performance Tools

- Lighthouse DevTools
- Chrome DevTools Performance tab
- WebPageTest.org
- GTmetrix

## References

- [Lighthouse Performance Budgets](https://web.dev/performance-budgets-101/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Next.js Performance Optimization](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
