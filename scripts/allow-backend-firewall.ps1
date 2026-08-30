#Requires -RunAsAdministrator

$ruleName = "BIOS backend TCP 5000"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if (-not $existingRule) {
  $rule = New-NetFirewallRule `
    -DisplayName $ruleName `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 5000 `
    -Profile Private `
    -ErrorAction Stop
  if ($rule) {
    Write-Host "Windows Firewall rule created for TCP port 5000."
  }
} else {
  Write-Host "Windows Firewall rule already exists for TCP port 5000."
}