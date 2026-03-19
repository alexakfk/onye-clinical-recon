"""Vercel serverless entry point.

Vercel discovers this file at api/index.py and exposes the FastAPI
``app`` object as a serverless function.  The rewrite rule in
vercel.json routes all /api/* requests here.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app  # noqa: E402
