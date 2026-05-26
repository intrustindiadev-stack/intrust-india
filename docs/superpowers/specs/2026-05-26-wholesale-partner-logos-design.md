# Design Specification: Wholesale Partner Logos Replacement

This document outlines the design specification and asset plan to replace temporary mock partner logos with authentic, high-quality, transparent brand logos for the global partners marquee carousel in the wholesale shopping dashboard.

## Objective
Update the wholesale hub (`WholesaleClient.jsx`) partners carousel to display authentic official logos for **AJIO**, **NYKAA**, **TATA CLiQ**, **RELIANCE**, **AMAZON**, and **FLIPKART** to establish brand trust and premium visual aesthetics.

## Target Assets & Paths
The assets will be saved directly inside the `/public/partners/` directory of the application:
1. **AJIO**: `/public/partners/ajio.png`
2. **NYKAA**: `/public/partners/nykaa.png`
3. **TATA CLiQ**: `/public/partners/tata-cliq.png`
4. **RELIANCE**: `/public/partners/reliance.png`
5. **AMAZON**: `/public/partners/amazon.png`
6. **FLIPKART**: `/public/partners/flipkart.png`

## Design & Sizing Details
- **Transparency**: High-quality PNG with full alpha channel transparency to blend perfectly with the dynamic backgrounds in both Light Mode (`bg-white`) and Dark Mode (`bg-[#0c0e16]` / card hover states).
- **Aspect Ratio**: Handled dynamically using `object-contain` within the standard `w-20 h-20` container in `PartnerCard`.
- **System Resilience**: No JavaScript or routing modifications are required, preserving original state handlers and fallbacks if an asset download is interrupted or if a path fails to load.
