import { motion } from 'framer-motion';
import { Code2, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function SQLDisplay({ sql, explanation }) {
  const [copied, setCopied] = useState(false);

  if (!sql) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="glass-card sql-display"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-sm)',
      }}>
        <div className="sql-header">
          <Code2 size={14} />
          Generated SQL
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: 'none',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.3rem 0.6rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-sans)',
            transition: 'all var(--transition-fast)',
          }}
        >
          {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="sql-code">{sql}</pre>
      {explanation && (
        <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(99, 102, 241, 0.05)', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-indigo)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Why this logic?</strong> <br/>
          {explanation}
        </div>
      )}
    </motion.div>
  );
}
