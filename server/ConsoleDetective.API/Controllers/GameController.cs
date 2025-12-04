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

        public GameController(CaseService caseService, AIService aiService, AppDbContext context)
        {
            _caseService = caseService;
            _aiService = aiService;
            _context = context;
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

            return Ok(new 
            { 
                sessionId, 
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

        [HttpGet("leaderboard")]
        public async Task<ActionResult> GetLeaderboard()
        {
            try
            {
                var rawList = await _context.Leaderboard
                    .OrderByDescending(e => e.Score)
                    .Take(10)
                    .ToListAsync();

                var safeList = rawList.Select(e => new 
                {
                    e.Id,
                    e.PlayerName,
                    Score = e.Score,
                    Avatar = string.IsNullOrEmpty(e.Avatar) ? "man" : e.Avatar,
                    e.CompletedAt
                });

                return Ok(safeList);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Leaderboard error: {ex.Message}");
                return Ok(new List<object>());
            }
        }

        // === HÄR ÄR FIXEN FÖR ATT SPARA TILL TOPPLISTAN ===
        [HttpPost("leaderboard")]
        public async Task<ActionResult> SubmitScore([FromBody] LeaderboardEntry entry)
        {
            // 1. Säkra upp ID (om det saknas, skapa nytt)
            if (entry.Id == Guid.Empty) 
            {
                entry.Id = Guid.NewGuid();
            }

            // 2. Säkra upp Datum (Postgres kraschar av "år 0001")
            if (entry.CompletedAt == default)
            {
                entry.CompletedAt = DateTime.UtcNow;
            }

            // 3. Säkra upp Avatar och Namn
            if (string.IsNullOrEmpty(entry.Avatar)) entry.Avatar = "man";
            if (string.IsNullOrEmpty(entry.PlayerName)) entry.PlayerName = "Okänd";
            
            _context.Leaderboard.Add(entry);
            await _context.SaveChangesAsync();
            
            return Ok(entry);
        }
    }
}