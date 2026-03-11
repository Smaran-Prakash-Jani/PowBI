import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('powbi_token'));

  useEffect(() => {
    const savedUser = localStorage.getItem('powbi_user');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        handleLogout();
      }
    }
  }, []);

  const handleLogin = (tkn, usr) => {
    setToken(tkn);
    setUser(usr);
    localStorage.setItem('powbi_token', tkn);
    localStorage.setItem('powbi_user', JSON.stringify(usr));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('powbi_token');
    localStorage.removeItem('powbi_user');
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />
        }
      />
      <Route
        path="/*"
        element={
          user ? (
            <Dashboard user={user} token={token} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
