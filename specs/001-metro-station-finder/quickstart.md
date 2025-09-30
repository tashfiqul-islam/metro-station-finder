# Quickstart Guide: Metro Station Finder Phase 1 MVP

**Date**: 2025-09-27  
**Feature**: Metro Station Finder Phase 1 MVP  
**Branch**: `001-metro-station-finder`

## Overview

This quickstart guide provides step-by-step instructions to validate the Metro Station Finder application functionality. Follow these steps to ensure all features work correctly.

### Using hooks

- Station search:
  - Use `useStationSearch` to get filtered stations from local static data.
- Nearest station:
  - Use `useNearestStation` to compute nearest station from current coordinates.
- Map availability:
  - Use `useMapAvailability` to decide between map vs list fallback (env/key/quota-aware).

## Prerequisites

- Modern web browser (Chrome, Safari, Firefox, Edge)
- Internet connection for map functionality
- Location services enabled (optional)

## Setup Instructions

### 1. Environment Setup

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Add your Google Maps API key to .env.local

# Start development server
bun dev
```

### 2. Google Maps API Configuration

**Required APIs**:

- Google Places API (for destination autocomplete)
- Google Maps JavaScript API (for interactive map)
- Google Geocoding API (for address conversion)

**API Key Setup**:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the required APIs
4. Create credentials (API Key)
5. Restrict the API key:
   - HTTP referrer restrictions: `localhost:3000/*`, `yourdomain.com/*`
   - API restrictions: Places API, Maps JavaScript API, Geocoding API
6. Add to `.env.local`:

   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

**Quota Monitoring**:

- Places API: 1,000 requests/day (free tier)
- Maps JavaScript API: 28,000 map loads/day (free tier)
- Geocoding API: 40,000 requests/day (free tier)
- Rate limiting: 10 requests/minute per user

### 3. Access Application

Open browser and navigate to: `http://localhost:3000`

## Feature Validation Steps

### Test 1: Homepage Load

**Objective**: Verify homepage loads correctly with all components

**Steps**:

1. Open `http://localhost:3000`
2. Verify page loads within 2 seconds
3. Check for:
   - Search input field
   - "Use Current Location" button
   - Featured stations section
   - Quick fare check section
   - Service information

**Expected Result**: Page loads quickly with all UI elements visible

**Success Criteria**:

- LCP < 2.0s
- No console errors
- All interactive elements visible

### Test 2: Destination Search with Google Places Autocomplete

**Objective**: Test destination search with Google Places autocomplete

**Steps**:

1. Click on destination search input field
2. Type "Novo Theatre" (minimum 3 characters)
3. Verify Google Places autocomplete suggestions appear
4. Select "Novo Theatre, Dhanmondi, Dhaka" from suggestions
5. Verify map updates with destination and nearest station

**Expected Result**: Google Places autocomplete shows address suggestions, map displays destination (PIN A) and nearest metro station (PIN B)

**Success Criteria**:

- Google Places autocomplete works with 3+ characters
- Address suggestions are relevant and accurate
- Map shows destination and nearest station with proper pins
- Distance and walking time are calculated correctly

### Test 3: Current Location Search

**Objective**: Test geolocation functionality

**Steps**:

1. Click "Use Current Location" button
2. Allow location permission when prompted
3. Verify nearest station is found and displayed
4. Check map shows user location and nearest station

**Expected Result**: System finds nearest station using current location

**Success Criteria**:

- Geolocation permission requested
- Nearest station found within 5km
- Map displays user location and station
- Distance and walking time calculated

### Test 4: Fare Calculator with Station Autocomplete

**Objective**: Test fare calculation with station selection dropdowns

**Steps**:

1. Navigate to fare calculator page
2. Click on origin station dropdown
3. Type "uttara" in the origin field
4. Verify local station autocomplete suggestions appear
5. Select "Uttara North" from suggestions
6. Repeat for destination station (e.g., "Motijheel")
7. Verify fare amount and travel time display

**Expected Result**: Station dropdowns show local autocomplete, fare calculation is accurate

**Success Criteria**:

- Station autocomplete works with local data only
- Fare amount matches expected value
- Travel time calculated correctly
- No external API calls for station selection

### Test 5: Map Functionality

**Objective**: Test interactive map features

**Steps**:

1. Perform a station search
2. Verify map loads and displays:
   - User location (if available)
   - Nearest station
   - Route between locations
3. Test map interactions:
   - Pan and zoom
   - Click on station markers
   - Toggle between light/dark themes

**Expected Result**: Map loads and functions correctly

**Success Criteria**:

- Map loads within 3 seconds
- All interactions work smoothly
- Theme switching works
- Station markers clickable

### Test 6: API Quota Management

**Objective**: Test API quota management and rate limiting

**Steps**:

1. Open browser developer tools
2. Perform multiple rapid searches (10+ in 1 minute)
3. Verify rate limiting kicks in after 10 requests
4. Wait for rate limit reset (1 minute)
5. Verify autocomplete resumes working
6. Test quota status display in UI

**Expected Result**: Rate limiting prevents abuse, quota status is visible

**Success Criteria**:

- Rate limiting activates after 10 requests/minute
- User sees appropriate error messages
- Manual input fallback works when rate limited
- Quota status is displayed to users

### Test 7: Mobile Responsiveness

**Objective**: Test mobile interface

**Steps**:

1. Open browser developer tools
2. Set device to mobile view (320px width)
3. Test all features on mobile:
   - Search functionality
   - Map interactions
   - Navigation
   - Touch targets

**Expected Result**: All features work on mobile

**Success Criteria**:

- Touch targets ≥ 44px
- No horizontal scroll
- All features accessible
- Responsive layout

### Test 8: Accessibility

**Objective**: Test accessibility features

**Steps**:

1. Navigate using only keyboard (Tab, Enter, Arrow keys)
2. Test with screen reader (if available)
3. Verify:
   - All interactive elements reachable
   - Focus indicators visible
   - ARIA labels present
   - Color contrast adequate

**Expected Result**: Full keyboard and screen reader support

**Success Criteria**:

- All features keyboard accessible
- Focus indicators visible
- Screen reader compatible
- WCAG 2.2 AA compliance

### Test 9: Error Handling

**Objective**: Test error scenarios

**Steps**:

1. Test geolocation denial:
   - Click "Use Current Location"
   - Deny permission
   - Verify fallback to manual input
2. Test invalid search:
   - Search for "xyz123" (no results)
   - Verify appropriate error message
3. Test network issues:
   - Disable network
   - Verify graceful degradation
4. Test quota exceeded:
   - Rapidly search 10+ times
   - Verify rate limiting message
   - Test manual input fallback

**Expected Result**: Appropriate error messages and fallbacks

**Success Criteria**:

- Clear error messages
- Graceful fallbacks
- No crashes or broken UI
- User guidance provided
- Rate limiting works correctly

### Test 10: Performance

**Objective**: Verify performance targets

**Steps**:

1. Open browser developer tools
2. Go to Performance tab
3. Record page load and interactions
4. Check Core Web Vitals:
   - LCP (Largest Contentful Paint)
   - INP (Interaction to Next Paint)
   - CLS (Cumulative Layout Shift)

**Expected Result**: Meets performance targets

**Success Criteria**:

- LCP < 2.0s
- INP < 200ms
- CLS < 0.10
- Lighthouse Performance ≥ 90

### Test 11: Theme Switching

**Objective**: Test light/dark theme functionality

**Steps**:

1. Locate theme toggle button
2. Switch between light and dark themes
3. Verify:
   - All UI elements update
   - Map style changes
   - Text remains readable
   - Icons and images adapt

**Expected Result**: Smooth theme switching

**Success Criteria**:

- Theme switch completes within 200ms
- All elements update correctly
- Map style changes appropriately
- No visual glitches

### Test 12: Privacy & Diagnostics

**Objective**: Test privacy features and diagnostics toggle

**Steps**:

1. Test geolocation consent:
   - Click "Use Current Location"
   - Verify privacy message appears
   - Check "We only use your location once" message
2. Test diagnostics toggle:
   - Go to Settings/About page
   - Toggle "Diagnostics off"
   - Verify search history is cleared
   - Test search doesn't add to history
3. Test Do Not Track:
   - Enable DNT in browser
   - Refresh page
   - Verify diagnostics auto-off

**Expected Result**: Privacy features work correctly

**Success Criteria**:

- Privacy message displayed before geolocation
- Diagnostics toggle works correctly
- DNT detection works
- Search history respects privacy settings

### Test 13: Copy Deck & Error Messages

**Objective**: Test canonical error messages and copy deck

**Steps**:

1. Test error messages:
   - Search for invalid location
   - Deny geolocation
   - Test with no network
2. Verify error messages match copy deck:
   - "No stations found nearby. Try a different location or landmark."
   - "We only use your location once to find nearby stations. We don't store it."
   - "Service temporarily unavailable. Please try manual entry or station search."
3. Test CTA labels:
   - "Use Current Location"
   - "Retry Map"
   - "Shortcuts & Help"
   - "Clear History"

**Expected Result**: All messages match copy deck exactly

**Success Criteria**:

- Error messages match copy deck IDs
- CTA labels are canonical
- No custom error messages
- Consistent messaging across app

## Troubleshooting

### Common Issues

**Map not loading**:

- Check Google Maps API key in .env.local
- Verify API key has correct domain restrictions
- Check browser console for errors

**Geolocation not working**:

- Ensure location services enabled
- Check browser permissions
- Try manual location input

**Search not working**:

- Verify minimum 3 characters entered
- Check for typos in search query
- Try different station names

**Performance issues**:

- Check network connection
- Clear browser cache
- Disable browser extensions

**API quota issues**:

- Check Google Cloud Console for quota usage
- Verify API key restrictions are correct
- Check rate limiting (10 requests/minute)
- Clear browser cache to reset client-side limits
- Verify API key has correct permissions

**Rate limiting issues**:

- Wait 1 minute for rate limit reset
- Check browser console for rate limit messages
- Use manual input when autocomplete is disabled
- Verify quota status in UI

### Debug Information

**Console Commands**:

```javascript
// Check if app is loaded
window.metroStationFinder

// Check station data
window.stationData

// Check fare data
window.fareData

// Check geolocation status
navigator.geolocation

// Check API quota status
window.metroStationFinder?.getQuotaStatus()

// Check if autocomplete is available
window.metroStationFinder?.isAutocompleteAvailable()

// Check rate limiting status
window.metroStationFinder?.getRateLimitStatus()

// Check cached responses
localStorage.getItem('metro-autocomplete-cache')
```

## Success Criteria Summary

- [ ] All 13 test scenarios pass
- [ ] Performance targets met (LCP < 2.0s, INP < 200ms, CLS < 0.10)
- [ ] Accessibility requirements satisfied (WCAG 2.2 AA)
- [ ] Mobile responsiveness confirmed (320px+ width)
- [ ] Error handling works correctly with proper fallbacks
- [ ] Theme switching functions properly (≤200ms)
- [ ] API quota management works (rate limiting, graceful degradation)
- [ ] Privacy features work correctly (DNT, diagnostics toggle)
- [ ] Copy deck compliance verified (canonical messages)
- [ ] Google Places autocomplete works for destination search
- [ ] Local station autocomplete works for fare calculator
- [ ] Map functionality works with proper pins and interactions

## Next Steps

After completing all tests successfully:

1. Document any issues found
2. Update test cases if needed
3. Proceed to implementation tasks
4. Set up CI/CD pipeline
5. Deploy to production

## Support

For issues or questions:

- Check browser console for errors
- Review application logs
- Consult documentation
- Contact development team
