using ConsoleDetective.API.Models.DTOs.Case;
using ConsoleDetective.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ConsoleDetective.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CaseController : ControllerBase
    {
        private readonly CaseService _caseService;
        private readonly AIService _aiService;
        private readonly ILogger<CaseController> _logger;

        public CaseController(
            CaseService caseService,
            AIService aiService,
            ILogger<CaseController> logger)
        {
            _caseService = caseService;
            _aiService = aiService;
            _logger = logger;
        }

        /// <summary>
        /// Hämta alla användarens fall
        /// </summary>
        [HttpGet]
        [Authorize]
        public async Task<ActionResult<List<CaseResponseDto>>> GetAllCases()
        {
            var userId = GetUserId();
            var cases = await _caseService.GetUserCasesAsync(userId);
            var caseDtos = cases.Select(c => MapToCaseResponseDto(c)).ToList();
            return Ok(caseDtos);
        }

        /// <summary>
        /// Hämta ett specifikt fall
        /// </summary>
        [HttpGet("{caseId}")]
        public async Task<ActionResult<CaseResponseDto>> GetCase(Guid caseId)
        {
            var userId = GetUserId();
            var caseData = await _caseService.GetCaseByIdAsync(caseId, userId);

            if (caseData == null)
                return NotFound(new { message = "Fall hittades inte" });

            var caseDto = MapToCaseResponseDto(caseData);
            return Ok(caseDto);
        }

        /// <summary>
        /// Skapa nytt AI-genererat fall
        /// </summary>
        [HttpPost("generate")]
        public async Task<ActionResult<CaseResponseDto>> GenerateCase(
            [FromBody] GenerateCaseRequestDto request)
        {
            try
            {
                var userId = GetUserId();
                
                // Validera kategori
                if (!IsValidCategory(request.Category))
                    return BadRequest(new { message = "Ogiltig kategori" });

                // Generera fall via AI
                var generatedCase = await _aiService.GenerateCaseAsync(request.Category);
                
                // Spara i databas
                var savedCase = await _caseService.CreateCaseAsync(userId, generatedCase);

                _logger.LogInformation(
                    "Nytt fall genererat: {CaseId} för användare {UserId}",
                    savedCase.Id,
                    userId);

                var caseDto = MapToCaseResponseDto(savedCase);
                return CreatedAtAction(
                    nameof(GetCase),
                    new { caseId = savedCase.Id },
                    caseDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid generering av fall");
                return StatusCode(500, new { message = "Ett fel uppstod vid skapande av fallet" });
            }
        }

        /// <summary>
        /// Undersök brottsplats (generera ledtråd via AI)
        /// </summary>
        [HttpPost("{caseId}/investigate")]
        public async Task<ActionResult<ClueDto>> InvestigateLocation(Guid caseId)
        {
            try
            {
                var userId = GetUserId();
                var caseData = await _caseService.GetCaseByIdAsync(caseId, userId);

                if (caseData == null)
                    return NotFound(new { message = "Fall hittades inte" });

                if (caseData.IsCompleted)
                    return BadRequest(new { message = "Fallet är redan avslutat" });

                // Generera ledtråd via AI
                var clue = await _aiService.GenerateInvestigationClueAsync(caseData);

                // Spara ledtråd
                var savedClue = await _caseService.AddClueAsync(caseId, clue);

                // Mappa till DTO för att undvika circular reference
                var clueDto = new ClueDto
                {
                    Id = savedClue.Id,
                    Text = savedClue.Text,
                    Type = savedClue.Type,
                    DiscoveredAt = savedClue.DiscoveredAt,
                    AssignedToSuspect = savedClue.AssignedToSuspect
                };

                return Ok(clueDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid undersökning av brottsplats");
                return StatusCode(500, new { message = "Ett fel uppstod vid undersökningen" });
            }
        }

/// <summary>
        /// Gör en anklagelse
        /// </summary>
        [HttpPost("{caseId}/accuse")]
        public async Task<ActionResult<AccusationResultDto>> MakeAccusation(
            Guid caseId,
            [FromBody] AccusationRequestDto request)
        {
            try
            {
                var userId = GetUserId();
                
                // Hämta resultatet (nu med 3 värden)
                var (isCorrect, pointsChange, guiltyParty) = await _caseService.MakeAccusationAsync(caseId, userId, request.SuspectName);
                
                // Bygg ett komplett svar
                var resultDto = new AccusationResultDto
                {
                    IsCorrect = isCorrect,
                    PointsAwarded = pointsChange,
                    AccusedSuspect = request.SuspectName,
                    GuiltyParty = guiltyParty, // <-- Här skickar vi med namnet!
                    Message = isCorrect ? "Rätt gissat! Bra jobbat." : "Tyvärr, det var fel."
                };

                return Ok(resultDto);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid anklagelse");
                return StatusCode(500, new { message = "Ett fel uppstod" });
            }
        }

        // Helper methods
        private string GetUserId()
        {
            // För guest-användare, returnera ett temporärt ID
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                // Guest mode - använd en temporär guest ID
                return "guest-user";
            }
            return userId;
        }

        private bool IsValidCategory(string category)
        {
            var validCategories = new[] { "Mord", "Bankrån", "Inbrott", "Otrohet" };
            return validCategories.Contains(category);
        }

        private CaseResponseDto MapToCaseResponseDto(Models.Domain.Case caseEntity)
        {
            return new CaseResponseDto
            {
                Id = caseEntity.Id,
                Title = caseEntity.Title,
                Category = caseEntity.Category,
                Description = caseEntity.Description,
                Location = caseEntity.Location,
                PossibleSuspects = caseEntity.PossibleSuspects,
                IsCompleted = caseEntity.IsCompleted,
                IsSolved = caseEntity.IsSolved,
                CreatedAt = caseEntity.CreatedAt,
                Clues = caseEntity.Clues.Select(c => new ClueDto
                {
                    Id = c.Id,
                    Text = c.Text,
                    Type = c.Type,
                    DiscoveredAt = c.DiscoveredAt,
                    AssignedToSuspect = c.AssignedToSuspect
                }).ToList()
            };
        }
    }

}