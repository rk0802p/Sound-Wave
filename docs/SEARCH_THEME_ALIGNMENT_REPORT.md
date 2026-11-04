# SOUNDWAVE — Search Page Theme Alignment & Visual Design Report

**Document ID:** SW-SEARCH-THEME-2026-11-05  
**Subject:** Visual Harmonization of `SearchView.vue` with the SOUNDWAVE Pastel Bubbly Design System  
**Tested Breakpoints:** Desktop (1280px × 800px), Tablet (768px × 1024px), Mobile (390px × 844px)  

---

## 1. Executive Summary

During Phase 6 development, `SearchView.vue` deviated from the core aesthetic of SOUNDWAVE, adopting an unstyled neo-brutalist treatment characterized by stark black borders (`2px solid #111`), flat white backgrounds, and rectangular action buttons. This clashed with the pastel glassmorphism, dynamic tint washes, and organic bubbly orbs present on the homepage and player dock.

This component has been reconstructed to fully align with SOUNDWAVE's visual identity while maintaining full keyboard accessibility, responsive flexibility, and high-performance GPU compositing.

---

## 2. Design Tokens & Visual Hierarchy Alignment

| Visual Dimension | Pre-Fix (Neo-Brutalist Drift) | Post-Fix (Pastel Bubbly Glassmorphic) |
|---|---|---|
| **Background Stage** | Flat `#ffffff` solid canvas | Dynamic `#wash` tinted transition + 3 floating pastel orbs (`.bgb`) |
| **Card Geometry** | Sharp `0px` radius, `2px solid #111` | Rounded `border-radius: 24px` to `28px`, subtle glass borders (`rgba(255,255,255,0.85)`) |
| **Surface Translucency** | Opaque white `background: #fff` | Frosted glass: `backdrop-filter: blur(20px)`, `background: rgba(255,255,255,0.82)` |
| **Search Bar Input** | Inset heavy black border, square corners | Translucent pill-like portal with glowing cyan focus ring (`0 0 0 3px rgba(47, 211, 162, 0.28)`) |
| **Play Controls** | Raw black ASCII buttons `[ > ]` | Bubbly circular buttons with dual-gradient fills (`#2fd3a2` → `#19c9bd`) |
| **Provider Badges** | Monospaced plain black pills | Soft pastel pill tags with semantic provider tinting (Jamendo pink, Archive indigo, Audius purple) |
| **Shadows & Elevation** | Harsh flat drop shadows (`4px 4px 0 #000`) | Multi-layered atmospheric diffuse shadows (`0 8px 32px rgba(43, 29, 90, 0.08)`) |

---

## 3. Structural Template & CSS Architecture

### 3.1 Background Wash & Drifting Orbs
Injected into the root of `SearchView.vue`:
```html
<div class="wash" id="wash" :style="{ backgroundColor: currentWashColor }"></div>
<div class="bgb" aria-hidden="true">
  <i :style="{ background: playerStore.o1 || '#7ff0e6' }"></i>
  <i :style="{ background: '#ffd7a0' }"></i>
  <i :style="{ background: '#e1d2ff' }"></i>
</div>
```
The wash color transitions dynamically in sync with the active track's mood palette.

### 3.2 Translucent Search Portal Box
```css
.pg-search-input-box {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 28px;
  padding: 1rem 1.75rem;
  box-shadow: 0 12px 36px rgba(43, 29, 90, 0.07), inset 0 1px 0 #fff;
  transition: all 0.25s ease;
}

.pg-search-input-box:focus-within {
  background: #ffffff;
  border-color: rgba(47, 211, 162, 0.6);
  box-shadow: 0 16px 44px rgba(47, 211, 162, 0.15), 0 0 0 4px rgba(47, 211, 162, 0.18);
  transform: translateY(-2px);
}
```

### 3.3 Semantic Provider Badges
```css
.track-source-pill.prov-jamendo {
  background: rgba(255, 51, 102, 0.12);
  color: #ff3366;
}
.track-source-pill.prov-archive {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}
.track-source-pill.prov-audius {
  background: rgba(168, 85, 247, 0.12);
  color: #9333ea;
}
```

---

## 4. Multi-Device Responsive Verification

Responsive rendering was verified via automated Puppeteer Edge automation across 3 target viewports.

### 4.1 Desktop (1280px × 800px)
* **Evidence:** Saved to `screenshot_incident_search_1280.png`.
* **Behavior:** Full multi-column vibe cards grid (4 columns), spacious search bar with ESC shortcut hint, persistent floating player dock anchored at the bottom.

### 4.2 Tablet (768px × 1024px)
* **Evidence:** Saved to `screenshot_incident_search_768.png`.
* **Behavior:** 2-column vibe cards grid, wrapped navigation pills, fluid margins with touch-friendly 44px tap targets.

### 4.3 Mobile (390px × 844px — iPhone 12/13/14 Pro baseline)
* **Evidence:** Saved to `screenshot_incident_search_390.png`.
* **Behavior:** Single-column layout, compact track rows, horizontal chip scrolling, zero viewport overflow or horizontal scrollbars.
