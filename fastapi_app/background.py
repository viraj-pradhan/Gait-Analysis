"""
fastapi_app/background.py
Background analysis worker: triggers run_session pipeline and updates Supabase job state.
Includes real-time progress updates via Supabase for frontend polling.

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

from .database import jobs_table

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
    output_dir: str = None,
    patient_name: str = None,
    recorded_date: str = None,
    recorded_time: str = None,
    user_email: str = None,
):
    """
    Run the full gait analysis pipeline as an async background task.
    Updates Supabase with status and progress.
    """
    try:
        # Mark as processing
        try:
            jobs_table().update({
                "status": "processing",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }).eq("job_id", job_id).execute()
        except Exception as dbe:
            print(f"⚠ Supabase update skipped: {dbe}")

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
                recorded_time=recorded_time,
                user_email=user_email,
                progress_callback=lambda pct: _progress.__setitem__(job_id, pct),
            )

        result = await loop.run_in_executor(None, _run)
        _progress[job_id] = 100

        # Determine output paths
        session_dir = result.get("session_dir", "")
        session_id = result.get("session_id", "")

        try:
            jobs_table().update({
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
            }).eq("job_id", job_id).execute()
        except Exception as dbe:
            print(f"⚠ Supabase update skipped: {dbe}")

    except Exception as e:
        traceback.print_exc()
        _progress[job_id] = -1
        try:
            jobs_table().update({
                "status": "failed",
                "error": str(e),
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("job_id", job_id).execute()
        except Exception:
            pass
