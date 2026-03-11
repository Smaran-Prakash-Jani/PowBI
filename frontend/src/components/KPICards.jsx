import { motion } from 'framer-motion';
import { TrendingUp, Hash, Layers, BarChart3 } from 'lucide-react';

const icons = [TrendingUp, Hash, Layers, BarChart3];
const colors = [
  'rgba(99, 102, 241, 0.1)',
  'rgba(6, 182, 212, 0.1)',
  'rgba(139, 92, 246, 0.1)',
  'rgba(34, 197, 94, 0.1)',
];
const iconColors = ['#818cf8', '#06b6d4', '#8b5cf6', '#22c55e'];

export default function KPICards({ summary }) {
  if (!summary?.kpis?.length) {
    // Fallback: show basic row/column KPIs
    return (
      <div className="kpi-grid">
        <KPIItem
          idx={0}
          label="Total Rows"
          value={summary?.total_rows?.toLocaleString() || '0'}
          sub="records loaded"
        />
        <KPIItem
          idx={1}
          label="Columns"
          value={summary?.total_columns || '0'}
          sub="data fields"
        />
      </div>
    );
  }

  return (
    <div className="kpi-grid">
      <KPIItem
        idx={0}
        label="Total Rows"
        value={summary.total_rows?.toLocaleString() || '0'}
        sub={`${summary.total_columns || 0} columns`}
      />
      {summary.kpis.map((kpi, i) => (
        <KPIItem
          key={kpi.label}
          idx={i + 1}
          label={kpi.label}
          value={formatNumber(kpi.value)}
          sub={`Avg: ${formatNumber(kpi.mean)}`}
        />
      ))}
    </div>
  );
}

function KPIItem({ idx, label, value, sub }) {
  const Icon = icons[idx % icons.length];
  return (
    <motion.div
      className="glass-card kpi-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: idx * 0.07 }}
    >
      <div className="kpi-icon" style={{ background: colors[idx % colors.length] }}>
        <Icon size={20} color={iconColors[idx % iconColors.length]} />
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </motion.div>
  );
}

function formatNumber(n) {
  if (n == null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
