from google import genai
from google.genai import types
import os
import json
from dotenv import load_dotenv
from app.semantic_layer import get_semantic_context
from app.models import StructuredQuery

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
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
    """Wrapper for Gemini API calls — fast, no-thinking mode"""
    response = client.models.generate_content(
        model=MODEL, contents=prompt, config=GENERATE_CONFIG
    )
    return response.text.strip()


def generate_query_json(user_query, columns, history=None):
    """Convert natural language to StructuredQuery JSON using Gemini"""
    context = get_semantic_context(columns)
    prompt = f"""You are an expert data analyst. Table schema: {context}
Convert the user request: "{user_query}" into a structured JSON query.
Rules: 
- Use ONLY existing columns. 
- For aggregations, put the function directly in the select string or order_by string (e.g., 'SUM(sales)').
- Provide a clear, natural language 'explanation' of your logic (e.g., 'Grouping by region and summing sales to find the top performers.').
"""
    if history:
        prompt += f"\nContext: {json.dumps(history[-3:])}"

    response = client.models.generate_content(
        model=MODEL, contents=prompt, config=JSON_GENERATE_CONFIG
    )
    return response.text.strip()


# ── Time keywords for detecting time-series data ──
_TIME_WORDS = {"date", "time", "month", "year", "day", "week", "quarter", "period", "created", "updated"}


def generate_chart_config(data):
    """Rule-based chart config — instant, no LLM call needed"""
    if not data:
        return None

    keys = list(data[0].keys())
    if len(keys) < 2:
        return {"chart_type": "bar", "x_key": keys[0], "y_key": keys[0],
                "title": "Data Overview", "summary": f"{len(data)} results."}

    # Detect numeric vs categorical columns
    numeric_keys = []
    cat_keys = []
    for k in keys:
        vals = [row.get(k) for row in data[:10] if row.get(k) is not None]
        if vals and all(isinstance(v, (int, float)) for v in vals):
            numeric_keys.append(k)
        else:
            cat_keys.append(k)

    x_key = cat_keys[0] if cat_keys else keys[0]
    y_key = numeric_keys[0] if numeric_keys else keys[1] if len(keys) > 1 else keys[0]

    # Detect time-series
    is_time = any(tw in x_key.lower() for tw in _TIME_WORDS)

    # Choose chart type
    n_rows = len(data)
    if is_time:
        chart_type = "line"
    elif n_rows <= 7 and len(cat_keys) >= 1 and len(numeric_keys) >= 1:
        chart_type = "pie"
    elif len(numeric_keys) >= 2 and len(cat_keys) == 0:
        chart_type = "scatter"
        x_key = numeric_keys[0]
        y_key = numeric_keys[1]
    else:
        chart_type = "bar"

    # Build title from column names
    title = f"{y_key.replace('_', ' ').title()} by {x_key.replace('_', ' ').title()}"

    # Quick insight
    if numeric_keys:
        vals = [row.get(y_key, 0) for row in data if isinstance(row.get(y_key), (int, float))]
        if vals:
            top_row = max(data, key=lambda r: r.get(y_key, 0) if isinstance(r.get(y_key), (int, float)) else 0)
            summary = f"Highest {y_key}: {top_row.get(x_key)} ({top_row.get(y_key):,.0f})"
        else:
            summary = f"{n_rows} data points retrieved."
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
