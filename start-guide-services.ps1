[CmdletBinding()]
param(
  [switch]$Foreground
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $projectRoot 'serve-static.cjs'
$node = (Get-Command node.exe -ErrorAction Stop).Source

function Get-ListeningPid([int]$Port) {
  foreach ($line in (netstat -ano -p tcp)) {
    if ($line -match "^\s*TCP\s+127\.0\.0\.1:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$") {
      return [int]$Matches[1]
    }
  }
  return $null
}

function Start-Preview([string]$Name, [string]$PageRoot, [int]$Port) {
  $existingPid = Get-ListeningPid $Port
  if ($existingPid) {
    Write-Host "$Name already running: http://127.0.0.1:$Port/ (PID $existingPid)"
    return
  }

  $arguments = @($serverScript, '--root', $PageRoot, '--port', $Port)
  if ($Foreground) {
    & $node @arguments
    return
  }

  $process = Start-Process -FilePath $node -ArgumentList $arguments -WorkingDirectory $PageRoot -WindowStyle Hidden -PassThru
  for ($attempt = 0; $attempt -lt 20; $attempt += 1) {
    Start-Sleep -Milliseconds 250
    $listenerPid = Get-ListeningPid $Port
    if ($listenerPid) {
      Write-Host "$Name started: http://127.0.0.1:$Port/ (PID $listenerPid)"
      return
    }
    if ($process.HasExited) {
      throw "$Name failed to start (exit code $($process.ExitCode))"
    }
  }

  throw "$Name did not start listening on port $Port"
}

Start-Preview 'Guide backend' $projectRoot 4173
Start-Preview 'Guide Agent' (Join-Path $projectRoot 'booster-app-agent') 4174
Write-Host 'URLs:'
Write-Host '  http://127.0.0.1:4173/'
Write-Host '  http://127.0.0.1:4174/'
