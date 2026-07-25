"""
fastapi_app/background.py
Background analysis worker: triggers run_session pipeline and updates MongoDB job state.
Includes real-time progress updates via MongoDB for frontend polling.
"""
import os
import asyncio
import traceback
from datetime import datetime, timezone
from pathlib import Path
import sys

# Insert project root into sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from .database import jobs_col
from run_session import process_single_video


# In-memory progress store (job_id -> percent)
_progress: dict[str, int] = {}


def get_progress(job_id: str) -> int:
    """Return current progress percent for a job."""
    return _progress.get(job_id, 0)


async def run_analysis_job(
    job_id: str, 
    video_path: str, 
    output_dir: str, 
    patient_name: str = None, 
    recorded_date: str = None, 
    recorded_time: str = None
):
    """
    Async background runner that executes session analysis and updates MongoDB.
    """
    try:
        _progress[job_id] = 0

        await jobs_col().update_one(
            {"job_id": job_id},
            {"$set": {"status": "processing", "progress": 0}},
        )

        loop = asyncio.get_event_loop()

        # Build a progress callback that updates in-memory store + MongoDB
        def make_progress_cb():
            def cb(pct, frame, total):
                _progress[job_id] = pct
                # Fire-and-forget async MongoDB update from sync context
                try:
                    loop.call_soon_threadsafe(
                        asyncio.ensure_future,
                        jobs_col().update_one(
                            {"job_id": job_id},
                            {"$set": {"progress": pct}}
                        )
                    )
                except Exception:
                    pass
            return cb

        # Run process_single_video in executor
        meta_entry = await loop.run_in_executor(
            None,
            _run_session_sync,
            video_path,
            recorded_date,
            patient_name or "Unknown Patient",
            recorded_time,
            make_progress_cb()
        )

        _progress[job_id] = 100

        await jobs_col().update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": meta_entry.get("status", "done"),
                    "progress": 100,
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "session_id": meta_entry.get("session_id"),
                    "patient_name": meta_entry.get("patient_name"),
                    "recorded_date": meta_entry.get("recorded_date"),
                    "recorded_time": meta_entry.get("recorded_time"),
                    "cadence_spm": meta_entry.get("cadence_spm"),
                    "mean_confidence": meta_entry.get("mean_confidence"),
                    "report_docx": meta_entry.get("report_docx"),
                }
            },
        )
    except Exception as exc:
        tb = traceback.format_exc()
        _progress.pop(job_id, None)
        await jobs_col().update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "error",
                    "progress": 0,
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "error_message": str(exc),
                    "traceback": tb,
                }
            },
        )


def _run_session_sync(video_path, date_str, patient_name, time_str, progress_cb=None):
    return process_single_video(
        video_path=Path(video_path),
        date_str=date_str,
        patient_name=patient_name,
        time_str=time_str,
        progress_callback=progress_cb
    )
