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
            // 1. Skapa gäst-användare om den saknas
            await _caseService.EnsureGuestUserExistsAsync();

            var sessionId = Guid.NewGuid().ToString();
            var categories = new[] { "Mord", "Bankrån", "Inbrott", "Otrohet" };

            // 2. Generera data parallellt
            var generationTasks = categories.Select(category => _aiService.GenerateCaseAsync(category));
            var generatedDataList = await Task.WhenAll(generationTasks);

            // 3. Spara till DB sekventiellt (för att undvika krasch)
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
            try {
                var topList = await _context.Leaderboard
                    .OrderByDescending(e => e.Score)
                    .Take(10)
                    .ToListAsync();
                return Ok(topList);
            } catch {
                return Ok(new List<object>()); 
            }
        }

        [HttpPost("leaderboard")]
        public async Task<ActionResult> SubmitScore([FromBody] LeaderboardEntry entry)
        {
            if (string.IsNullOrEmpty(entry.Avatar)) entry.Avatar = "man";
            _context.Leaderboard.Add(entry);
            await _context.SaveChangesAsync();
            return Ok(entry);
        }
    }
}