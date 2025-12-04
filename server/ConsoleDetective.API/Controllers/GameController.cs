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
            // Skapa ett unikt ID för denna spelsession (för frontend chatten)
            var sessionId = Guid.NewGuid().ToString();
            
            var categories = new[] { "Mord", "Bankrån", "Inbrott", "Otrohet" };

            // FIX: Vi skickar "guest-user" som userId istället för sessionId.
            // Detta gör att databasen kopplar fallen till vår statiska gäst-användare
            // så att Foreign Key-constraint inte kraschar.
            var tasks = categories.Select(async category => 
            {
                var generatedData = await _aiService.GenerateCaseAsync(category);
                // VIKTIGT: Första parametern är userId ("guest-user"), andra är datan
                return await _caseService.CreateCaseAsync("guest-user", generatedData);
            });

            var cases = await Task.WhenAll(tasks);

            return Ok(new 
            { 
                sessionId, // Frontend får fortfarande sitt unika session ID
                cases = cases.Select(c => new { 
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
            var topList = await _context.Leaderboard
                .OrderByDescending(e => e.Score)
                .Take(10)
                .ToListAsync();
            return Ok(topList);
        }

        [HttpPost("leaderboard")]
        public async Task<ActionResult> SubmitScore([FromBody] LeaderboardEntry entry)
        {
            _context.Leaderboard.Add(entry);
            await _context.SaveChangesAsync();
            return Ok(entry);
        }
    }
}