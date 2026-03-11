import { Menu, Bell, Search, Moon, Sun, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function TopBar({ title, onMenuClick, user }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check initial state from local storage or system preference
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.body.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="top-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          className="menu-btn top-bar-btn"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>
        <h2 className="top-bar-title">{title}</h2>
      </div>

      <div className="top-bar-actions" style={{ position: 'relative' }}>
        <button className="top-bar-btn" title="Toggle Theme" onClick={toggleTheme}>
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="top-bar-btn" title="Search" onClick={() => {
          const q = prompt('Search dashboards/data:');
          if(q) alert(`Searching for "${q}"...`);
        }}>
          <Search size={18} />
        </button>
        <button className="top-bar-btn" title="Notifications" onClick={() => alert('You have 0 new notifications.')}>
          <Bell size={18} />
        </button>
        <button className="top-bar-btn" title="Settings" onClick={() => {
          const sDropdown = document.getElementById('settings-dropdown');
          const pDropdown = document.getElementById('profile-dropdown');
          if(pDropdown) pDropdown.style.display = 'none';
          if(sDropdown) sDropdown.style.display = sDropdown.style.display === 'none' ? 'block' : 'none';
        }}>
          <Settings size={18} />
        </button>
        <div 
          className="top-bar-avatar" 
          title={user?.name}
          onClick={() => {
            const pDropdown = document.getElementById('profile-dropdown');
            const sDropdown = document.getElementById('settings-dropdown');
            if(sDropdown) sDropdown.style.display = 'none';
            if(pDropdown) pDropdown.style.display = pDropdown.style.display === 'none' ? 'block' : 'none';
          }}
          style={{ cursor: 'pointer' }}
        >
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        
        {/* Settings Dropdown */}
        <div id="settings-dropdown" className="glass-card" style={{
          display: 'none',
          position: 'absolute',
          top: '120%',
          right: '50px',
          minWidth: '220px',
          zIndex: 50,
          padding: '1rem'
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Settings</div>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.5rem 0' }}/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem 0', color: 'var(--text-secondary)' }}>
            <span>UI Scale</span>
            <select style={{ background: 'var(--bg-input)', border: '1px solid var(--border-light)', color: 'var(--text-primary)', borderRadius: '4px', padding: '2px 4px' }}
             onChange={(e) => {
               document.documentElement.style.fontSize = e.target.value;
             }} defaultValue="16px">
              <option value="14px">Small</option>
              <option value="16px">Normal</option>
              <option value="18px">Large</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem 0', color: 'var(--text-secondary)' }}>
            <span>Animations</span>
            <input type="checkbox" defaultChecked />
          </div>
        </div>

        {/* Profile Dropdown */}
        <div id="profile-dropdown" className="glass-card" style={{
          display: 'none',
          position: 'absolute',
          top: '120%',
          right: 0,
          minWidth: '220px',
          zIndex: 50,
          padding: '1rem'
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name || 'Test User 2'}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{user?.role || 'Analyst'}</div>
          
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem 0', cursor: 'pointer' }} onClick={() => alert('Profile page coming soon')}>
            My Profile
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem 0', cursor: 'pointer' }} onClick={() => alert('Billing page coming soon')}>
            Billing
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.5rem 0' }}/>
          <button style={{
            background: 'none', border: 'none', color: '#ef4444', 
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0', width: '100%', textAlign: 'left', fontSize: '0.9rem'
          }} onClick={() => window.location.reload()}>
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
