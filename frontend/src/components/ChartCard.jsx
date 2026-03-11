import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import Plot from 'react-plotly.js';
import { Camera, BarChart2, PieChart, LineChart, ScatterChart } from 'lucide-react';

const CHART_COLORS = [
  '#6366f1', '#06b6d4', '#8b5cf6', '#10b981',
  '#f59e0b', '#f43f5e', '#ec4899', '#14b8a6',
  '#f97316', '#0ea5e9',
];

export default function ChartCard({ config, data }) {
  const [activeType, setActiveType] = useState(config?.chart_type || 'bar');

  useEffect(() => {
    if (config?.chart_type) setActiveType(config.chart_type);
  }, [config]);

  const plotData = useMemo(() => {
    if (!config || !data?.length) return null;

    const xVals = data.map((d) => d[config.x_key]);
    const yVals = data.map((d) => d[config.y_key]);

    const type = activeType;

    if (type === 'pie') {
      return [{
        type: 'pie',
        labels: xVals,
        values: yVals,
        marker: { colors: CHART_COLORS },
        textinfo: 'label+percent',
        textposition: 'outside',
        hoverinfo: 'label+value+percent',
        hole: 0.45,
        textfont: { color: '#64748b', size: 12, family: 'Inter, sans-serif' },
        automargin: true,
      }];
    }

    return [{
      x: xVals,
      y: yVals,
      type: (activeType === 'scatter' || activeType === 'line') ? 'scatter' : activeType,
      mode: activeType === 'scatter' ? 'markers' : activeType === 'line' ? 'lines+markers' : undefined,
      marker: {
        color: type === 'bar'
          ? CHART_COLORS.slice(0, xVals.length)
          : CHART_COLORS[0],
        size: type === 'scatter' ? 10 : undefined,
        line: { width: 0 },
      },
      line: type === 'line' ? {
        color: CHART_COLORS[0],
        width: 2.5,
        shape: 'spline',
      } : undefined,
      fill: activeType === 'line' ? 'tozeroy' : undefined,
      fillcolor: activeType === 'line' ? 'rgba(99, 102, 241, 0.08)' : undefined,
    }];
  }, [config, data, activeType]);

  const layout = useMemo(() => {
    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    
    return {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { family: 'Inter, sans-serif', color: textColor, size: 12 },
      margin: { t: 20, b: activeType === 'pie' ? 20 : 50, l: 60, r: 20 },
      xaxis: {
        gridcolor: gridColor,
        tickfont: { size: 11, color: textColor },
        title: { text: activeType === 'pie' ? '' : config?.x_key?.replace(/_/g, ' '), font: { size: 12, color: textColor } },
        zeroline: false,
      },
      yaxis: {
        gridcolor: gridColor,
        tickfont: { size: 11, color: textColor },
        title: { text: activeType === 'pie' ? '' : config?.y_key?.replace(/_/g, ' '), font: { size: 12, color: textColor } },
        zeroline: false,
      },
      showlegend: activeType === 'pie',
      legend: { orientation: 'h', y: -0.1 },
      autosize: true,
      hoverlabel: {
        bgcolor: isDark ? '#1e293b' : '#ffffff',
        bordercolor: 'rgba(99,102,241,0.5)',
        font: { color: isDark ? '#f1f5f9' : '#0f172a', family: 'Inter, sans-serif' },
      },
    };
  }, [config, activeType]);

  if (!plotData) return null;

  return (
    <motion.div
      className="chart-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <div className="chart-header">
        <div>
          <div className="chart-title">{config.title || 'Visualization'}</div>
          {config.summary && <div className="chart-summary">{config.summary}</div>}
        </div>
        <div className="chart-actions" style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
          {['bar', 'line', 'pie', 'scatter'].map(t => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              style={{
                background: activeType === t ? 'var(--accent-indigo)' : 'transparent',
                color: activeType === t ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="chart-actions">
          <button className="chart-action-btn" title="Save chart">
            <Camera size={14} />
          </button>
        </div>
      </div>
      <Plot
        data={plotData}
        layout={layout}
        config={{
          responsive: true,
          displayModeBar: true,
          modeBarButtonsToRemove: ['lasso2d', 'select2d'],
          displaylogo: false,
        }}
        style={{ width: '100%', height: '380px' }}
      />
    </motion.div>
  );
}
