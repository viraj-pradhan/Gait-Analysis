import os
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import jobs_col
from .routers import auth, jobs

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]
if hasattr(settings, "CORS_ORIGINS") and settings.CORS_ORIGINS:
    origins.extend([o.strip() for o in settings.CORS_ORIGINS if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(origins)),
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(jobs.router, prefix=f"{settings.API_V1_STR}/jobs", tags=["jobs"])

# Mount static files for sessions directory
SESSIONS_DIR = Path(__file__).parent.parent / "sessions"
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/sessions", StaticFiles(directory=str(SESSIONS_DIR)), name="sessions")


@app.get("/api/sessions")
async def list_sessions():
    """Read root index.json from sessions directory."""
    index_file = SESSIONS_DIR / "index.json"
    if not index_file.exists():
        return []
    try:
        with open(index_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sessions/{date_str}/{session_num}")
async def get_session_detail(date_str: str, session_num: str):
    """Read meta.json and report_data.json from sessions/<date>/<session>/."""
    session_dir = SESSIONS_DIR / date_str / session_num
    if not session_dir.exists():
        raise HTTPException(status_code=404, detail="Session directory not found")

    meta_file = session_dir / "meta.json"
    data_file = session_dir / "report_data.json"

    if not meta_file.exists():
        raise HTTPException(status_code=404, detail="Session metadata file not found")

    with open(meta_file, "r", encoding="utf-8") as f:
        meta = json.load(f)

    report = None
    if data_file.exists():
        with open(data_file, "r", encoding="utf-8") as f:
            report = json.load(f)

    return {
        "meta": meta,
        "report": report,
        "images": {
            "comprehensive": f"/sessions/{date_str}/{session_num}/gait_analysis_comprehensive.png",
            "knee": f"/sessions/{date_str}/{session_num}/knee_analysis_detailed.png",
            "hip": f"/sessions/{date_str}/{session_num}/hip_analysis_detailed.png",
            "ankle": f"/sessions/{date_str}/{session_num}/ankle_analysis_detailed.png",
        },
        "docx_url": f"/sessions/{date_str}/{session_num}/report.docx",
        "csv_url": f"/sessions/{date_str}/{session_num}/gait_analysis_data.csv",
    }


@app.patch("/api/sessions/{date_str}/{session_num}")
async def update_session_patient_name(
    date_str: str, 
    session_num: str, 
    payload: dict = Body(...)
):
    """Update patient name in meta.json, index.json, and DB."""
    session_dir = SESSIONS_DIR / date_str / session_num
    meta_file = session_dir / "meta.json"
    index_file = SESSIONS_DIR / "index.json"

    if not meta_file.exists():
        raise HTTPException(status_code=404, detail="Session metadata file not found")

    new_patient_name = payload.get("patient_name")
    if not new_patient_name:
        raise HTTPException(status_code=400, detail="patient_name is required")

    # Update meta.json
    with open(meta_file, "r", encoding="utf-8") as f:
        meta = json.load(f)

    meta["patient_name"] = new_patient_name
    num = meta.get("session_number", session_num.replace("session_", ""))
    meta["session_label"] = f"Session {num} — {new_patient_name} ({date_str})"

    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    # Update report_data.json & regenerate report.docx
    if data_file.exists():
        try:
            from report_module import generate_docx_report
            with open(data_file, "r", encoding="utf-8") as f:
                report_data = json.load(f)
            report_data["patient_name"] = new_patient_name
            report_data["session_label"] = meta["session_label"]
            with open(data_file, "w", encoding="utf-8") as f:
                json.dump(report_data, f, indent=2)

            report_docx = session_dir / "report.docx"
            comp_png = session_dir / "gait_analysis_comprehensive.png"
            knee_png = session_dir / "knee_analysis_detailed.png"
            hip_png = session_dir / "hip_analysis_detailed.png"
            ankle_png = session_dir / "ankle_analysis_detailed.png"

            generate_docx_report(
                report_data=report_data,
                out_path=str(report_docx),
                comprehensive_png=str(comp_png) if comp_png.exists() else None,
                knee_png=str(knee_png) if knee_png.exists() else None,
                hip_png=str(hip_png) if hip_png.exists() else None,
                ankle_png=str(ankle_png) if ankle_png.exists() else None,
            )
        except Exception as e:
            print(f"⚠ Warning: Could not regenerate report.docx: {e}")

    # Update index.json
    if index_file.exists():
        with open(index_file, "r", encoding="utf-8") as f:
            index = json.load(f)

        session_id = f"{date_str}/{session_num}"
        for i, entry in enumerate(index):
            if entry.get("session_id") == session_id:
                index[i]["patient_name"] = new_patient_name
                index[i]["session_label"] = meta["session_label"]
                break

        with open(index_file, "w", encoding="utf-8") as f:
            json.dump(index, f, indent=2)

    # Update MongoDB jobs collection if matching session_id
    try:
        await jobs_col().update_many(
            {"session_id": f"{date_str}/{session_num}"},
            {"$set": {"patient_name": new_patient_name}}
        )
    except Exception:
        pass

    return {"status": "success", "meta": meta}


@app.delete("/api/sessions/{date_str}/{session_num}")
@app.delete("/api/sessions/{session_id:path}")
async def delete_session(date_str: str = None, session_num: str = None, session_id: str = None):
    """Permanently delete a session directory, all its stored files, index record, and DB job entry."""
    import shutil

    if date_str and session_num:
        full_session_id = f"{date_str}/{session_num}"
    elif session_id:
        full_session_id = session_id
    else:
        raise HTTPException(status_code=400, detail="Invalid session identifier")

    parts = full_session_id.split("/")
    if len(parts) == 2:
        date_part, session_part = parts
        session_dir = SESSIONS_DIR / date_part / session_part
    else:
        session_dir = SESSIONS_DIR / full_session_id

    # 1. Delete physical directory and all stored files
    deleted_files = False
    if session_dir.exists():
        try:
            shutil.rmtree(session_dir)
            deleted_files = True
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete session files: {e}")

    # 2. Remove from index.json
    index_file = SESSIONS_DIR / "index.json"
    if index_file.exists():
        try:
            with open(index_file, "r", encoding="utf-8") as f:
                index = json.load(f)

            new_index = [entry for entry in index if entry.get("session_id") != full_session_id]

            with open(index_file, "w", encoding="utf-8") as f:
                json.dump(new_index, f, indent=2)
        except Exception as e:
            print(f"⚠ Warning: Failed to update index.json on session delete: {e}")

    # 3. Remove from MongoDB jobs collection
    try:
        await jobs_col().delete_many({
            "$or": [
                {"session_id": full_session_id},
                {"_id": full_session_id}
            ]
        })
    except Exception:
        pass

    # 4. Cleanup empty date dir if no sessions left
    if len(parts) == 2:
        date_dir = SESSIONS_DIR / parts[0]
        if date_dir.exists() and not any(date_dir.iterdir()):
            try:
                date_dir.rmdir()
            except Exception:
                pass

    return {
        "status": "success", 
        "deleted_session_id": full_session_id, 
        "files_removed": deleted_files
    }


@app.delete("/api/patients/{patient_id}")
async def delete_patient(patient_id: str):
    """Permanently delete all sessions associated with a patient."""
    import shutil
    index_file = SESSIONS_DIR / "index.json"
    if not index_file.exists():
        return {"status": "success", "deleted_count": 0}

    with open(index_file, "r", encoding="utf-8") as f:
        index = json.load(f)

    # Match patient by slugified name or exact patient_name
    def is_match(entry):
        p_name = entry.get("patient_name") or "Unassigned"
        p_slug = p_name.lower().replace(" ", "-")
        return p_slug == patient_id.lower() or p_name.lower() == patient_id.lower()

    to_delete = [entry for entry in index if is_match(entry)]
    remaining = [entry for entry in index if not is_match(entry)]

    deleted_count = 0
    for entry in to_delete:
        session_id = entry.get("session_id")
        if session_id:
            date_part, session_part = session_id.split("/")
            s_dir = SESSIONS_DIR / date_part / session_part
            if s_dir.exists():
                try:
                    shutil.rmtree(s_dir)
                except Exception:
                    pass
            try:
                await jobs_col().delete_many({"session_id": session_id})
            except Exception:
                pass
            deleted_count += 1

    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(remaining, f, indent=2)

    return {"status": "success", "deleted_count": deleted_count}


@app.get("/")
def root():
    return {"message": "AquaGait API is running"}

