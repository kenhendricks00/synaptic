import type { Plugin } from '../../types';
import { CanvasView } from './components/CanvasView';

export class CanvasWhiteboardPlugin implements Plugin {
  id = 'canvas-whiteboard';
  name = 'Canvas Whiteboard';
  version = '1.0.0';
  description = 'Visual brainstorming tool with an infinite canvas';
  author = 'Synaptic Team';
  category = 'visualization' as const;
  tags = ['mind-maps', 'diagrams', 'visual'];
  permissions: Plugin['permissions'] = ['read_notes', 'write_notes', 'storage'];

  components = {
    view: CanvasView,
  };

  async onLoad() {
    console.log('Canvas Whiteboard plugin loaded');
    await this.loadCanvasData();
  }

  async onUnload() {
    console.log('Canvas Whiteboard plugin unloaded');
  }

  async onEnable() {
    console.log('Canvas Whiteboard plugin enabled');
  }

  async onDisable() {
    console.log('Canvas Whiteboard plugin disabled');
  }

  private async loadCanvasData() {
    const stored = localStorage.getItem('canvas-whiteboard-data');
    if (stored) {
      console.log('Loaded canvas data:', JSON.parse(stored).nodes.length);
    }
  }
}

export default CanvasWhiteboardPlugin;
