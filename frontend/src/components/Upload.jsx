import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, CheckCircle2 } from 'lucide-react';

export default function UploadZone({ onUpload, columns, repoFiles, onRepoLoad }) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      alert('Please upload a CSV file.');
      return;
    }
    setFileName(file.name);
    setUploading(true);
    await onUpload(file);
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div className="upload-section">
      <div style={{ display: 'grid', gridTemplateColumns: repoFiles?.length > 0 ? '2fr 1fr' : '1fr', gap: '1.5rem' }}>
        <motion.div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          whileHover={{ scale: 1.002 }}
          whileTap={{ scale: 0.998 }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={(e) => handleFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <div className="upload-icon">
            <UploadCloud size={36} />
          </div>
          <div className="upload-text">
            {uploading ? 'Uploading and analyzing...' : 'Drop your CSV here or click to browse'}
          </div>
          <div className="upload-hint">
            Supports .csv files up to 50MB
          </div>
        </motion.div>

        {repoFiles?.length > 0 && (
          <div className="repo-files-card" style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-medium)', 
            borderRadius: 'var(--radius-lg)', 
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} /> Repository Files
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '160px', overflowY: 'auto' }}>
              {repoFiles.map(file => (
                <button
                  key={file}
                  onClick={() => {
                    setFileName(file);
                    onRepoLoad(file);
                  }}
                  className="repo-file-btn"
                  style={{
                    padding: '0.6rem 0.8rem',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {file}
                </button>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Load CSVs directly from the project repository.
            </p>
          </div>
        )}
      </div>

      {fileName && columns?.length > 0 && (
        <motion.div
          className="file-info"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle2 size={18} color="var(--accent-emerald)" />
          <span className="file-name">{fileName}</span>
          <span className="file-badge">Loaded</span>
          <div className="column-tags" style={{ marginLeft: 'auto' }}>
            {columns.slice(0, 6).map((col) => (
              <span key={col} className="column-tag">{col}</span>
            ))}
            {columns.length > 6 && (
              <span className="column-tag">+{columns.length - 6} more</span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
