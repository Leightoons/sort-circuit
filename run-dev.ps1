# Bypass PowerShell execution policy for this script only
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptPath

Write-Host "Starting Sort Circuit development environment..."

# Start server in a new PowerShell window
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File $scriptPath\run-server.ps1"

# Wait a moment for the server to start before launching client
Start-Sleep -Seconds 3

# Start client in a new PowerShell window
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File $scriptPath\run-client.ps1"

Write-Host "Both server and client have been started. Check the new PowerShell windows for output." 