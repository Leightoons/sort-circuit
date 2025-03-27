# Bypass PowerShell execution policy for this script only
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptPath

# Run the server directly with Node
Write-Host "Starting the Sort Circuit server..."
node server/index.js 