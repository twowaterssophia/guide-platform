[CmdletBinding()]
param(
  [switch]$Foreground,
  [switch]$SkipDatabase
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDirectory = Join-Path $env:LOCALAPPDATA 'Guide\logs'

function Resolve-Pnpm {
  # Prefer a normal pnpm installation available on PATH.
  $command = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
  if (-not $command) {
    $command = Get-Command pnpm -ErrorAction SilentlyContinue
  }
  if ($command) {
    return [pscustomobject]@{
      Path = $command.Source
      PrefixArguments = @()
    }
  }

  # Also check the locations commonly used by npm/pnpm on Windows.
  $candidates = @(
    (Join-Path $env:APPDATA 'npm\pnpm.cmd'),
    (Join-Path $env:LOCALAPPDATA 'pnpm\pnpm.cmd'),
    (Join-Path $projectRoot 'node_modules\.bin\pnpm.cmd')
  ) | Where-Object { Test-Path -LiteralPath $_ }
  if ($candidates) {
    return [pscustomobject]@{
      Path = $candidates[0]
      PrefixArguments = @()
    }
  }

  # Corepack ships with Node.js and can provide pnpm when no shim is on PATH.
  $corepack = Get-Command corepack.cmd -ErrorAction SilentlyContinue
  if ($corepack) {
    Write-Warning 'pnpm was not found directly; trying Node.js Corepack (it may download pnpm the first time).'
    return [pscustomobject]@{
      Path = $corepack.Source
      PrefixArguments = @('pnpm')
    }
  }

  throw 'pnpm was not found. Install pnpm with Corepack (run: corepack enable), then run this script again.'
}

$pnpmInfo = Resolve-Pnpm
$pnpm = $pnpmInfo.Path
$pnpmPrefixArguments = [string[]]$pnpmInfo.PrefixArguments

function Get-LanIPv4 {
  $configuration = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
    Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } |
    Select-Object -First 1
  if ($configuration) {
    return $configuration.IPv4Address |
      Select-Object -First 1 -ExpandProperty IPAddress
  }
  return Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.InterfaceAlias -notmatch 'WSL|Loopback|vEthernet'
    } |
    Select-Object -First 1 -ExpandProperty IPAddress
}

function Ensure-LanFirewallRule {
  $ruleName = 'Guide development servers (LAN)'
  try {
    $rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if (-not $rule) {
      New-NetFirewallRule `
        -DisplayName $ruleName `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort 5173,5174 `
        -RemoteAddress LocalSubnet `
        -Profile Any `
        -ErrorAction Stop | Out-Null
      Write-Host 'Windows Firewall: allowed ports 5173 and 5174 from the local subnet.'
    } else {
      Write-Host 'Windows Firewall: the LAN rule already exists.'
    }
  } catch {
    Write-Warning 'Could not create the Windows Firewall rule automatically. Run this script as Administrator or allow TCP 5173 and 5174 from the local subnet manually.'
  }
}

function Get-ListeningPid([int]$Port) {
  $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($null -eq $listener) {
    return $null
  }
  return [int]$listener.OwningProcess
}

function Wait-ForPort([int]$Port, [int]$TimeoutSeconds = 30) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $listenerPid = Get-ListeningPid $Port
    if ($listenerPid) {
      return $listenerPid
    }
    Start-Sleep -Milliseconds 250
  } while ((Get-Date) -lt $deadline)

  throw "Service did not listen on port $Port within $TimeoutSeconds seconds."
}

function Start-LocalDatabase {
  if (Get-ListeningPid 5432) {
    Write-Host 'PostgreSQL already running: 127.0.0.1:5432'
    return
  }
  if ($SkipDatabase) {
    throw 'PostgreSQL is not running and -SkipDatabase was specified.'
  }

  $docker = (Get-Command docker.exe -ErrorAction Stop).Source
  & $docker compose up -d postgres
  $null = Wait-ForPort 5432 45
  Write-Host 'PostgreSQL ready: 127.0.0.1:5432'
}

function Start-GuideService([string]$Name, [int]$Port, [string[]]$Arguments) {
  $existingPid = Get-ListeningPid $Port
  if ($existingPid) {
    Write-Host "$Name already running: http://127.0.0.1:$Port/ (PID $existingPid)"
    return
  }

  New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
  $slug = $Name.ToLowerInvariant().Replace(' ', '-')
  $stdout = Join-Path $logDirectory "$slug.out.log"
  $stderr = Join-Path $logDirectory "$slug.err.log"
  $process = Start-Process -FilePath $pnpm -ArgumentList ($pnpmPrefixArguments + $Arguments) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru

  try {
    $listenerPid = Wait-ForPort $Port
    Write-Host "$Name started: http://127.0.0.1:$Port/ (PID $listenerPid)"
  } catch {
    if ($process.HasExited) {
      throw "${Name} failed to start (exit code $($process.ExitCode)). Logs: $stderr"
    }
    throw
  }
}

Start-LocalDatabase
Ensure-LanFirewallRule
$lanAddress = Get-LanIPv4

if ($Foreground) {
  & $pnpm @($pnpmPrefixArguments + @('--parallel', '--stream', 'dev'))
  exit $LASTEXITCODE
}

Start-GuideService 'Guide API' 3000 @('--filter', '@guide/api', 'dev')
Start-GuideService 'Guide Console' 5173 @('--filter', '@guide/console', 'dev')
Start-GuideService 'Guide Agent' 5174 @('--filter', '@guide/agent', 'dev')

Write-Host 'URLs:'
Write-Host '  Console: http://127.0.0.1:5173/'
Write-Host '  Agent:   http://127.0.0.1:5174/'
if ($lanAddress) {
  Write-Host "  LAN Console: http://${lanAddress}:5173/"
  Write-Host "  LAN Agent:   http://${lanAddress}:5174/"
} else {
  Write-Warning 'Could not detect a LAN IPv4 address. Run ipconfig and use the active Wi-Fi IPv4 address.'
}
Write-Host "Logs: $logDirectory"
