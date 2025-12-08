<div align="center">
  <h1>🌌 Cosmic Canvas</h1>
  <p><strong>A next-generation digital notebook engineered for precision, performance, and persistence.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwindcss" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Zustand-5.0-orange?style=for-the-badge" alt="Zustand" />
    <img src="https://img.shields.io/badge/IndexedDB-Persistent-green?style=for-the-badge" alt="IndexedDB" />
  </p>

  <p>
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#roadmap">Roadmap</a>
  </p>
</div>

---

## 🎯 The Engineering Philosophy

Cosmic Canvas isn't just another drawing app. It's a **high-performance rendering engine** disguised as a notebook.

### Why Canvas Physics?

Traditional web drawing apps suffer from:
- **DOM Bloat**: Each stroke as an SVG element destroys performance
- **Jank on Zoom**: Scaling vector elements is computationally expensive
- **Memory Leaks**: Undo/Redo stacks that grow unbounded

**Our Solution**: A layered canvas architecture with intelligent compositing.

```
┌─────────────────────────────────────────────────────┐
│                    UI LAYER (z:20)                  │  ← React Components
├─────────────────────────────────────────────────────┤
│               LASSO LAYER (z:15)                    │  ← Selection Gizmo
├─────────────────────────────────────────────────────┤
│              ACTIVE INK LAYER (z:10)                │  ← Real-time Stroke
├─────────────────────────────────────────────────────┤
│              STATIC INK LAYER (z:5)                 │  ← Committed Strokes
├─────────────────────────────────────────────────────┤
│              OBJECT LAYER (z:3)                     │  ← Images & Text
├─────────────────────────────────────────────────────┤
│            BACKGROUND LAYER (z:1)                   │  ← Color + Pattern
└─────────────────────────────────────────────────────┘
```

Each layer is a separate `<canvas>` element, composited by the browser's GPU. The result? **60fps rendering** even with thousands of strokes.

---

## ✨ Features

### 🖊️ Pressure-Sensitive Ink Engine
- **perfect-freehand** integration for natural brush dynamics
- Barrel button detection for instant eraser switching
- Configurable thinning, smoothing, and taper

### 🎨 The Neon Marker (Highlighter)
- Semi-transparent strokes (`globalAlpha: 0.5`)
- Chisel-tip rendering (`lineCap: butt`)
- Neon color palette: Yellow, Green, Pink, Cyan

### 📐 Vector Geometry Engine
- **Shift-Lock Constraints**: Perfect squares, circles, 45° lines
- Shape primitives: Rectangle, Circle, Triangle, Line, Arrow
- Rendered as stroke paths, not DOM elements

### 🔷 Quantum Lasso (Omni-Selection)
- **Ray-Casting Algorithm** for point-in-polygon detection
- Unified selection: Ink + Text + Images
- Proportional scaling with font-size interpolation
- Keyboard navigation: Arrow keys, Delete, Escape

### 📝 The Typewriter
- Click-to-type text nodes with live editing
- Typography suite: Font family, size, weight, style
- Background highlighting with customizable colors

### 🖼️ HD Image Pipeline
- Smart scaling with aspect ratio preservation
- **Page-anchored positioning**: Images center on current page
- Direct PDF embedding (bypasses canvas rasterization)

### 📄 Multi-Page Architecture
- Fixed A4 geometry (794×1123px at 96 DPI)
- Page-relative coordinate system
- Insert, delete, and reorder pages

### 💾 The Black Box (Persistence)
- **IndexedDB Hydration** via `idb-keyval`
- Auto-save with 1-second debounce
- Project reset with confirmation dialog

### 📤 Print Shop (PDF Export)
- 1:1 A4 mapping for perfect prints
- Pattern support: Grid, Dots, Lines, Isometric, Music, Cornell
- Highlighter transparency preserved in output

---

## 🏗️ Architecture

### State Management: Zustand

```typescript
interface CanvasState {
  strokes: Stroke[];
  images: CanvasImage[];
  textNodes: TextNode[];
  selectedStrokeIds: string[];
  selectedTextIds: string[];
  // ... 50+ state properties
}
```

**Why Zustand?**
- No Provider wrapper required
- Selector-based subscriptions (no unnecessary re-renders)
- Middleware support for persistence

### Rendering Pipeline

```
User Input → Pointer Events → Active Layer (Real-time)
                                    ↓
                            Stroke Commit
                                    ↓
                            Static Layer (Composited)
                                    ↓
                            IndexedDB (Persisted)
```

### Coordinate Systems

| Context | Origin | Notes |
|---------|--------|-------|
| Screen | Top-left of viewport | `event.clientX/Y` |
| Canvas | Top-left of paper | `(clientX - rect.left) / zoom` |
| Page | Top-left of current page | `y - (pageIndex * PAGE_HEIGHT)` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/your-username/cosmic-canvas.git
cd cosmic-canvas
npm install
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

---

## 🗺️ Roadmap

### Phase 4: Collaboration (v0.4)
- [ ] WebSocket real-time sync
- [ ] Conflict-free replicated data types (CRDTs)
- [ ] User presence cursors

### Phase 5: Intelligence (v0.5)
- [ ] Handwriting recognition (Tesseract.js)
- [ ] Shape auto-correction
- [ ] Smart guides and snapping

### Phase 6: Mobile (v0.6)
- [ ] PWA with offline support
- [ ] Touch gesture optimization
- [ ] Apple Pencil double-tap

### Phase 7: Ecosystem (v1.0)
- [ ] Plugin architecture
- [ ] Custom brush SDK
- [ ] Cloud sync (Supabase/Firebase)

---

## 🧪 Technical Specifications

| Metric | Value |
|--------|-------|
| Bundle Size | ~180KB (gzipped) |
| First Paint | <1.5s |
| Ink Latency | <16ms (60fps) |
| Max Strokes | 10,000+ |
| Max Pages | Unlimited |

---

## 📜 License

MIT © 2024 Cosmic Canvas Contributors

---

<div align="center">
  <p><strong>Built with obsessive attention to detail.</strong></p>
  <p>⭐ Star this repo if Cosmic Canvas powers your creativity.</p>
</div>
