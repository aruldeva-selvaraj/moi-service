@echo off
echo Starting Moi Wedding Frontend...
echo.

if not exist node_modules (
    echo Installing npm dependencies...
    npm install
)

echo Starting Angular dev server on http://localhost:4200
echo.
npm start
