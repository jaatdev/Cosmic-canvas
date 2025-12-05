# 🌌 Cosmic Canvas

> A "Universe Best" Next.js handwriting application optimized for Veikk Pen Tablets, featuring pressure-sensitive drawing, glassmorphism UI, and an infinite canvas experience.

![Cosmic Canvas Demo](docs/demo.gif)

## ✨ Features

### 🖊️ Professional Pen Input
- **Pressure Sensitivity** - Full support for pen pressure (0.0-1.0) mapped to stroke weight
- **Palm Rejection** - Automatic detection: `touch` → pan/zoom, `pen` → draw
- **120Hz+ Rendering** - Smooth drawing with `requestAnimationFrame` render loop
- **perfect-freehand Integration** - Natural, organic strokes like Epic Pen

### 🎨 "Gravity Dock" Toolbox
| Tool | Description |
|------|-------------|
| 🖊️ Pen | Adjustable color and thickness |
| ⌫ Eraser | Stroke eraser mode |
| T Text | Click to add draggable text nodes |
| 🖼️ Image | Upload or paste images |
| ⛶ Fullscreen | "Black Hole" immersive mode |
| 📄 Export | PDF / PNG download |
| 🎨 Background | Color & pattern picker (grid/dots/lines) |

### 📋 Snippet Engine
- Paste images directly from clipboard (Windows Snipping Tool, screenshots)
- Automatic image node creation with drag & resize

### 🌑 Immersive Mode
- True fullscreen experience
- UI fades away for distraction-free writing
- Hover to reveal controls

## 🏗️ Architecture

```
┌────────────────────────────────────────┐
│  Layer 3: InterfaceLayer (z-50)        │  ← Gravity Dock UI
│  ┌──────────────────────────────────┐  │
│  │  Layer 2: ObjectLayer (z-20)     │  │  ← Text & Images
│  │  ┌────────────────────────────┐  │  │
│  │  │  Layer 1: CanvasLayer (z-10)│  │  │  ← Drawing
│  │  │  ┌──────────────────────┐  │  │  │
│  │  │  │ Layer 0: Background  │  │  │  │  ← Paper
│  │  │  └──────────────────────┘  │  │  │
│  │  └────────────────────────────┘  │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/jaatdev/Cosmic-canvas.git
cd Cosmic-canvas

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 📦 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14+** | App Router, React Server Components |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Utility-first styling |
| **Zustand** | Lightweight state management |
| **perfect-freehand** | Pressure-sensitive stroke generation |
| **Lucide React** | Icon library |
| **jsPDF** | PDF export |

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with Inter font
│   ├── page.tsx            # Main page → Whiteboard
│   └── globals.css         # Theme variables, dark mode
├── components/
│   ├── Canvas/
│   │   ├── Whiteboard.tsx      # Main composition
│   │   ├── BackgroundLayer.tsx # Patterns: grid/dots/lines
│   │   ├── CanvasLayer.tsx     # High-DPI drawing surface
│   │   └── ObjectLayer.tsx     # Text & Images
│   └── UI/
│       ├── RightSidebar.tsx    # "Gravity Dock"
│       ├── ColorPicker.tsx     # Full RGB/Hex picker
│       ├── ThicknessSlider.tsx # Visual stroke preview
│       ├── FontSelector.tsx    # System fonts
│       └── ProjectNameInput.tsx
├── hooks/
│   └── useCanvas.ts        # Veikk pen physics engine
├── store/
│   └── useStore.ts         # Zustand state
├── utils/
│   ├── exportUtils.ts      # PDF/PNG export
│   └── canvasUtils.ts      # DPI scaling helpers
└── types/
    └── index.ts            # TypeScript definitions
```

## 🎮 Hardware Compatibility

Optimized for **Veikk Pen Tablets** but works with:
- Wacom tablets
- XP-Pen tablets
- Apple Pencil (iPad with browser)
- Any device supporting Pointer Events with pressure

## 🔧 Configuration

### Brush Settings
```typescript
// Customize in store/useStore.ts
brush: {
  color: '#ffffff',    // Default white
  size: 4,             // 1-50 range
  opacity: 1,          // 0-1 range
}
```

### Background Options
- **Colors**: Full hex color picker
- **Patterns**: None, Grid, Dots, Lines

## 📄 Export Options

- **PDF**: Exact aspect ratio, project-named downloads
- **PNG**: High-resolution canvas export

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + V` | Paste image from clipboard |
| `ESC` | Exit fullscreen mode |

## 🛠️ Development

```bash
# Type checking
npx tsc --noEmit

# Build for production
npm run build

# Start production server
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

MIT License - feel free to use this for your projects!

## 🙏 Acknowledgments

- [perfect-freehand](https://github.com/steveruizok/perfect-freehand) - The magic behind natural strokes
- [Zustand](https://github.com/pmndrs/zustand) - Simple, fast state management
- [Lucide](https://lucide.dev/) - Beautiful icons

---

<p align="center">
  Made with 💜 by <a href="https://github.com/jaatdev">jaatdev</a>
</p>
