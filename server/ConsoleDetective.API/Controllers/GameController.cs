using ConsoleDetective.API.Data;
using ConsoleDetective.API.Models.Domain;
using ConsoleDetective.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ConsoleDetective.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GameController : ControllerBase
    {
        private readonly CaseService _caseService;
        private readonly AIService _aiService;
        private readonly AppDbContext _context;
        private readonly TextToSpeechService _ttsService;

        public GameController(CaseService caseService, AIService aiService, AppDbContext context, TextToSpeechService ttsService)
        {
            _caseService = caseService;
            _aiService = aiService;
            _context = context;
            _ttsService = ttsService;
        }

        [HttpPost("start-session")]
        public async Task<ActionResult> StartSession()
        {
            await _caseService.EnsureGuestUserExistsAsync();

            var sessionId = Guid.NewGuid().ToString();
            var categories = new[] { "Mord", "Bankrån", "Inbrott", "Otrohet" };

            var generationTasks = categories.Select(category => _aiService.GenerateCaseAsync(category));
            var generatedDataList = await Task.WhenAll(generationTasks);

            var savedCases = new List<Case>();
            foreach (var data in generatedDataList)
            {
                var newCase = await _caseService.CreateCaseAsync("guest-user", data);
                savedCases.Add(newCase);
            }

            // Generera narration audio för alla case descriptions
            string? narrationAudioBase64 = null;
            try
            {
                // Kombinera alla beskrivningar till en narration
                var introText = "Fyra nya fall har rapporterats. ";
                var descriptionsText = string.Join(" ... ", savedCases.Select(c => $"{c.Category}: {c.Description}"));
                var fullNarration = introText + descriptionsText;

                // Generera TTS audio
                var audioBytes = await _ttsService.GenerateSpeechAsync(fullNarration);
                narrationAudioBase64 = Convert.ToBase64String(audioBytes);
            }
            catch (Exception ex)
            {
                // Om TTS misslyckas, logga men fortsätt ändå (narration är optional)
                Console.WriteLine($"⚠️ TTS-generering misslyckades: {ex.Message}");
            }

            return Ok(new
            {
                sessionId,
                narrationAudio = narrationAudioBase64,
                cases = savedCases.Select(c => new {
                    c.Id,
                    c.Title,
                    c.Category,
                    c.Description,
                    c.Location,
                    c.PossibleSuspects,
                    c.IsCompleted,
                    c.IsSolved
                })
            });
        }

        // === HÄR ÄR FIXEN FÖR 500-FELET ===
        [HttpGet("leaderboard")]
        public async Task<ActionResult> GetLeaderboard()
        {
            try
            {
                // Vi hämtar datan och hanterar eventuella NULL-värden direkt
                var rawList = await _context.Leaderboard
                    .OrderByDescending(e => e.Score)
                    .Take(10)
                    .ToListAsync();

                // Mappa om listan säkert så att Avatar aldrig är null
                var safeList = rawList.Select(e => new 
                {
                    e.Id,
                    e.PlayerName,
                    Score = e.Score,
                    // Om Avatar är null/tom, sätt "man" som default
                    Avatar = string.IsNullOrEmpty(e.Avatar) ? "man" : e.Avatar,
                    e.CompletedAt
                });

                return Ok(safeList);
            }
            catch (Exception ex)
            {
                // Om något ändå går fel, returnera tom lista istället för att krascha appen
                Console.WriteLine($"Leaderboard error: {ex.Message}");
                return Ok(new List<object>());
            }
        }

        [HttpPost("leaderboard")]
        public async Task<ActionResult> SubmitScore([FromBody] LeaderboardEntry entry)
        {
            // Säkra upp så att avatar alltid har ett värde
            if (string.IsNullOrEmpty(entry.Avatar)) entry.Avatar = "man";
            
            _context.Leaderboard.Add(entry);
            await _context.SaveChangesAsync();
            return Ok(entry);
        }
    }
}