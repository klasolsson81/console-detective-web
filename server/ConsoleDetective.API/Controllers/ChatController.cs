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

        // === NY METOD: Hämta sessionsinfo (Fixar "Anna"-problemet) ===
        [HttpGet("session/{sessionId}")]
        public async Task<ActionResult<InterrogationSessionDto>> GetSession(Guid sessionId)
        {
            var session = await _chatService.GetSessionAsync(sessionId);
            
            if (session == null)
                return NotFound(new { message = "Session hittades inte" });

            // Mappa till DTO
            var sessionDto = new InterrogationSessionDto
            {
                SessionId = session.Id,
                CaseId = session.CaseId,
                SuspectName = session.SuspectName,
                StartedAt = session.StartedAt,
                Messages = session.Messages.Select(m => new ChatMessageDto
                {
                    Id = m.Id,
                    Role = m.Role,
                    Content = m.Content,
                    EmotionalTone = m.EmotionalTone,
                    Timestamp = m.Timestamp
                }).ToList()
            };

            return Ok(sessionDto);
        }

        [HttpPost("start-interrogation")]
        public async Task<ActionResult<InterrogationSessionDto>> StartInterrogation(
            [FromBody] StartInterrogationRequestDto request)
        {
            try
            {
                var userId = GetUserId();
                
                var caseData = await _caseService.GetCaseByIdAsync(request.CaseId, userId);
                if (caseData == null)
                    return NotFound(new { message = "Fall hittades inte" });

                if (!caseData.PossibleSuspects.Contains(request.SuspectName))
                    return BadRequest(new { message = "Misstänkt hittades inte i detta fall" });

                var session = await _chatService.CreateInterrogationSessionAsync(
                    caseData,
                    request.SuspectName);

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

        [HttpPost("ask")]
        public async Task<ActionResult<ChatMessageDto>> AskQuestion(
            [FromBody] AskQuestionRequestDto request)
        {
            try
            {
                // Validera session
                var session = await _chatService.GetSessionAsync(request.SessionId);
                if (session == null)
                    return NotFound(new { message = "Förhörssession hittades inte" });

                var userMessage = new ChatMessageDto
                {
                    Id = Guid.NewGuid(),
                    Role = "user",
                    Content = request.Question,
                    Timestamp = DateTime.UtcNow
                };

                var aiResponse = await _chatService.GenerateResponseAsync(
                    session, 
                    request.Question);

                await _chatService.SaveMessageAsync(request.SessionId, userMessage);
                await _chatService.SaveMessageAsync(request.SessionId, aiResponse);

                // Försök extrahera ledtråd (tyst i bakgrunden)
                string? clueGenerated = null;
                try 
                {
                     clueGenerated = await _chatService.ExtractClueFromConversationAsync(
                        session.CaseId, 
                        request.Question, 
                        aiResponse.Content);
                }
                catch(Exception ex)
                {
                    _logger.LogWarning(ex, "Kunde inte extrahera ledtråd, men fortsätter ändå");
                }

                return Ok(new
                {
                    // Returnera AI-meddelandet platt så frontend hittar det lätt
                    id = aiResponse.Id,
                    role = aiResponse.Role,
                    content = aiResponse.Content,
                    emotionalTone = aiResponse.EmotionalTone,
                    timestamp = aiResponse.Timestamp,
                    
                    // Extra info
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
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return "guest-user";
            return userId;
        }
    }
}