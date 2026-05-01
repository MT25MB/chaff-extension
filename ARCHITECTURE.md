# Project CHAFF Architecture

## Overview

Project CHAFF is a multi-phase privacy infrastructure designed to protect against mass surveillance through noise generation and fingerprint randomization.

## Phase 1: Browser Extension (Current)

The CHAFF Privacy Shield browser extension provides client-side privacy protection:

### Components

- **manifest.json**: Extension configuration for Firefox/Chrome
- **background.js**: Service worker handling noise generation and state management
- **content/fingerprint.js**: Fingerprint randomization at document_start
- **content/exif.js**: EXIF metadata stripping for image uploads
- **popup/**: User interface for configuration and statistics

### Privacy Mechanisms

1. **Fingerprint Randomization**
   - Canvas noise injection
   - WebGL renderer spoofing
   - Hardware property masking
   - Timing jitter

2. **Noise Browsing**
   - Background requests to diverse news/information sites
   - Configurable intensity (1-5 visits/hour)
   - No tracking of noise activity

3. **EXIF Stripping**
   - Automatic GPS removal from uploaded images
   - Canvas-based re-encoding

## Future Phases

- Phase 2: Desktop application with enhanced noise capabilities
- Phase 3: Network-level filtering via VPN/proxy integration
- Phase 4: Community-driven noise cooperative

## Technical Constraints

- Manifest V3 (Chrome/Firefox modern extension API)
- No external dependencies
- Zero telemetry architecture
- Works offline after initial installation

---

*Project CHAFF · Architecture Document*