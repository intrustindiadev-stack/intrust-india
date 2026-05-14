# Shopping Pill Routing Design

## Overview
Connect the routing of the "Shopping" service pill on the home page directly to the Online Store `/shop`.

## Proposed Changes
- **File**: `components/home/HeroSection.jsx`
- **Change**: Update the `prelinks` array item for 'Shopping'.
  - Change `href` from `'/coming-soon'` to `'/shop'`
  - Remove `comingSoon: true` property.

## Verification
- Load the home page (`/`)
- Click the "Shopping" pill
- Verify that it routes to `/shop` instead of `/coming-soon`
