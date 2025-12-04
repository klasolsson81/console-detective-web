using ConsoleDetective.API.Models.DTOs.Chat;
using ConsoleDetective.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ConsoleDetective.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly ChatService _chatService;
        private readonly CaseService _caseService;
        private readonly ILogger<ChatController> _logger;

        public ChatController(
            ChatService chatService,
            CaseService caseService,
            ILogger<ChatController> logger)
        {
            _chatService = chatService;
            _caseService = caseService;
            _logger = logger;
        }

        /// <summary>
        /// Starta ett nytt förhör med en misstänkt
        /// </summary>
        [HttpPost("start-interrogation")]
        public async Task<ActionResult<InterrogationSessionDto>> StartInterrogation(
            [FromBody] StartInterrogationRequestDto request)
        {
            try
            {
                var userId = GetUserId();
                
                // Verifiera att fallet existerar och tillhör användaren
                var caseData = await _caseService.GetCaseByIdAsync(request.CaseId, userId);
                if (caseData == null)
                    return NotFound(new { message = "Fall hittades inte" });

                // Verifiera att den misstänkta finns i fallet
                if (!caseData.PossibleSuspects.Contains(request.SuspectName))
                    return BadRequest(new { message = "Misstänkt hittades inte i detta fall" });

                // Skapa förhörssession
                var session = await _chatService.CreateInterrogationSessionAsync(
                    caseData,
                    request.SuspectName);

                // Mappa till DTO för att undvika circular reference
                var sessionDto = new InterrogationSessionDto
                {
                    SessionId = session.Id,
                    CaseId = session.CaseId,
                    SuspectName = session.SuspectName,
                    StartedAt = session.StartedAt,
                    Messages = new List<ChatMessageDto>()
                };

                return Ok(sessionDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid start av förhör");
                return StatusCode(500, new { message = "Ett fel uppstod" });
            }
        }

        /// <summary>
        /// Skicka en fråga till en misstänkt (AI genererar svar)
        /// </summary>
        [HttpPost("ask")]
        public async Task<ActionResult<ChatMessageDto>> AskQuestion(
            [FromBody] AskQuestionRequestDto request)
        {
            try
            {
                var userId = GetUserId();
                
                // Validera session
                var session = await _chatService.GetSessionAsync(request.SessionId);
                if (session == null)
                    return NotFound(new { message = "Förhörssession hittades inte" });

                // Skapa användarens meddelande
                var userMessage = new ChatMessageDto
                {
                    Id = Guid.NewGuid(),
                    Role = "user",
                    Content = request.Question,
                    Timestamp = DateTime.UtcNow
                };

                // Generera AI-svar baserat på sammanhang
                var aiResponse = await _chatService.GenerateResponseAsync(
                    session, 
                    request.Question);

                // Spara både fråga och svar
                await _chatService.SaveMessageAsync(request.SessionId, userMessage);
                await _chatService.SaveMessageAsync(request.SessionId, aiResponse);

                // Extrahera potentiell ledtråd från samtalet
                var clueGenerated = await _chatService.ExtractClueFromConversationAsync(
                    session.CaseId, 
                    request.Question, 
                    aiResponse.Content);

                return Ok(new
                {
                    message = aiResponse,
                    clueGenerated = clueGenerated != null,
                    clue = clueGenerated
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid AI-fråga");
                return StatusCode(500, new { message = "Ett fel uppstod" });
            }
        }

        /// <summary>
        /// Hämta konversationshistorik för ett förhör
        /// </summary>
        [HttpGet("conversation/{sessionId}")]
        public async Task<ActionResult<List<ChatMessageDto>>> GetConversation(Guid sessionId)
        {
            try
            {
                var messages = await _chatService.GetConversationHistoryAsync(sessionId);
                return Ok(messages);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid hämtning av konversation");
                return StatusCode(500, new { message = "Ett fel uppstod" });
            }
        }

        /// <summary>
        /// Avsluta ett förhör
        /// </summary>
        [HttpPost("{sessionId}/end")]
        public async Task<ActionResult> EndInterrogation(Guid sessionId)
        {
            try
            {
                await _chatService.EndSessionAsync(sessionId);
                return Ok(new { message = "Förhör avslutat" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid avslutande av förhör");
                return StatusCode(500, new { message = "Ett fel uppstod" });
            }
        }

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
    }

}