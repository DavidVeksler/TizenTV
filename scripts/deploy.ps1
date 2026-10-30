# Build, sign, install and launch on the TV.  Usage: scripts\deploy.ps1 -TvIp 192.168.1.50 -Profile MyProfile [-Force]
# Needs `tizen` and `sdb` (Tizen Studio\tools\ide\bin and tools) on PATH.
param(
  [Parameter(Mandatory)][string]$TvIp,
  [Parameter(Mandatory)][string]$Profile,
  [switch]$Force
)
$ErrorActionPreference = 'Stop'
$AppId = 'FrameDash1.Dashboard'
$Target = "${TvIp}:26101"

Set-Location (Join-Path $PSScriptRoot '..')

function Run($cmd) { & $cmd[0] $cmd[1..($cmd.Length - 1)]; if ($LASTEXITCODE) { throw "failed: $($cmd -join ' ')" } }

# Preflight
foreach ($t in 'node', 'npm', 'tizen', 'sdb') { if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { throw "missing tool: $t" } }
if (git status --porcelain) { Write-Warning 'working tree is dirty' }

# Build + gates
Run 'npm', 'ci', '--no-audit', '--no-fund'
Run 'npm', 'run', 'typecheck'
Run 'npm', 'run', 'build'

if (-not $Force) {
  if ((Read-Host "Install and launch $AppId on $Target? [y/N]") -ne 'y') { throw 'aborted' }
}

# Package + sign
Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue
New-Item dist -ItemType Directory | Out-Null
Run 'tizen', 'package', '-t', 'wgt', '-s', $Profile, '-o', 'dist', '--', 'build/www'
$wgt = (Get-ChildItem dist\*.wgt | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
Write-Host "signed package: $wgt"

# Transfer + launch
Run 'sdb', 'connect', $TvIp
Run 'tizen', 'install', '-n', $wgt, '-s', $Target
Run 'tizen', 'run', '-p', $AppId, '-s', $Target
Write-Host "Launched $AppId on $Target"
