namespace ConsoleDetective.API.Models.DTOs.Auth
{
    // ==================== REQUEST DTOs ====================
    
    public record RegisterRequestDto
    {
        public string Username { get; init; } = string.Empty;
        public string Email { get; init; } = string.Empty;
        public string Password { get; init; } = string.Empty;
    }

    public record LoginRequestDto
    {
        public string Username { get; init; } = string.Empty;
        public string Password { get; init; } = string.Empty;
    }

    public record VerifyEmailRequestDto
    {
        public string Email { get; init; } = string.Empty;
        public string Code { get; init; } = string.Empty;
    }
}