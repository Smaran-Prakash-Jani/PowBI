import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, CheckCircle2 } from 'lucide-react';

export default function UploadZone({ onUpload, columns }) {
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
      <motion.div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
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
