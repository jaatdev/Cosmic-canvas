// Core Types for Cosmic Canvas

export type Point = {
  x: number;
  y: number;
  pressure?: number;
};

export type Stroke = {
  id: string;
  points: Point[];
  color: string;
  size: number;
  isComplete: boolean;
};

export type Tool = 'pen' | 'eraser' | 'text' | 'image' | 'select';

export type EraserMode = 'pixel' | 'object';

export type BackgroundPattern = 'none' | 'grid' | 'dots' | 'lines';

export type TextNode = {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  width: number;
  height: number;
};

export type ImageNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  aspectRatio: number;
};

export type CanvasObject = TextNode | ImageNode;

export interface ViewportState {
  offset: { x: number; y: number };
  zoom: number;
}

export interface BrushSettings {
  color: string;
  size: number;
  opacity: number;
}

export interface AppState {
  // Tool state
  tool: Tool;
  eraserMode: EraserMode;
  
  // Brush settings
  brush: BrushSettings;
  
  // Background
  backgroundColor: string;
  backgroundPattern: BackgroundPattern;
  
  // Canvas state
  strokes: Stroke[];
  currentStroke: Stroke | null;
  objects: CanvasObject[];
  selectedObjectId: string | null;
  
  // Viewport (infinite canvas future-proofing)
  viewport: ViewportState;
  
  // UI state
  isSidebarVisible: boolean;
  isFullscreen: boolean;
  projectName: string;
  
  // Actions
  setTool: (tool: Tool) => void;
  setEraserMode: (mode: EraserMode) => void;
  setBrushColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setBrushOpacity: (opacity: number) => void;
  setBackgroundColor: (color: string) => void;
  setBackgroundPattern: (pattern: BackgroundPattern) => void;
  
  // Stroke actions
  startStroke: (point: Point, color: string, size: number) => void;
  addPointToStroke: (point: Point) => void;
  endStroke: () => void;
  clearStrokes: () => void;
  removeStroke: (id: string) => void;
  
  // Object actions
  addTextNode: (node: TextNode) => void;
  addImageNode: (node: ImageNode) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  removeObject: (id: string) => void;
  setSelectedObject: (id: string | null) => void;
  
  // Viewport actions
  setViewportOffset: (offset: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  
  // UI actions
  toggleSidebar: () => void;
  setFullscreen: (isFullscreen: boolean) => void;
  setProjectName: (name: string) => void;
}
