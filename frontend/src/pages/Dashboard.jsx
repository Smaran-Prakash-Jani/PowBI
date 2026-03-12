import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Send, BarChart3, Loader2, Database } from 'lucide-react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import KPICards from '../components/KPICards';
import UploadZone from '../components/Upload';
import ChatPanel from '../components/ChatPanel';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import SQLDisplay from '../components/SQLDisplay';

const API = import.meta.env.VITE_API_URL || '/api';

export default function Dashboard({ user, token, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data state
  const [columns, setColumns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState(null);
  const [chartConfig, setChartConfig] = useState(null);
  const [sql, setSql] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [queryHistory, setQueryHistory] = useState([]);
  const [repoFiles, setRepoFiles] = useState([]);

  // Fetch summary and history on mount to restore state
  useEffect(() => {
    if (!token) return;
    
    // Fetch summary
    axios.get(`${API}/summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => {
      if (res.data.summary && Object.keys(res.data.summary).length > 0) {
        setSummary(res.data.summary);
        if (res.data.columns && res.data.columns.length > 0) {
          setColumns(res.data.columns);
        }
      }
    }).catch(() => {});

    // Fetch history
    axios.get(`${API}/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => {
      if (res.data.history) {
        setQueryHistory(res.data.history);
      }
    }).catch(() => {});

    // Fetch repo files
    axios.get(`${API}/data/files`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => {
      if (res.data.files) {
        setRepoFiles(res.data.files);
      }
    }).catch(() => {});
  }, [token]);

  // File upload handler
  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setStatus('Uploading and analyzing data...');
      const res = await axios.post(`${API}/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` 
        },
      });
      setColumns(res.data.columns);
      setSummary(res.data.summary);
      setStatus('Data loaded successfully!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus('Upload failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Repo load handler
  const handleRepoLoad = async (filename) => {
    try {
      setStatus(`Loading ${filename}...`);
      const res = await axios.post(`${API}/data/load?filename=${filename}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setColumns(res.data.columns);
      setSummary(res.data.summary);
      setStatus('Data loaded from repository!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus('Repo load failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Query handler
  const handleQuery = async (query) => {
    if (!columns.length) {
      setStatus('Please upload a CSV file first.');
      return;
    }

    setLoading(true);
    setSql('');
    setExplanation('');
    setData(null);
    setChartConfig(null);

    const statuses = [
      'Analyzing your intent...',
      'Generating SQL query...',
      'Validating logic...',
      'Rendering visualization...',
    ];

    let si = 0;
    const iv = setInterval(() => {
      if (si < statuses.length) {
        setStatus(statuses[si]);
        si++;
      }
    }, 700);

    try {
      const res = await axios.post(`${API}/query`, {
        query,
        history: queryHistory,
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      clearInterval(iv);

      if (res.data.error) {
        setStatus('Error: ' + res.data.error);
        setSql(res.data.sql || '');
      } else {
        setData(res.data.data);
        setChartConfig(res.data.chart);
        setSql(res.data.sql || '');
        setExplanation(res.data.explanation || '');
        setStatus('');
        setQueryHistory((prev) => [
          ...prev.slice(-9),
          { role: 'user', content: query },
          { role: 'assistant', content: res.data.chart?.summary || 'Done' },
        ]);
      }
    } catch (err) {
      clearInterval(iv);
      setStatus('Error processing request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
      />

      <div className="main-content">
        <TopBar
          title={activeTab === 'dashboard' ? 'Dashboard' : 'Analytics'}
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
        />

        <div className="page-content">

          {activeTab === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Inline Upload */}
              <UploadZone 
                onUpload={handleUpload} 
                columns={columns} 
                repoFiles={repoFiles} 
                onRepoLoad={handleRepoLoad} 
              />

              {/* KPI Cards */}
              {summary && <KPICards summary={summary} />}

              {/* Query Input */}
              <QueryInput
                onQuery={handleQuery}
                loading={loading}
                status={status}
                hasData={columns.length > 0}
              />

              {/* Chart */}
              {loading ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <Loader2 size={36} style={{ animation: 'spin-slow 1s linear infinite', color: 'var(--accent-indigo)', margin: '0 auto' }} />
                  <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.9rem' }}>
                    {status || 'Processing...'}
                  </p>
                </div>
              ) : chartConfig && data ? (
                <>
                  <ChartCard config={chartConfig} data={data} />
                  <DataTable data={data} />
                  {sql && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <SQLDisplay sql={sql} explanation={explanation} />
                    </div>
                  )}
                </>
              ) : (
                !summary && (
                  <div className="glass-card empty-state">
                    <div className="empty-state-icon">
                      <BarChart3 size={48} />
                    </div>
                    <div className="empty-state-title">No data yet</div>
                    <div className="empty-state-desc">
                      Upload a CSV file to get started, then ask questions in natural language.
                    </div>
                  </div>
                )
              )}
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {summary ? (
                <AnalyticsView summary={summary} onQuery={(q) => { setActiveTab('dashboard'); setTimeout(() => handleQuery(q), 300); }} />
              ) : (
                <div className="glass-card empty-state">
                  <div className="empty-state-icon"><BarChart3 size={48} /></div>
                  <div className="empty-state-title">No data to analyze</div>
                  <div className="empty-state-desc">Upload a CSV file first, then come back for insights.</div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <ChatPanel columns={columns} token={token} />
    </div>
  );
}

// ── Query Input Sub-component ───────────────────────────────
function QueryInput({ onQuery, loading, status, hasData }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      onQuery(query.trim());
    }
  };

  return (
    <div className="query-section">
      <div className="query-label">
        <Database size={14} />
        Ask a question about your data
      </div>
      <form className="query-input-wrap" onSubmit={handleSubmit}>
        <input
          className="input-field"
          type="text"
          placeholder={hasData ? 'e.g. "Show me total revenue by region"' : 'Upload data first...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading || !hasData}
        />
        <button
          className="btn-primary"
          type="submit"
          disabled={loading || !query.trim() || !hasData}
        >
          {loading ? <Loader2 size={18} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Send size={18} />}
          Query
        </button>
      </form>
      {status && (
        <div className={`status-bar ${status.startsWith('Error') ? 'error' : status.includes('success') ? 'success' : ''}`}>
          <span className="status-dot" />
          {status}
        </div>
      )}
    </div>
  );
}

// ── Analytics View Sub-component ────────────────────────────
function AnalyticsView({ summary, onQuery }) {
  const fmt = (v) => {
    if (v === undefined || v === null) return '—';
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return typeof v === 'number' ? v.toLocaleString() : v;
  };

  const columns = summary.columns || [];
  const numericCols = summary.numeric_columns || [];
  const kpis = summary.kpis || [];

  const quickQueries = columns.length > 0 ? [
    `Show me all data`,
    numericCols[0] ? `Show total ${numericCols[0]} by ${columns.find(c => !numericCols.includes(c)) || columns[0]}` : null,
    numericCols[0] ? `What is the average ${numericCols[0]}?` : null,
    columns.length >= 2 ? `Show top 5 rows ordered by ${numericCols[0] || columns[1]} descending` : null,
    numericCols.length >= 2 ? `Compare ${numericCols[0]} vs ${numericCols[1]}` : null,
    `Count rows grouped by ${columns.find(c => !numericCols.includes(c)) || columns[0]}`,
  ].filter(Boolean) : [];

  return (
    <div>
      {/* Dataset Overview */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ color: 'var(--text-primary)', margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
          📊 Dataset Overview
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--accent-indigo)', fontWeight: 600, letterSpacing: '0.05em' }}>Total Rows</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{fmt(summary.total_rows)}</div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--accent-emerald)', fontWeight: 600, letterSpacing: '0.05em' }}>Columns</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{summary.total_columns}</div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.08)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--accent-violet)', fontWeight: 600, letterSpacing: '0.05em' }}>Numeric Fields</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{numericCols.length}</div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#f59e0b', fontWeight: 600, letterSpacing: '0.05em' }}>Text Fields</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{columns.length - numericCols.length}</div>
          </div>
        </div>
      </div>

      {/* Column Details */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ color: 'var(--text-primary)', margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
          🔍 Column Details
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {columns.map((col) => {
            const isNumeric = numericCols.includes(col);
            const kpi = kpis.find(k => k.label.toLowerCase().replace(/ /g, '_') === col);
            return (
              <div key={col} style={{
                padding: '1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span style={{
                    fontSize: '0.6rem',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    background: isNumeric ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: isNumeric ? 'var(--accent-indigo)' : '#f59e0b',
                  }}>
                    {isNumeric ? 'numeric' : 'text'}
                  </span>
                </div>
                {kpi && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.5rem' }}>
                    {[
                      { label: 'Sum', val: kpi.value },
                      { label: 'Avg', val: kpi.mean },
                      { label: 'Min', val: kpi.min },
                      { label: 'Max', val: kpi.max },
                    ].map(s => (
                      <div key={s.label} style={{ fontSize: '0.7rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{s.label}: </span>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{fmt(s.val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Queries */}
      {quickQueries.length > 0 && (
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
            ⚡ Suggested Queries
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {quickQueries.map((q, i) => (
              <button
                key={i}
                onClick={() => onQuery(q)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '20px',
                  color: 'var(--accent-indigo)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.target.style.background = 'rgba(99, 102, 241, 0.2)'; e.target.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.target.style.background = 'rgba(99, 102, 241, 0.1)'; e.target.style.transform = 'none'; }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
