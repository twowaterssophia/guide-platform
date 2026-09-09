# Phase 1 validation
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$audit = Join-Path $root 'docs/design-audit'

$required = @(
  'README.md',
  'figma-audit.md',
  'current-project-baseline.md',
  'interaction-matrix.md',
  'design-tokens-draft.md',
  'implementation-inventory.md',
  'design-spec.md',
  'phase-1-checklist.md',
  'design-spec-visual-index.html'
)

$failed = $false
$blockedCritical = $false
foreach ($name in $required) {
  $path = Join-Path $audit $name
  if (-not (Test-Path -LiteralPath $path)) {
    Write-Error "Missing required file: $name"
    $failed = $true
    continue
  }
  if ((Get-Item -LiteralPath $path).Length -le 0) {
    Write-Error "Empty file: $name"
    $failed = $true
  }
}

$specPath = Join-Path $audit 'design-spec.md'
$spec = Get-Content -Raw -LiteralPath $specPath
if ($spec -notmatch '(?m)^# .*v1\.1\s*$') { Write-Error 'design-spec.md is not v1.1'; $failed = $true }
$requiredSections = @('## 1.', '## 2.', '## 3.', '## 4.', '## 6.', '## 7.', '## 8.', '## 10.', '## 11.', '## 12.')
foreach ($section in $requiredSections) {
  if ($spec -notmatch [regex]::Escape($section)) { Write-Error "Missing spec section: $section"; $failed = $true }
}

$checklistPath = Join-Path $audit 'phase-1-checklist.md'
$checklist = Get-Content -Raw -LiteralPath $checklistPath
if ($checklist.Contains('CRITICAL-10 [BLOCKED]')) { Write-Error 'CRITICAL-10 is still marked blocked'; $failed = $true }
elseif ($checklist -match '(?m)^- \[ \] CRITICAL-') { Write-Error 'Critical checklist item is unchecked'; $failed = $true }
if ($checklist -notmatch 'CRITICAL-10 Prototype') { Write-Error 'Prototype scope item is missing'; $failed = $true }

$readmePath = Join-Path $audit 'README.md'
$readme = Get-Content -Raw -LiteralPath $readmePath
if ($readme -notmatch 'PHASE1_STATUS: COMPLETE_WITH_RECORDED_NONCRITICAL_RISKS') { Write-Error 'README completion status marker is missing'; $failed = $true }
if ($readme -notmatch 'CRITICAL_PENDING: 0') { Write-Error 'README reports unresolved critical items'; $failed = $true }

$expected = @{
  'index.html' = '07A2E2171534B68CB7E75DF30DAE91EB46ECE2E8A7D0187037FA91919B8F1E8F'
  'src/app.js' = '9D2375D50AF8B5D4849919ED5FFF335E369418925172BBAECF81CDC2E57E2C5A'
  'src/styles.css' = 'AD00F3379FE73F7A65557266B2E1C21D74803FF2C3E8422F2C786E4F9C656B1A'
}
foreach ($rel in $expected.Keys) {
  $path = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $path)) { Write-Error "Missing core file: $rel"; $failed = $true; continue }
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToUpperInvariant()
  if ($actual -ne $expected[$rel]) { Write-Error "Core file hash changed: $rel"; $failed = $true }
}

if ($failed) {
  Write-Host 'Phase 1 validation failed: audit package is inconsistent.' -ForegroundColor Red
  exit 1
}
Write-Host 'Phase 1 validation passed.' -ForegroundColor Green
exit 0
