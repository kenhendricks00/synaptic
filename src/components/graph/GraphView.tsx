import { useEffect, useState, useRef, useCallback } from 'react';
import { Network } from 'lucide-react';
import { useVaultStore } from '../../stores';

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  color?: string;
}

interface Edge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface Transform {
  k: number;
  x: number;
  y: number;
  isDragging: boolean;
}

export function GraphView() {
  const { notes } = useVaultStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<Transform>({ k: 1, x: 0, y: 0, isDragging: false });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [graphNodes, setGraphNodes] = useState<Node[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge[]>([]);

  // Parse wiki links
  const parseWikiLinks = useCallback((content: string): string[] => {
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const links: string[] = [];
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[1]);
    }
    return links;
  }, []);

  // Build graph from notes
  const buildGraph = useCallback(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeIds = new Set<string>();
    const notesArray = Array.from(notes.values());

    notesArray.forEach((note) => {
      if (!nodeIds.has(note.id)) {
        const angle = (nodes.length / notesArray.length) * 2 * Math.PI;
        const radius = 200;
        nodes.push({
          id: note.id,
          x: Math.cos(angle) * radius + 400,
          y: Math.sin(angle) * radius + 300,
          label: note.title,
          color: '#8b5cf6',
        });
        nodeIds.add(note.id);
      }

      const links = parseWikiLinks(note.content);
      links.forEach((linkTitle) => {
        const targetNote = notesArray.find((n) =>
          n.title.toLowerCase() === linkTitle.toLowerCase() ||
          n.title.toLowerCase().includes(linkTitle.toLowerCase())
        );

        if (targetNote && nodeIds.has(targetNote.id)) {
          const edgeId = `${note.id}-${targetNote.id}`;
          const edgeExists = edges.some((e) => e.id === edgeId);

          if (!edgeExists) {
            edges.push({
              id: edgeId,
              from: note.id,
              to: targetNote.id,
              label: linkTitle,
            });
          }
        }
      });
    });

    setGraphNodes(nodes);
    setGraphEdges(edges);
  }, [notes, parseWikiLinks]);

  useEffect(() => {
    buildGraph();
  }, [notes, buildGraph]);

  // Handle zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({
      ...prev,
      k: Math.min(3, Math.max(0.3, prev.k * delta)),
    }));
  };

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      setDraggedNode('canvas');
      setTransform((prev) => ({ ...prev, isDragging: true }));
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedNode === 'canvas' && transform.isDragging) {
      const dx = e.movementX;
      const dy = e.movementY;
      setTransform((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    }
  }, [draggedNode, transform]);

  const handleMouseUp = () => {
    if (draggedNode === 'canvas') {
      setTransform((prev) => ({ ...prev, isDragging: false }));
      setDraggedNode(null);
    }
  };

  // Handle node drag
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.button === 0) {
      e.stopPropagation();
      setDraggedNode(nodeId);
      setSelectedNode(nodeId);
    }
  }, []);

  const handleNodeMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedNode && draggedNode !== 'canvas') {
      setGraphNodes((prev) =>
        prev.map((n) =>
          n.id === draggedNode
            ? { ...n, x: n.x + e.movementX, y: n.y + e.movementY }
            : n
        )
      );
    }
  }, [draggedNode]);

  const handleNodeMouseUp = () => {
    setDraggedNode(null);
  };

  if (notes.size === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <Network className="w-16 h-16 text-foreground-muted mb-4 mx-auto" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Notes Yet</h3>
          <p className="text-sm text-foreground-muted max-w-md">
            Create some notes to see their connections in the graph
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-gradient-to-br from-background via-background/50 to-background-secondary relative"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{
          cursor: draggedNode ? 'grabbing' : 'grab',
        }}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {graphEdges.map((edge) => {
            const fromNode = graphNodes.find((n) => n.id === edge.from);
            const toNode = graphNodes.find((n) => n.id === edge.to);

            if (!fromNode || !toNode) return null;

            return (
              <g key={edge.id}>
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="#3f3f46"
                  strokeWidth={2 * transform.k}
                  strokeDasharray="4,4"
                  opacity={0.6}
                />
                {edge.label && transform.k > 0.6 && (
                  <text
                    x={(fromNode.x + toNode.x) / 2}
                    y={(fromNode.y + toNode.y) / 2 - 8}
                    textAnchor="middle"
                    fontSize={12 * transform.k}
                    fill="#a1a1aa"
                    className="select-none"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {graphNodes.map((node) => (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <circle
                r={20 * transform.k}
                fill={node.color}
                stroke={selectedNode === node.id ? '#f472b6' : 'transparent'}
                strokeWidth={3}
                className="cursor-move select-none"
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onMouseMove={handleNodeMouseMove}
                onMouseUp={handleNodeMouseUp}
              />
              <text
                x={0}
                y={30 * transform.k}
                textAnchor="middle"
                fontSize={11 * transform.k}
                fill="#f5f5f7"
                className="select-none pointer-events-none font-medium"
              >
                {node.label.length > 20 ? `${node.label.slice(0, 20)}...` : node.label}
              </text>
            </g>
          ))}
        </g>
      </svg>

      <div className="absolute top-4 left-4 z-10 px-4 py-2 bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <Network className="w-4 h-4 text-accent" />
            <span className="font-semibold text-foreground">
              {graphNodes.length} notes
            </span>
          </span>
          <span className="text-foreground-muted/70">
            {graphEdges.length} connections
          </span>
        </div>
        {selectedNode && (
          <div className="text-xs text-foreground-muted/70">
            Scroll to zoom • Drag to pan • Drag nodes to move
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 z-10 px-4 py-2 bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-foreground-secondary">Note</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-foreground-secondary">Connection</span>
          </div>
        </div>
        <div className="text-foreground-muted/70">
          Notes connected via [[Wiki-link]] syntax
        </div>
      </div>
    </div>
  );
}
