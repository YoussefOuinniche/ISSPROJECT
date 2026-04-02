param(
  [int]$Port = 8081,
  [ValidateSet("lan", "localhost", "tunnel")]
  [string]$HostMode = "lan"
)

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileDir = Join-Path $repoRoot "Skill-Pulse-1\artifacts\mobile"

if (-not (Test-Path $mobileDir)) {
  throw "Mobile app directory not found: $mobileDir"
}

$env:MOBILE_PORT = "$Port"
$env:MOBILE_HOST = $HostMode
pnpm --dir $mobileDir run start
