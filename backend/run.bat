@echo off
call "%~dp0.venv\Scripts\activate.bat"
python -m uvicorn app.main:app --reload --port 8000
