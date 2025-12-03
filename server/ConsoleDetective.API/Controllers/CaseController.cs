using ConsoleDetective.API.Models.DTOs.Case;
using ConsoleDetective.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ConsoleDetective.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Kräver JWT-token
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
        public async Task<ActionResult<List<CaseResponseDto>>> GetAllCases()
        {
            var userId = GetUserId();
            var cases = await _caseService.GetUserCasesAsync(userId);
            return Ok(cases);
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

            return Ok(caseData);
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

                return CreatedAtAction(
                    nameof(GetCase), 
                    new { caseId = savedCase.Id }, 
                    savedCase);
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
        public async Task<ActionResult<InvestigationResultDto>> InvestigateLocation(Guid caseId)
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
                var result = await _caseService.AddClueAsync(caseId, clue);

                return Ok(result);
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
                var result = await _caseService.MakeAccusationAsync(caseId, userId, request.SuspectName);
                
                return Ok(result);
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
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                ?? throw new UnauthorizedAccessException("Användare ej autentiserad");
        }

        private bool IsValidCategory(string category)
        {
            var validCategories = new[] { "Mord", "Bankrån", "Inbrott", "Otrohet" };
            return validCategories.Contains(category);
        }
    }

}