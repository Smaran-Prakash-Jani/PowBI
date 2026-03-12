from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import load_csv_to_sqlite, execute_sql, save_conversation, get_conversations
from app.agents import generate_query_json, generate_chart_config, self_healing_query_json, chat_response
from app.models import QueryRequest, ChatRequest, LoginRequest, RegisterRequest, StructuredQuery
from app.auth import register_user, login_user, get_current_user
from app.query_builder import build_sql_from_json
import traceback
import logging
import json
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("powbi")

app = FastAPI(title="PowBI", description="Enhanced Conversational BI Dashboard")

# CORS for Frontend — explicit origins, no credentials conflict
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global State (In Production, use Redis or DB)
current_columns = []
data_summary = {}


# ── Global error handler to ensure CORS headers on errors ────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )


# ── Auth Routes ──────────────────────────────────────────────
@app.post("/auth/register")
async def register(request: RegisterRequest):
    token, user = register_user(request.email, request.password, request.name, request.role)
    return {"token": token, "user": user}


@app.post("/auth/login")
async def login(request: LoginRequest):
    token, user = login_user(request.email, request.password)
    return {"token": token, "user": user}


@app.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {"email": user["sub"], "name": user["name"], "role": user["role"]}


# ── Data Routes ──────────────────────────────────────────────
@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    global current_columns, data_summary
    try:
        filepath = f"temp_{file.filename}"
        with open(filepath, "wb") as f:
            f.write(await file.read())

        cols, count, summary = load_csv_to_sqlite(filepath)
        current_columns = cols
        data_summary = summary
        logger.info(f"User {user['sub']} uploaded file {file.filename} with {count} rows.")
        return {
            "message": "Data loaded successfully",
            "columns": cols,
            "row_count": count,
            "summary": summary,
        }
    except ValueError as ve:
        logger.error(f"Upload validation failed: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Upload error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/summary")
async def get_summary(user=Depends(get_current_user)):
    if not data_summary:
        return {"message": "No data uploaded yet", "summary": {}, "columns": []}
    return {"summary": data_summary, "columns": current_columns}


@app.get("/data/files")
async def list_repo_files(user=Depends(get_current_user)):
    """List CSV files available in the backend/data directory"""
    data_dir = "data"
    if not os.path.exists(data_dir):
        return {"files": []}
    files = [f for f in os.listdir(data_dir) if f.endswith(".csv")]
    return {"files": files}


@app.post("/data/load")
async def load_repo_file(filename: str, user=Depends(get_current_user)):
    """Load a specific CSV file from the backend/data directory"""
    global current_columns, data_summary
    data_dir = "data"
    filepath = os.path.join(data_dir, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found in repository")
        
    try:
        cols, count, summary = load_csv_to_sqlite(filepath)
        current_columns = cols
        data_summary = summary
        logger.info(f"User {user['sub']} loaded repo file {filename} with {count} rows.")
        return {
            "message": f"Successfully loaded {filename}",
            "columns": cols,
            "row_count": count,
            "summary": summary,
        }
    except ValueError as ve:
        logger.error(f"Repo file load failed: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Repo file load error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query")
async def query_data(request: QueryRequest, user=Depends(get_current_user)):
    global current_columns
    if not current_columns:
        raise HTTPException(status_code=400, detail="Please upload a CSV first.")

    try:
        logger.info(f"User {user['sub']} requested query: {request.query}")
        
        # Step 1: Generate JSON string
        json_str = generate_query_json(request.query, current_columns, request.history)

        # Step 2: Self-Healing Loop (Max 3 attempts)
        success = False
        data = []
        sql = ""
        params = []
        last_error = ""
        query_dict = {}

        for attempt in range(3):
            try:
                # Clean up json output if it has markdown ticks
                clean_json_str = json_str.replace("```json", "").replace("```", "").strip()
                query_dict = json.loads(clean_json_str)
                query_obj = StructuredQuery(**query_dict)
                sql, params = build_sql_from_json(query_obj, current_columns)
                
                data, success, error = execute_sql(sql, params)
                if success:
                    logger.info(f"Successfully executed query for user {user['sub']}. SQL: {sql}")
                    break
                else:
                    last_error = error
                    json_str = self_healing_query_json(clean_json_str, current_columns, error)
            except Exception as e:
                last_error = str(e)
                clean_json_str = json_str.replace("```json", "").replace("```", "").strip()
                json_str = self_healing_query_json(clean_json_str, current_columns, last_error)

        if not success:
            logger.error(f"Failed to query data for user {user['sub']}. Last error: {last_error}")
            return {"error": f"Could not generate valid query after 3 attempts. Last error: {last_error}", "sql": sql}

        # Step 3: Generate Chart Config
        chart_config = generate_chart_config(data)

        # Include the JSON representation for transparency
        response_payload = {
            "data": data,
            "chart": chart_config,
            "sql": sql,
            "json": query_dict if query_dict else None,
            "explanation": query_dict.get("explanation", "Query generated successfully.") if query_dict else ""
        }
        
        # Save to database
        save_conversation(user['sub'], "user", request.query)
        save_conversation(user['sub'], "assistant", chart_config.get("summary", "Done") if chart_config else "Done")
        
        return response_payload
    except Exception as e:
        traceback.print_exc()
        logger.error(f"Unexpected error for user {user['sub']}: {str(e)}")
        return {"error": f"System error: {str(e)}", "sql": ""}


@app.post("/chat")
async def chat(request: ChatRequest, user=Depends(get_current_user)):
    global current_columns
    try:
        response = chat_response(request.message, current_columns, request.history)
        save_conversation(user['sub'], "user", request.message)
        save_conversation(user['sub'], "assistant", response)
        return {"response": response}
    except Exception as e:
        traceback.print_exc()
        return {"response": f"I encountered an error: {str(e)}. Please try again."}


@app.get("/history")
async def get_history(user=Depends(get_current_user)):
    try:
        history = get_conversations(user["sub"])
        return {"history": history}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok", "service": "PowBI"}
