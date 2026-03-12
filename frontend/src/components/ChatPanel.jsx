import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '/api';

export default function ChatPanel({ columns, token }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: '👋 Hi! I\'m your PowBI assistant. Upload a dataset and ask me anything about your data!' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (token && open) {
      axios.get(`${API}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => {
        if (res.data.history && res.data.history.length > 0) {
          // Map backend history (user/assistant) to frontend format (user/ai)
          const formatted = res.data.history.map(m => ({
            role: m.role === 'assistant' || m.role === 'ai' ? 'ai' : 'user',
            content: m.content
          }));
          setMessages([{ role: 'ai', content: '👋 Hi! I\'m your PowBI assistant. Here is your conversation history:' }, ...formatted]);
        }
      }).catch(() => {});
    }
  }, [token, open]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/chat`, {
        message: userMsg,
        history: messages.slice(-10).map((m) => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.content,
        })),
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMessages((prev) => [...prev, { role: 'ai', content: res.data.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', content: 'Sorry, I had trouble processing that. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) {
    return (
      <motion.button
        className="chat-fab"
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Open AI Chat"
      >
        <MessageCircle size={24} />
      </motion.button>
    );
  }

  return (
    <>
      <div 
        style={{ position: 'fixed', inset: 0, zIndex: 90 }} 
        onClick={() => setOpen(false)}
      />
      <motion.div
        className="chat-panel"
        style={{ zIndex: 100 }}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.25 }}
    >
      <div className="chat-header">
        <div className="chat-header-title">
          <Sparkles size={18} color="var(--accent-indigo-light)" />
          PowBI Assistant
          <span className="chat-dot" />
        </div>
        <button className="chat-close" onClick={() => setOpen(false)}>
          <X size={18} />
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            className={`chat-msg ${msg.role === 'user' ? 'user' : 'assistant'}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {msg.content}
          </motion.div>
        ))}
        {loading && (
          <div className="chat-msg assistant" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <Loader2 size={14} style={{ animation: 'spin-slow 1s linear infinite' }} />
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-wrap">
        <input
          className="input-field"
          type="text"
          placeholder="Ask anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          <Send size={16} />
        </button>
      </div>
    </motion.div>
    </>
  );
}
