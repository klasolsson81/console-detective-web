# PowerShell script för att sätta upp User Secrets
# Kör detta script från ConsoleDetective.API-mappen

Write-Host "🔐 Setting up User Secrets..." -ForegroundColor Cyan

# JWT Secret
dotnet user-secrets set "Jwt:Secret" "SuperSecretDevelopmentKey_MinLangd32CharForDev123456789"
Write-Host "✅ JWT Secret configured" -ForegroundColor Green

# OpenAI API Key (ersätt med din riktiga key)
$openAIKey = Read-Host "Enter your OpenAI API Key (sk-...)"
if ($openAIKey) {
    dotnet user-secrets set "OpenAI:ApiKey" $openAIKey
    Write-Host "✅ OpenAI API Key configured" -ForegroundColor Green
} else {
    Write-Host "⚠️  Skipped OpenAI API Key (you can add it later)" -ForegroundColor Yellow
}

# Email (optional)
$configureEmail = Read-Host "Configure email settings? (y/N)"
if ($configureEmail -eq "y" -or $configureEmail -eq "Y") {
    $emailFrom = Read-Host "Email From Address"
    $emailPassword = Read-Host "Email App Password" -AsSecureString
    $emailPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($emailPassword))

    dotnet user-secrets set "Email:FromAddress" $emailFrom
    dotnet user-secrets set "Email:AppPassword" $emailPasswordPlain
    dotnet user-secrets set "Email:SmtpServer" "smtp.gmail.com"
    dotnet user-secrets set "Email:SmtpPort" "587"
    Write-Host "✅ Email settings configured" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 User Secrets setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To view your secrets, run:" -ForegroundColor Cyan
Write-Host "  dotnet user-secrets list" -ForegroundColor White
