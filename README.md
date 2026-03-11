# 🚀 PowBI - Professional AI Conversational Dashboard

PowBI is an enterprise-grade conversational BI tool that allows users to upload datasets and query them using natural language. It features automated SQL generation, real-time interactive charts (Bar, Line, Pie, Scatter), and a modern, premium UI.

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Plotly.js, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: FastAPI (Python), Pandas, SQLite, Gemini AI (Google), JWT Auth.

---

## ☁️ Deployment Instructions (Automated Setup)

### 1. Backend (On Render / Railway)
To fix the **Network Error**, your backend must be live. 
1. Create a "Web Service" on [Render.com](https://render.com).
2. Connect this GitHub repository.
3. **Build Command**: `pip install -r backend/requirements.txt`
4. **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables**:
   - `GEMINI_API_KEY`: `AIzaSyCOqNNpH5XPnB2xjQyu0Mfyp8T6t_Lk920` (Found in your local `.env`)
   - `GEMINI_MODEL`: `gemini-2.5-flash`
   - `JWT_SECRET`: `powbi_super_secret_key_change_in_production`

### 2. Frontend (On Netlify)
I have already added `netlify.toml` and `_redirects` to automate this.
1. Connect your GitHub to Netlify.
2. It will automatically detect the `frontend` base directory and build command.
3. **Environment Variables**:
   - `VITE_API_URL`: [Your Render Backend URL from Step 1]

---

## ✨ Features
- **Smart Chart Switching**: Change chart types instantly with on-screen buttons.
- **AI Analytics**: Backend automatically filters out years/IDs from KPIs to give you real business insights.
- **Auto-Minimize Chat**: Clicking outside the chat bubble minimizes it instantly.
- **Google Sign-In Mockup**: Professional auth flow ready for your Google Client ID.

## 📁 Project Structure
- `/frontend`: React source code and Netlify routing configs.
- `/backend`: FastAPI service, Gemini AI agents, and SQL logic.
- `netlify.toml`: Root config to handle monorepo deployment automatically.
