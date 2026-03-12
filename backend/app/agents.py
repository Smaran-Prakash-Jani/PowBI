from google import genai
from google.genai import types
import os
import json
from dotenv import load_dotenv
from app.semantic_layer import get_semantic_context
from app.models import StructuredQuery

load_dotenv()

import random
import time

load_dotenv()

class KeyRotator:
    def __init__(self):
        keys_str = os.getenv("GEMINI_API_KEYS", os.getenv("GEMINI_API_KEY", ""))
        self.keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        self.current_index = 0
        if not self.keys:
            raise ValueError("No GEMINI_API_KEY or GEMINI_API_KEYS found in .env")
            
    def get_client(self):
        # Round-robin rotation
        key = self.keys[self.current_index]
        self.current_index = (self.current_index + 1) % len(self.keys)
        return genai.Client(api_key=key)

rotator = KeyRotator()
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Disable "thinking" for speed — 2.5 Flash thinking adds latency
GENERATE_CONFIG = types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(thinking_budget=0),
    temperature=0.1,
)

JSON_GENERATE_CONFIG = types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(thinking_budget=0),
    temperature=0.1,
    response_mime_type="application/json",
    response_schema=StructuredQuery,
)


def _generate(prompt: str) -> str:
    """Wrapper for Gemini API calls with auto-retry on rate limits"""
    for attempt in range(len(rotator.keys) * 2):
        try:
            client = rotator.get_client()
            response = client.models.generate_content(
                model=MODEL, contents=prompt, config=GENERATE_CONFIG
            )
            return response.text.strip()
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                continue
            raise e
    raise Exception("All API keys exhausted or rate-limited.")


def generate_query_json(user_query, columns, history=None):
    """Convert natural language to StructuredQuery JSON using Gemini"""
    context = get_semantic_context(columns)
    prompt = f"""You are an elite Data Analyst at a top-tier BI firm. Table schema: {context}

Task: Convert the user request: "{user_query}" into a high-precision structured JSON query.

CRITICAL RULES:
1. NO PLACEHOLDERS: Never return a dummy value like '2024' because you can't find a column. If a column is missing, use the most relevant one from the schema.
2. AGGREGATIONS: Use standard SQL functions: SUM(), AVG(), COUNT(), MAX(), MIN().
3. CALCULATIONS (e.g., ROI): If the user asks for ROI, use `(SUM(revenue) - SUM(cost)) / SUM(cost) * 100` if those columns exist.
4. EXACT COLUMNS: Only use columns from the Available Columns list provided above.
5. EXPLANATION: Be professional. Explain the business logic behind your SQL choices.
"""
    if history:
        prompt += f"\nContext from previous messages: {json.dumps(history[-3:])}"

    for attempt in range(len(rotator.keys) * 2):
        try:
            client = rotator.get_client()
            response = client.models.generate_content(
                model=MODEL, contents=prompt, config=JSON_GENERATE_CONFIG
            )
            return response.text.strip()
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                continue
            raise e
    raise Exception("Rate limit reached for all keys.")


# ── Time keywords for detecting time-series data ──
_TIME_WORDS = {"date", "time", "month", "year", "day", "week", "quarter", "period", "created", "updated"}


def self_healing_query_json(failed_json_str, columns, error):
    """Auto-fix failed JSON queries by feeding error back to Gemini with rotation"""
    prompt = f"""The following structured JSON query failed. 
Table Schema: {get_semantic_context(columns)}
Failed JSON: {failed_json_str}
Error: {error}

Task: Provide the corrected JSON query. 
Rules: 
- FIX the syntax or column names.
- NO PLACEHOLDERS.
- Use valid SQL for calculations.
"""
    for attempt in range(len(rotator.keys) * 2):
        try:
            client = rotator.get_client()
            response = client.models.generate_content(
                model=MODEL, contents=prompt, config=JSON_GENERATE_CONFIG
            )
            return response.text.strip()
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                continue
            raise e
    return failed_json_str


def generate_chart_config(data):
    """Rule-based chart config — instant, now with improved heuristics for single-values"""
    if not data:
        return None

    keys = list(data[0].keys())
    if len(keys) < 2:
        # Prevent crash/black bars on single column results
        val_name = keys[0].replace("_", " ").title()
        return {"chart_type": "bar", "x_key": keys[0], "y_key": keys[0],
                "title": f"Count of {val_name}", "summary": f"{len(data)} results found."}

    # Detect numeric vs categorical columns
    numeric_keys = []
    cat_keys = []
    for k in keys:
        # Check first few rows for type
        vals = [row.get(k) for row in data[:20] if row.get(k) is not None]
        if vals and all(isinstance(v, (int, float)) for v in vals):
            # Special case: don't treat 'Year' or 'ID' as Y-axis metrics if possible
            kl = k.lower()
            if "id" in kl or "year" in kl or "zip" in kl:
                 cat_keys.append(k)
            else:
                numeric_keys.append(k)
        else:
            cat_keys.append(k)

    # Smart fallback selection
    x_key = cat_keys[0] if cat_keys else keys[0]
    y_key = numeric_keys[0] if numeric_keys else keys[1] if len(keys) > 1 else keys[0]

    # Detect time-series
    is_time = any(tw in x_key.lower() for tw in _TIME_WORDS)

    # Choose chart type
    n_rows = len(data)
    if is_time:
        chart_type = "line"
    elif n_rows <= 1:
        chart_type = "bar" # Single bar
    elif n_rows <= 8 and len(cat_keys) >= 1 and len(numeric_keys) >= 1:
        chart_type = "pie"
    elif len(numeric_keys) >= 2 and len(cat_keys) == 0:
        chart_type = "scatter"
        x_key = numeric_keys[0]
        y_key = numeric_keys[1]
    else:
        chart_type = "bar"

    # Build title from column names
    title = f"{y_key.replace('_', ' ').title()} by {x_key.replace('_', ' ').title()}"

    # Insight generation
    summary = ""
    if numeric_keys and n_rows > 0:
        try:
            valid_vals = [r.get(y_key, 0) for r in data if isinstance(r.get(y_key), (int, float))]
            if valid_vals:
                total = sum(valid_vals)
                avg = total / len(valid_vals)
                top_row = max(data, key=lambda r: r.get(y_key, 0) if isinstance(r.get(y_key), (int, float)) else -float('inf'))
                summary = f"Total {y_key.title()}: {total:,.0f} | Avg: {avg:,.0f} | Peak: {top_row.get(x_key)} ({top_row.get(y_key):,.0f})"
            else:
                summary = f"Displayed {n_rows} rows from the dataset."
        except:
            summary = f"Analyzed {n_rows} items."
    else:
        summary = f"{n_rows} results retrieved."

    return {"chart_type": chart_type, "x_key": x_key, "y_key": y_key,
            "title": title, "summary": summary}


def self_healing_query_json(failed_json_str, columns, error):
    """Auto-fix failed JSON queries by feeding error back to Gemini"""
    prompt = f"""The following structured JSON query failed or was invalid. Fix it.

Failed JSON: {failed_json_str}
Error Message: {error}
Schema: {get_semantic_context(columns)}

Output ONLY the corrected JSON query. Ensure it strictly adheres to the schema.
"""
    response = client.models.generate_content(
        model=MODEL, contents=prompt, config=JSON_GENERATE_CONFIG
    )
    return response.text.strip()


def chat_response(message, columns, history=None):
    """General-purpose chatbot powered by Gemini with data context"""
    context = ""
    if columns:
        context = f"""You have access to a dataset with these columns: {', '.join(columns)}.
Table name: uploaded_data
{get_semantic_context(columns)}
"""

    prompt = f"""You are PowBI Assistant, an intelligent BI chatbot.
{context}
You help users understand their data, suggest analyses, and answer questions.

Guidelines:
- Be concise but insightful
- Suggest specific queries the user could try
- If asked about data, reference the available columns
- Use markdown formatting for clarity
- If the user asks to visualize or query data, suggest they type their question in the query input
- Be friendly and professional

User message: {message}
"""
    if history:
        recent = history[-5:]
        prompt += f"\nConversation history: {json.dumps(recent)}"

    return _generate(prompt)
