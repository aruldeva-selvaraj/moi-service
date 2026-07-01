@echo off
echo Starting Moi Wedding Backend...
echo.

if not exist .env (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo Please update .env with your PostgreSQL credentials!
    echo.
)

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Starting FastAPI server on http://localhost:8000
echo API Docs available at http://localhost:8000/docs
echo.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
