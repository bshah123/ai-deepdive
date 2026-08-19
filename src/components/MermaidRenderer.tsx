import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif'
});

/**
 * Pre-processes and repairs common LLM-generated Mermaid syntax errors.
 */
function sanitizeMermaidCode(rawChart: string): string {
  if (!rawChart || !rawChart.trim()) return '';

  let lines = rawChart.trim().split('\n');
  if (lines.length === 0) return '';

  // Ensure first line has a valid diagram header
  let firstLine = lines[0].trim();
  const validHeaders = [
    'flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 
    'stateDiagram', 'erDiagram', 'gantt', 'pie', 'gitGraph', 
    'mindmap', 'timeline', 'C4Context', 'quadrantChart', 
    'xychart-beta', 'block-beta', 'sankey-beta'
  ];
  
  if (!validHeaders.some(h => firstLine.startsWith(h))) {
    lines.unshift('flowchart TD');
  }

  const sanitizedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip empty lines
    if (!line.trim()) continue;

    // 1. Fix Subgraphs: `subgraph Name [Label]` -> `subgraph Name ["Label"]`
    line = line.replace(/subgraph\s+([a-zA-Z0-9_]+)\s*\[([^"\]]+)\]/g, 'subgraph $1 ["$2"]');
    // Subgraphs with space in name: `subgraph Some Name` -> `subgraph Some_Name ["Some Name"]`
    line = line.replace(/subgraph\s+([a-zA-Z0-9_]+(?:\s+[a-zA-Z0-9_]+)+)$/g, (_m, g1) => {
      const id = g1.replace(/\s+/g, '_');
      return `subgraph ${id} ["${g1}"]`;
    });

    // 2. Fix unquoted bracket labels: `NodeId[Some text (with parens)]` -> `NodeId["Some text (with parens)"]`
    line = line.replace(/(\b[a-zA-Z0-9_]+)\s*\[([^"\[\]\n]+)\]/g, (_m, id, text) => {
      // Escape internal quotes
      const cleanText = text.replace(/"/g, "'").trim();
      return `${id}["${cleanText}"]`;
    });

    // 3. Fix unquoted rounded labels: `NodeId(Some text [with brackets])` -> `NodeId("Some text [with brackets]")`
    line = line.replace(/(\b[a-zA-Z0-9_]+)\s*\(([^"\(\)\n]+)\)/g, (_m, id, text) => {
      if (text.startsWith('"') && text.endsWith('"')) return _m;
      const cleanText = text.replace(/"/g, "'").trim();
      return `${id}("${cleanText}")`;
    });

    // 4. Fix illegal node IDs starting with digits: `1A["Text"]` -> `Node_1A["Text"]`
    line = line.replace(/^(\s*)(\d+[a-zA-Z0-9_]*)\s*([\[\(\{])/g, '$1Node_$2$3');
    line = line.replace(/(-->|---|==>|\.->)\s*(\d+[a-zA-Z0-9_]*)\s*([\[\(\{])/g, '$1 Node_$2$3');

    // 5. Fix arrow labels with unquoted special characters: `-- text (extra) -->` -> `-->|"text (extra)"|`
    line = line.replace(/--\s*([^|\-\n>]+?)\s*-->/g, (_m, text) => {
      const cleanText = text.replace(/"/g, "'").trim();
      return `-->|"${cleanText}"|`;
    });

    sanitizedLines.push(line);
  }

  return sanitizedLines.join('\n');
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      if (!containerRef.current || !chart.trim()) return;
      const uniqueId = `mermaid-${Math.random().toString(36).slice(2, 11)}`;
      const cleanCode = sanitizeMermaidCode(chart);

      try {
        setError(null);
        const { svg } = await mermaid.render(uniqueId, cleanCode);
        if (isMounted && containerRef.current) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(svg, 'image/svg+xml');
          const svgEl = doc.querySelector('svg');
          if (svgEl) {
            svgEl.setAttribute('style', 'max-width: 100%; height: auto; min-height: 120px;');
            containerRef.current.innerHTML = svgEl.outerHTML;
          } else {
            containerRef.current.innerHTML = svg;
          }
        }
      } catch (err: any) {
        // Clean up any temporary error element injected by Mermaid into body
        const tempEl = document.getElementById(uniqueId);
        if (tempEl) tempEl.remove();
        const dError = document.getElementById('d' + uniqueId);
        if (dError) dError.remove();

        // Also clean up any generic mermaid error divs
        const errDivs = document.querySelectorAll('div[id^="dmermaid"]');
        errDivs.forEach(el => el.remove());

        if (isMounted) {
          setError(err?.message || 'Diagram render fallback');
        }
      }
    };

    renderChart();
    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="my-6 p-4 rounded-xl bg-slate-900/90 border border-indigo-500/20 text-xs font-mono text-slate-300 shadow-md">
        <div className="text-indigo-400 font-semibold mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
          <span>Architecture Flow & Data Structures:</span>
        </div>
        <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex justify-center overflow-x-auto shadow-sm"
    />
  );
};
