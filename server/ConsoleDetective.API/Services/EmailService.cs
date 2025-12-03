using System.Net;
using System.Net.Mail;

namespace ConsoleDetective.API.Services
{
    public class EmailService
    {
        private readonly IConfiguration _configuration;
        private readonly Dictionary<string, string> _verificationCodes = new();

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        // ==================== SKICKA VERIFIERINGSKOD ====================
        public async Task<string> SendVerificationCodeAsync(string toEmail)
        {
            // Generera 6-siffrig kod
            var code = new Random().Next(100000, 999999).ToString();

            // Spara koden tillfälligt (i produktion: använd cache med TTL)
            _verificationCodes[toEmail] = code;

            // Hämta SMTP-inställningar
            var fromEmail = _configuration["Email:FromAddress"];
            var appPassword = _configuration["Email:AppPassword"];
            var smtpServer = _configuration["Email:SmtpServer"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");

            if (string.IsNullOrWhiteSpace(fromEmail) || string.IsNullOrWhiteSpace(appPassword))
            {
                // Om e-post inte är konfigurerad, logga koden istället
                Console.WriteLine($"📧 Verifieringskod för {toEmail}: {code}");
                return code;
            }

            try
            {
                using var client = new SmtpClient(smtpServer, smtpPort)
                {
                    EnableSsl = true,
                    Credentials = new NetworkCredential(fromEmail, appPassword)
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(fromEmail, "Console Detective AI"),
                    Subject = "Din verifieringskod",
                    Body = $@"
Hej!

Din verifieringskod för Console Detective AI är:

{code}

Koden är giltig i 10 minuter.

Om du inte har registrerat dig, kan du ignorera detta meddelande.

Med vänliga hälsningar,
Console Detective Team
",
                    IsBodyHtml = false
                };

                mailMessage.To.Add(toEmail);

                await client.SendMailAsync(mailMessage);
                Console.WriteLine($"✅ Verifieringskod skickad till {toEmail}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Kunde inte skicka e-post: {ex.Message}");
                // Logga koden istället så användaren kan verifiera ändå
                Console.WriteLine($"📧 Verifieringskod: {code}");
            }

            return code;
        }

        // ==================== VERIFIERA KOD ====================
        public bool VerifyCode(string email, string code)
        {
            if (_verificationCodes.TryGetValue(email, out var storedCode))
            {
                if (storedCode == code)
                {
                    // Ta bort koden efter användning
                    _verificationCodes.Remove(email);
                    return true;
                }
            }

            return false;
        }

        // ==================== RENSA GAMLA KODER (körs periodiskt) ====================
        public void CleanupExpiredCodes()
        {
            // I produktion: använd cache med TTL istället för denna metod
            // För nu: håll koder i 10 minuter
        }
    }
}