using ConsoleDetective.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace ConsoleDetective.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SpeechController : ControllerBase
    {
        private readonly TextToSpeechService _ttsService;
        private readonly ILogger<SpeechController> _logger;

        public SpeechController(TextToSpeechService ttsService, ILogger<SpeechController> logger)
        {
            _ttsService = ttsService;
            _logger = logger;
        }

        /// <summary>
        /// Genererar tal från text med ElevenLabs
        /// </summary>
        /// <param name="request">Text och optional voice ID</param>
        /// <returns>MP3 audio-fil</returns>
        [HttpPost("generate")]
        public async Task<IActionResult> GenerateSpeech([FromBody] GenerateSpeechRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Text))
                    return BadRequest(new { error = "Text får inte vara tom" });

                // Om inget voiceId anges, använd Jonas (svenska rösten)
                var voiceId = string.IsNullOrWhiteSpace(request.VoiceId)
                    ? TextToSpeechService.SwedishVoiceJonas
                    : request.VoiceId;

                _logger.LogInformation("Begäran om tal-generering (längd: {Length})", request.Text.Length);

                var audioData = await _ttsService.GenerateSpeechAsync(request.Text, voiceId);

                // Om TTS misslyckades, returnera 503 Service Unavailable
                if (audioData == null || audioData.Length == 0)
                {
                    _logger.LogWarning("TTS-tjänsten returnerade null för text: {Text}", request.Text);
                    return StatusCode(503, new { error = "TTS-tjänsten är för tillfället inte tillgänglig. Spelet fortsätter utan ljud." });
                }

                // Returnera som MP3-fil
                return File(audioData, "audio/mpeg", "speech.mp3");
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning("Ogiltig begäran: {Message}", ex.Message);
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid tal-generering");
                return StatusCode(500, new { error = "Kunde inte generera tal. Kontrollera API-nyckel och försök igen." });
            }
        }

        /// <summary>
        /// Hämtar cache-statistik (för debugging)
        /// </summary>
        [HttpGet("cache-stats")]
        public IActionResult GetCacheStats()
        {
            var size = _ttsService.GetCacheSize();
            return Ok(new { cachedItems = size });
        }

        /// <summary>
        /// Rensar audio-cachen (för att frigöra minne)
        /// </summary>
        [HttpPost("clear-cache")]
        public IActionResult ClearCache()
        {
            _ttsService.ClearCache();
            _logger.LogInformation("Audio-cache rensad via API");
            return Ok(new { message = "Cache rensad" });
        }
    }

    // Request DTO
    public class GenerateSpeechRequest
    {
        public string Text { get; set; } = string.Empty;
        public string? VoiceId { get; set; }
    }
}
