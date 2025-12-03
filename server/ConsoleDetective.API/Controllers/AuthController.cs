using ConsoleDetective.API.Services;
using ConsoleDetective.API.Models.DTOs.Auth;
using Microsoft.AspNetCore.Mvc;

namespace ConsoleDetective.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(AuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        // ==================== REGISTRERA ====================
        [HttpPost("register")]
        public async Task<ActionResult> Register([FromBody] RegisterRequestDto request)
        {
            try
            {
                var (success, message, user) = await _authService.RegisterAsync(
                    request.Username,
                    request.Email,
                    request.Password
                );

                if (!success)
                    return BadRequest(new { message });

                return Ok(new
                {
                    message,
                    userId = user?.Id,
                    username = user?.Username
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid registrering");
                return StatusCode(500, new { message = "Ett fel uppstod vid registrering" });
            }
        }

        // ==================== LOGGA IN ====================
        [HttpPost("login")]
        public async Task<ActionResult> Login([FromBody] LoginRequestDto request)
        {
            try
            {
                var (success, message, token, user) = await _authService.LoginAsync(
                    request.Username,
                    request.Password
                );

                if (!success)
                    return Unauthorized(new { message });

                return Ok(new
                {
                    token,
                    user = new
                    {
                        id = user!.Id,
                        username = user.Username,
                        email = user.Email,
                        points = user.Points
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid inloggning");
                return StatusCode(500, new { message = "Ett fel uppstod vid inloggning" });
            }
        }

        // ==================== VERIFIERA E-POST ====================
        [HttpPost("verify-email")]
        public async Task<ActionResult> VerifyEmail([FromBody] VerifyEmailRequestDto request)
        {
            try
            {
                var (success, message) = await _authService.VerifyEmailAsync(
                    request.Email,
                    request.Code
                );

                if (!success)
                    return BadRequest(new { message });

                return Ok(new { message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid e-postverifiering");
                return StatusCode(500, new { message = "Ett fel uppstod vid verifiering" });
            }
        }
    }

}