# Bypass PowerShell execution policy for this script only
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptPath

# Navigate to client directory and start the React app
Write-Host "Starting the Sort Circuit client..."
Set-Location client
npx react-scripts start 