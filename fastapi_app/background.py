"""
fastapi_app/background.py
Background analysis worker: triggers run_session pipeline and updates MongoDB job state.
Includes real-time progress updates via MongoDB for frontend polling.

IMPORTANT: Heavy imports (run_session, mediapipe, cv2) are deferred to job
execution time so FastAPI can start even if those packages are missing.
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

# NOTE: Do NOT import run_session at top level.
# It pulls in mediapipe/cv2/scipy which may not be available on all containers.
# Import lazily inside run_analysis_job() instead.


# In-memory progress store (job_id -> percent)
_progress: dict[str, int] = {}


def get_progress(job_id: str) -> int:
    """Return current progress percent for a job."""
    return _progress.get(job_id, 0)


async def run_analysis_job(
    job_id: str, 
    video_path: str, 
    patient_name: str = None,
    recorded_date: str = None,
):
    """
    Run the full gait analysis pipeline as an async background task.
    Updates MongoDB with status and progress.
    """
    col = jobs_col()

    try:
        # Mark as processing
        await col.update_one(
            {"_id": job_id},
            {"$set": {"status": "processing", "started_at": datetime.now(timezone.utc).isoformat()}},
        )
        _progress[job_id] = 5

        # Lazy import — only when we actually need to run analysis
        try:
            from run_session import process_single_video
        except ImportError as ie:
            raise RuntimeError(
                f"Analysis dependencies not available: {ie}. "
                "Ensure mediapipe, opencv, scipy are installed."
            )

        # Run CPU-bound pipeline in thread pool
        loop = asyncio.get_running_loop()
        _progress[job_id] = 10

        def _run():
            return process_single_video(
                video_path,
                patient_name=patient_name,
                recorded_date=recorded_date,
                progress_callback=lambda pct: _progress.__setitem__(job_id, pct),
            )

        result = await loop.run_in_executor(None, _run)
        _progress[job_id] = 100

        # Determine output paths
        session_dir = result.get("session_dir", "")
        session_id = result.get("session_id", "")

        await col.update_one(
            {"_id": job_id},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "session_id": session_id,
                "session_dir": session_dir,
                "result": {
                    "video": result.get("video_path", ""),
                    "xlsx": result.get("xlsx_path", ""),
                    "docx": result.get("docx_path", ""),
                    "session_id": session_id,
                },
            }},
        )

    except Exception as e:
        traceback.print_exc()
        _progress[job_id] = -1
        try:
            await col.update_one(
                {"_id": job_id},
                {"$set": {
                    "status": "failed",
                    "error": str(e),
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
        except Exception:
            pass
