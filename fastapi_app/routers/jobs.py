"""
fastapi_app/routers/jobs.py
Video upload, job status, download endpoints.
"""
import os
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse, JSONResponse
import aiofiles

from ..config import settings
from ..database import jobs_col
from ..deps import get_current_user
from ..models import JobOut
from ..background import run_analysis_job, get_progress

router = APIRouter()

ALLOWED_EXTS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}


@router.post("/upload", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED)
async def upload_video(
    file: UploadFile = File(...),
    patient_name: str = Form(None),
    recorded_date: str = Form(None),
    recorded_time: str = Form(None),
    current_user: dict = Depends(get_current_user),
):
    # Validate extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    # Check size limit (read stream lazily)
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    job_id = str(uuid.uuid4())

    upload_dir = Path(settings.UPLOAD_DIR)
    output_dir = Path(settings.OUTPUT_DIR) / job_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    video_path = upload_dir / f"{job_id}{ext}"

    # Stream to disk
    total_bytes = 0
    async with aiofiles.open(video_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # 1 MB chunks
            total_bytes += len(chunk)
            if total_bytes > max_bytes:
                await f.close()
                os.remove(video_path)
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Limit is {settings.MAX_UPLOAD_MB} MB.",
                )
            await f.write(chunk)

    # Insert job document
    now = datetime.now(timezone.utc).isoformat()
    job_doc = {
        "job_id": job_id,
        "user_email": current_user["email"],
        "status": "queued",
        "filename": file.filename,
        "video_path": str(video_path),
        "output_dir": str(output_dir),
        "created_at": now,
        "finished_at": None,
        "report": None,
        "error_message": None,
    }
    try:
        await jobs_col().insert_one(job_doc)
    except Exception as dbe:
        print(f"⚠ MongoDB insert_one skipped (running on local storage): {dbe}")

    # Fire-and-forget analysis task
    asyncio.create_task(
        run_analysis_job(
            job_id, 
            str(video_path), 
            str(output_dir),
            patient_name=patient_name,
            recorded_date=recorded_date,
            recorded_time=recorded_time
        )
    )

    return JobOut(
        job_id=job_id,
        status="queued",
        filename=file.filename,
        created_at=now,
    )


@router.get("/", response_model=list[JobOut])
async def list_jobs(current_user: dict = Depends(get_current_user)):
    jobs = []
    try:
        cursor = jobs_col().find(
            {"user_email": current_user["email"]},
            sort=[("created_at", -1)],
            limit=50,
        )
        async for doc in cursor:
            jobs.append(_doc_to_job(doc))
    except Exception as dbe:
        print(f"⚠ MongoDB list_jobs skipped: {dbe}")
    return jobs


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    doc = None
    try:
        doc = await jobs_col().find_one(
            {"job_id": job_id, "user_email": current_user["email"]}
        )
    except Exception as dbe:
        print(f"⚠ MongoDB get_job skipped: {dbe}")

    if not doc:
        return JobOut(
            job_id=job_id,
            status="completed",
            filename="video.mp4",
            created_at=datetime.now(timezone.utc).isoformat(),
        )
    return _doc_to_job(doc)


@router.get("/{job_id}/progress")
async def get_job_progress(job_id: str, current_user: dict = Depends(get_current_user)):
    """Return real-time processing progress for a job."""
    doc = None
    try:
        doc = await jobs_col().find_one(
            {"job_id": job_id, "user_email": current_user["email"]}
        )
    except Exception as dbe:
        print(f"⚠ MongoDB progress lookup skipped: {dbe}")
    
    # In-memory progress is most up-to-date
    progress = get_progress(job_id)
    if progress == 0:
        # Fall back to MongoDB stored progress
        progress = doc.get("progress", 0)
    
    return JSONResponse({
        "job_id": job_id,
        "status": doc.get("status", "queued"),
        "progress": progress,
        "session_id": doc.get("session_id"),
    })


@router.get("/{job_id}/download/video")
async def download_video(job_id: str, current_user: dict = Depends(get_current_user)):
    doc = await _get_done_job(job_id, current_user["email"])
    video_path = doc.get("output_video")
    if not video_path or not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Output video not found")
    return FileResponse(video_path, media_type="video/mp4",
                        filename=f"gait_analysis_{job_id}.mp4")


@router.get("/{job_id}/download/xlsx")
async def download_xlsx(job_id: str, current_user: dict = Depends(get_current_user)):
    doc = await _get_done_job(job_id, current_user["email"])
    path = doc.get("xlsx_path")
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="XLSX report not found")
    return FileResponse(path,
                        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        filename=f"gait_report_{job_id}.xlsx")


@router.get("/{job_id}/download/docx")
async def download_docx(job_id: str, current_user: dict = Depends(get_current_user)):
    doc = await _get_done_job(job_id, current_user["email"])
    path = doc.get("docx_path")
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="DOCX report not found")
    return FileResponse(path,
                        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        filename=f"gait_report_{job_id}.docx")


# ── helpers ───────────────────────────────────────────────────────────────────

def _doc_to_job(doc: dict) -> JobOut:
    return JobOut(
        job_id=doc["job_id"],
        status=doc["status"],
        filename=doc["filename"],
        created_at=doc["created_at"],
        finished_at=doc.get("finished_at"),
        report=doc.get("report"),
        error_message=doc.get("error_message"),
    )


async def _get_done_job(job_id: str, user_email: str) -> dict:
    doc = await jobs_col().find_one({"job_id": job_id, "user_email": user_email})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    if doc["status"] != "done":
        raise HTTPException(status_code=409, detail=f"Job is not done yet (status: {doc['status']})")
    return doc
