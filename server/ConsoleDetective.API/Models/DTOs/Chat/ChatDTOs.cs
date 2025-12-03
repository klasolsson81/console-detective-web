namespace ConsoleDetective.API.Models.DTOs.Chat
{
    // ==================== REQUEST DTOs ====================
    
    public record StartInterrogationRequestDto
    {
        public Guid CaseId { get; init; }
        public string SuspectName { get; init; } = string.Empty;
    }

    public record AskQuestionRequestDto
    {
        public Guid SessionId { get; init; }
        public string Question { get; init; } = string.Empty;
    }

    // ==================== RESPONSE DTOs ====================
    
    public record InterrogationSessionDto
    {
        public Guid SessionId { get; init; }
        public Guid CaseId { get; init; }
        public string SuspectName { get; init; } = string.Empty;
        public DateTime StartedAt { get; init; }
        public List<ChatMessageDto> Messages { get; init; } = new();
    }

    public record ChatMessageDto
    {
        public Guid Id { get; init; }
        public string Role { get; init; } = string.Empty;
        public string Content { get; init; } = string.Empty;
        public DateTime Timestamp { get; init; }
        public string? EmotionalTone { get; init; }
    }
}