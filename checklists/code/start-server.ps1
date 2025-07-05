# Start HTTP Server for Checklist Application
# This script starts a Python HTTP server on port 8080

Write-Host "Starting HTTP Server for Checklist Application..." -ForegroundColor Green
Write-Host "Server will be available at: http://localhost:8080" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
Write-Host ""

# Change to the correct directory (where this script is located)
Set-Location $PSScriptRoot

# Start the Python HTTP server
try {
    python -m http.server 8080
}
catch {
    Write-Host "Error starting server: $_" -ForegroundColor Red
    Write-Host "Make sure Python is installed and available in your PATH" -ForegroundColor Yellow
    pause
}
