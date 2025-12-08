using ConsoleDetective.API.Data;
using ConsoleDetective.API.Models.Domain;
using ConsoleDetective.API.Models.DTOs.Chat;
using Microsoft.EntityFrameworkCore;

namespace ConsoleDetective.API.Services
{
    public class ChatService
    {
        private readonly AppDbContext _context;
        private readonly AIService _aiService;

        public ChatService(AppDbContext context, AIService aiService)
        {
            _context = context;
            _aiService = aiService;
        }

        // ==================== SKAPA FÖRHÖRSSESSION ====================
        public async Task<InterrogationSession> CreateInterrogationSessionAsync(
            Case caseData, 
            string suspectName)
        {
            var session = new InterrogationSession
            {
                CaseId = caseData.Id,
                SuspectName = suspectName,
                IsActive = true
            };

            _context.InterrogationSessions.Add(session);
            await _context.SaveChangesAsync();

            return session;
        }

        // ==================== HÄMTA SESSION ====================
        public async Task<InterrogationSession?> GetSessionAsync(Guid sessionId)
        {
            return await _context.InterrogationSessions
                .Include(s => s.Case)
                .Include(s => s.Messages)
                .FirstOrDefaultAsync(s => s.Id == sessionId);
        }

        // ==================== GENERERA AI-SVAR ====================
        public async Task<ChatMessageDto> GenerateResponseAsync(
            InterrogationSession session,
            string question)
        {
            // Hämta konversationshistorik
            var history = session.Messages
                .OrderBy(m => m.Timestamp)
                .Select(m => new ChatMessageDto
                {
                    Id = m.Id,
                    Role = m.Role,
                    Content = m.Content,
                    Timestamp = m.Timestamp,
                    EmotionalTone = m.EmotionalTone
                })
                .ToList();

            // Generera AI-svar
            var aiResponse = await _aiService.GenerateInterrogationResponseAsync(
                session.Case,
                session.SuspectName,
                history,
                question
            );

            return aiResponse;
        }

        // ==================== SPARA MEDDELANDE ====================
        public async Task SaveMessageAsync(Guid sessionId, ChatMessageDto messageDto)
        {
            var message = new ChatMessage
            {
                SessionId = sessionId,
                Role = messageDto.Role,
                Content = messageDto.Content,
                EmotionalTone = messageDto.EmotionalTone
            };

            _context.ChatMessages.Add(message);
            await _context.SaveChangesAsync();
        }

        // ==================== EXTRAHERA LEDTRÅD FRÅN KONVERSATION ====================
        public async Task<string?> ExtractClueFromConversationAsync(
            Guid caseId,
            string question,
            string answer)
        {
            var clueText = await _aiService.ExtractClueFromConversationAsync(question, answer);

            if (clueText != null)
            {
                // Spara som ledtråd
                var clue = new Clue
                {
                    CaseId = caseId,
                    Text = clueText,
                    Type = "Interrogation"
                };

                _context.Clues.Add(clue);
                await _context.SaveChangesAsync();

                return clueText;
            }

            return null;
        }

        // ==================== HÄMTA KONVERSATIONSHISTORIK ====================
        public async Task<List<ChatMessageDto>> GetConversationHistoryAsync(Guid sessionId)
        {
            var messages = await _context.ChatMessages
                .Where(m => m.SessionId == sessionId)
                .OrderBy(m => m.Timestamp)
                .ToListAsync();

            return messages.Select(m => new ChatMessageDto
            {
                Id = m.Id,
                Role = m.Role,
                Content = m.Content,
                Timestamp = m.Timestamp,
                EmotionalTone = m.EmotionalTone
            }).ToList();
        }

        // ==================== GENERERA FRÅGEFÖRSLAG ====================
        public async Task<List<string>> GenerateSuggestedQuestionsAsync(InterrogationSession session)
        {
            // Hämta konversationshistorik
            var history = session.Messages
                .OrderBy(m => m.Timestamp)
                .Select(m => new ChatMessageDto
                {
                    Id = m.Id,
                    Role = m.Role,
                    Content = m.Content,
                    Timestamp = m.Timestamp,
                    EmotionalTone = m.EmotionalTone
                })
                .ToList();

            // Generera frågeförslag via AI
            var suggestions = await _aiService.GenerateSuggestedQuestionsAsync(
                session.Case,
                session.SuspectName,
                history
            );

            return suggestions;
        }

        // ==================== AVSLUTA SESSION ====================
        public async Task EndSessionAsync(Guid sessionId)
        {
            var session = await _context.InterrogationSessions.FindAsync(sessionId);
            
            if (session != null)
            {
                session.IsActive = false;
                session.EndedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
    }
}