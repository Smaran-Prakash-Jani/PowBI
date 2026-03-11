import { motion } from 'framer-motion';
import { Table2 } from 'lucide-react';

export default function DataTable({ data }) {
  if (!data || !data.length) return null;

  const columns = Object.keys(data[0]);
  const rows = data.slice(0, 50); // Show max 50 rows

  return (
    <motion.div
      className="glass-card"
      style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Table2 size={18} color="var(--accent-indigo-light)" />
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Data Results</span>
        </div>
        <span style={{
          fontSize: '0.75rem',
          color: 'var(--text-tertiary)',
        }}>
          {data.length} rows{data.length > 50 ? ' (showing 50)' : ''}
        </span>
      </div>

      <div className="data-table-wrap" style={{ 
        border: '1px solid var(--border-medium)', 
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden'
      }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-input)' }}>
              {columns.map((col) => (
                <th key={col} style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  borderBottom: '1px solid var(--border-medium)'
                }}>{col.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ 
                background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)',
                borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border-light)'
              }}>
                {columns.map((col) => (
                  <td key={col} style={{ 
                    padding: '12px 16px', 
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}>
                    {typeof row[col] === 'number'
                      ? row[col].toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
