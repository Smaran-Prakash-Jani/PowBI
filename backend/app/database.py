import pandas as pd
import sqlite3
import os

DB_PATH = "powbi_memory.db"


def init_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT,
            role TEXT,
            content TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    return conn


def load_csv_to_sqlite(file_path, table_name="uploaded_data"):
    """Converts CSV to SQLite for safe querying"""
    seps = [',', ';', '\t', '|']
    encodings = ['utf-8', 'latin-1', 'cp1252']
    df = None
    last_err = ""
    
    for enc in encodings:
        for sep in seps:
            try:
                # engine='python' is slower but much more robust to malformed/binary content
                temp_df = pd.read_csv(file_path, encoding=enc, sep=sep, engine='python', on_bad_lines='skip')
                if not temp_df.empty and len(temp_df.columns) >= 2:
                    df = temp_df
                    break
                elif df is None or (not temp_df.empty and len(temp_df.columns) > len(df.columns)):
                    df = temp_df # keep best attempt
            except Exception as e:
                last_err = str(e)
                continue
        if df is not None and len(df.columns) >= 2:
            break
            
    if df is None:
        raise ValueError(f"Failed to parse CSV with standard encodings: {last_err}")

    if df.empty:
        raise ValueError("Uploaded CSV is empty or parsing yielded no data.")
        
    if len(df.columns) < 2:
        # One last check: did we get anything at all?
        if len(df.columns) == 1:
             raise ValueError("CSV structure not recognized. Only 1 column found. Please check your file delimiters (headers should be comma-separated).")
        raise ValueError("CSV must contain at least 2 columns for meaningful analysis.")
        
    # drop unnamed columns instead of erroring
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
    
    if df.empty:
        raise ValueError("Uploaded CSV is empty after removing unnamed columns.")
        
    if len(df.columns) < 2:
        raise ValueError("CSV must contain at least 2 columns for meaningful analysis.")

    # Sanitize column names and make them unique
    new_cols = []
    seen = {}
    for c in df.columns:
        clean = str(c).lower().replace(" ", "_").replace("-", "_")
        if clean in seen:
            seen[clean] += 1
            clean = f"{clean}_{seen[clean]}"
        else:
            seen[clean] = 0
        new_cols.append(clean)
    df.columns = new_cols

    conn = init_db()
    df.to_sql(table_name, conn, if_exists="replace", index=False)

    columns = list(df.columns)
    row_count = len(df)

    # Generate automatic summary stats
    summary = generate_summary(df)

    conn.close()
    return columns, row_count, summary


def execute_sql(sql, params=None):
    """Safe SQL execution with error handling"""
    conn = init_db()
    try:
        df = pd.read_sql_query(sql, conn, params=params)
        conn.close()
        return df.to_dict("records"), True, None
    except Exception as e:
        conn.close()
        return [], False, str(e)


def generate_summary(df):
    """Auto-generate KPI summary from uploaded data"""
    summary = {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns": list(df.columns),
    }

    # Numeric KPIs
    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
    summary["numeric_columns"] = numeric_cols
    summary["kpis"] = []

    valid_kpi_cols = []
    for col in numeric_cols:
        cl = col.lower()
        if cl.endswith("_id") or cl == "id" or "year" in cl or "zip" in cl or "code" in cl or "lat" in cl or "lon" in cl:
            continue
        valid_kpi_cols.append(col)

    for col in valid_kpi_cols[:4]:  # Top 4 sensible numeric KPIs
        try:
            # Drop NaN and ensure numeric
            clean_series = pd.to_numeric(df[col], errors='coerce').dropna()
            if clean_series.empty:
                continue
            
            # Basic stats
            total_sum = float(clean_series.sum())
            avg_val = float(clean_series.mean())
            
            # formatting to avoid scientific notation
            summary["kpis"].append({
                "label": col.replace("_", " ").title(),
                "value": round(total_sum, 2) if abs(total_sum) < 1e12 else "Large Value",
                "mean": round(avg_val, 2),
                "min": round(float(clean_series.min()), 2),
                "max": round(float(clean_series.max()), 2),
            })
        except Exception as e:
            logger.warning(f"Skipping KPI for {col}: {e}")
            continue

    return summary


def save_conversation(user_email, role, content):
    """Save a chat message to history"""
    conn = init_db()
    conn.execute(
        "INSERT INTO conversations (user_email, role, content) VALUES (?, ?, ?)",
        (user_email, role, content)
    )
    conn.commit()
    conn.close()


def get_conversations(user_email, limit=50):
    """Retrieve chat history for a user"""
    conn = init_db()
    conn.row_factory = sqlite3.Row
    cursor = conn.execute(
        "SELECT role, content FROM conversations WHERE user_email = ? ORDER BY timestamp ASC LIMIT ?",
        (user_email, limit)
    )
    history = [{"role": row["role"], "content": row["content"]} for row in cursor.fetchall()]
    conn.close()
    return history
