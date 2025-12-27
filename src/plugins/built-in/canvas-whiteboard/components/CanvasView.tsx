import { useState, useRef, useCallback } from 'react';
import { Plus, Minus, MousePointer, Square, Circle, Type, Trash2, Download, Save } from 'lucide-react';
import { cn } from '../../../../lib';

interface Node {
  id: string;
  type: 'rectangle' | 'circle' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
}

interface Edge {
  id: string;
  from: string;
  to: string;
}

export function CanvasView() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'rectangle' | 'circle' | 'text'>('select');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (tool === 'select') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      // Check if clicking on a node
      const clickedNode = nodes.find(node =>
        x >= node.x && x <= node.x + node.width &&
        y >= node.y && y <= node.y + node.height
      );

      if (clickedNode) {
        setSelectedNode(clickedNode.id);
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
      } else {
        setSelectedNode(null);
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    } else {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      setIsDrawing(true);
      setDrawStart({ x, y });
    }
  }, [tool, nodes, pan, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && tool === 'select' && selectedNode) {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;

      setNodes(nodes.map(node =>
        node.id === selectedNode
          ? { ...node, x: node.x + dx, y: node.y + dy }
          : node
      ));

      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDragging && tool === 'select') {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, tool, selectedNode, nodes, dragStart, zoom]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDrawing) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      const width = Math.abs(x - drawStart.x);
      const height = Math.abs(y - drawStart.y);
      const nodeX = Math.min(x, drawStart.x);
      const nodeY = Math.min(y, drawStart.y);

      if (width > 10 && height > 10) {
        const newNode: Node = {
          id: crypto.randomUUID(),
          type: tool as 'rectangle' | 'circle',
          x: nodeX,
          y: nodeY,
          width: Math.max(width, 100),
          height: Math.max(height, 60),
          text: tool === 'text' ? 'Type here...' : '',
          color: '#8b5cf6',
        };

        setNodes([...nodes, newNode]);
      }
    }

    setIsDragging(false);
    setIsDrawing(false);
  }, [isDrawing, drawStart, tool, nodes, pan, zoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)));
  }, []);

  const addText = () => {
    const newNode: Node = {
      id: crypto.randomUUID(),
      type: 'text',
      x: -pan.x / zoom + 200,
      y: -pan.y / zoom + 200,
      width: 200,
      height: 40,
      text: 'Type here...',
      color: '#8b5cf6',
    };

    setNodes([...nodes, newNode]);
  };

  const deleteSelected = () => {
    if (selectedNode) {
      setNodes(nodes.filter(node => node.id !== selectedNode));
      setEdges(edges.filter(edge => edge.from !== selectedNode && edge.to !== selectedNode));
      setSelectedNode(null);
    }
  };

  const saveCanvas = () => {
    const data = { nodes, edges };
    localStorage.setItem('canvas-whiteboard-data', JSON.stringify(data));
    console.log('Canvas saved');
  };

  const exportCanvas = () => {
    const data = { nodes, edges };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="border-b border-border bg-background-secondary/50 backdrop-blur p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {([
            { id: 'select', icon: MousePointer, label: 'Select' },
            { id: 'rectangle', icon: Square, label: 'Rectangle' },
            { id: 'circle', icon: Circle, label: 'Circle' },
            { id: 'text', icon: Type, label: 'Text' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={cn(
                'p-2 rounded-lg transition-all',
                tool === t.id
                  ? 'bg-accent text-white'
                  : 'bg-background-tertiary/50 text-foreground-muted hover:text-foreground hover:bg-background-tertiary'
              )}
              title={t.label}
            >
              <t.icon className="w-4 h-4" />
            </button>
          ))}

          <div className="w-px h-6 bg-border mx-2" />

          <button
            onClick={() => setZoom(prev => Math.min(5, prev * 1.2))}
            className="p-2 rounded-lg bg-background-tertiary/50 text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
          <span className="text-xs text-foreground-muted font-medium w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.max(0.1, prev / 1.2))}
            className="p-2 rounded-lg bg-background-tertiary/50 text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-all"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {selectedNode && (
            <button
              onClick={deleteSelected}
              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
              title="Delete selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={addText}
            className="px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-accent/25"
          >
            <Plus className="w-4 h-4" />
            Add Text
          </button>
          <button
            onClick={saveCanvas}
            className="p-2 rounded-lg bg-background-tertiary/50 text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-all"
            title="Save canvas"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={exportCanvas}
            className="p-2 rounded-lg bg-background-tertiary/50 text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-all"
            title="Export canvas"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-hidden cursor-crosshair"
        style={{
          backgroundImage: `
            radial-gradient(circle, ${parseInt('27272a', 16) | 0x888888} 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: '0 0',
          }}
        >
          {nodes.map((node) => (
            <div
              key={node.id}
              className={cn(
                'absolute flex items-center justify-center p-3 transition-all cursor-move',
                selectedNode === node.id && 'ring-2 ring-accent ring-offset-2 ring-offset-background'
              )}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                backgroundColor: `${node.color}20`,
                border: `2px solid ${node.color}`,
                borderRadius: node.type === 'circle' ? '50%' : '8px',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode(node.id);
              }}
            >
              <input
                type="text"
                value={node.text}
                onChange={(e) => {
                  setNodes(nodes.map(n =>
                    n.id === node.id ? { ...n, text: e.target.value } : n
                  ));
                }}
                className="bg-transparent text-foreground text-center focus:outline-none w-full h-full"
                style={{ fontSize: '14px' }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Help text */}
      <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs text-foreground-muted">
        <p>Scroll to zoom • Drag to pan • Select tool to draw</p>
      </div>
    </div>
  );
}
