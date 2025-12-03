using ConsoleDetective.API.Data;
using ConsoleDetective.API.Models.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace ConsoleDetective.API.Services
{
    public class AuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly EmailService _emailService;

        public AuthService(AppDbContext context, IConfiguration configuration, EmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
        }

        // ==================== REGISTRERA NY ANVÄNDARE ====================
        public async Task<(bool Success, string Message, User? User)> RegisterAsync(
            string username, 
            string email, 
            string password)
        {
            // Validera input
            if (string.IsNullOrWhiteSpace(username) || username.Length < 3)
                return (false, "Användarnamn måste vara minst 3 tecken", null);

            if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
                return (false, "Ogiltig e-postadress", null);

            if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
                return (false, "Lösenord måste vara minst 8 tecken", null);

            // Kontrollera om användare redan finns
            if (await _context.Users.AnyAsync(u => u.Username == username))
                return (false, "Användarnamn är redan taget", null);

            if (await _context.Users.AnyAsync(u => u.Email == email))
                return (false, "E-postadress är redan registrerad", null);

            // Skapa ny användare
            var user = new User
            {
                Username = username,
                Email = email,
                PasswordHash = HashPassword(password),
                IsVerified = false // Kräver e-postverifiering
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Skicka verifieringskod
            await _emailService.SendVerificationCodeAsync(email);

            return (true, "Användare skapad! Kolla din e-post för verifieringskod.", user);
        }

        // ==================== LOGGA IN ====================
        public async Task<(bool Success, string Message, string? Token, User? User)> LoginAsync(
            string username, 
            string password)
        {
            // Hitta användare
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == username);

            if (user == null)
                return (false, "Fel användarnamn eller lösenord", null, null);

            // Verifiera lösenord
            if (!VerifyPassword(password, user.PasswordHash))
                return (false, "Fel användarnamn eller lösenord", null, null);

            // Kolla om användaren är verifierad
            if (!user.IsVerified)
                return (false, "E-postadress ej verifierad", null, null);

            // Generera JWT token
            var token = GenerateJwtToken(user);

            return (true, "Inloggning lyckades", token, user);
        }

        // ==================== VERIFIERA E-POST ====================
        public async Task<(bool Success, string Message)> VerifyEmailAsync(string email, string code)
        {
            var isValid = _emailService.VerifyCode(email, code);

            if (!isValid)
                return (false, "Felaktig verifieringskod");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            
            if (user == null)
                return (false, "Användare hittades inte");

            user.IsVerified = true;
            await _context.SaveChangesAsync();

            return (true, "E-post verifierad!");
        }

        // ==================== HASH PASSWORD ====================
        private string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        }

        // ==================== VERIFY PASSWORD ====================
        private bool VerifyPassword(string password, string storedHash)
        {
            var passwordHash = HashPassword(password);
            return passwordHash == storedHash;
        }

        // ==================== GENERATE JWT TOKEN ====================
        private string GenerateJwtToken(User user)
        {
            var secret = _configuration["Jwt:Secret"] 
                ?? throw new InvalidOperationException("JWT Secret saknas");
            var issuer = _configuration["Jwt:Issuer"] ?? "ConsoleDetectiveAPI";
            var audience = _configuration["Jwt:Audience"] ?? "ConsoleDetectiveClient";
            var expirationMinutes = int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "1440");

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}