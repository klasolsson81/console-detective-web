namespace ConsoleDetective.API.Models.DTOs.Case
{
    // ==================== REQUEST DTOs ====================
    
    public record GenerateCaseRequestDto
    {
        public string Category { get; init; } = string.Empty;
    }

    public record AccusationRequestDto
    {
        public string SuspectName { get; init; } = string.Empty;
    }

    // ==================== RESPONSE DTOs ====================
    
    public record CaseResponseDto
    {
        public Guid Id { get; init; }
        public string Title { get; init; } = string.Empty;
        public string Category { get; init; } = string.Empty;
        public string Description { get; init; } = string.Empty;
        public string Location { get; init; } = string.Empty;
        public List<string> PossibleSuspects { get; init; } = new();
        public List<ClueDto> Clues { get; init; } = new();
        public bool IsCompleted { get; init; }
        public bool IsSolved { get; init; }
        public DateTime CreatedAt { get; init; }
    }

    public record ClueDto
    {
        public Guid Id { get; init; }
        public string Text { get; init; } = string.Empty;
        public string Type { get; init; } = string.Empty;
        public DateTime DiscoveredAt { get; init; }
        public string? AssignedToSuspect { get; init; }
    }

    public record InvestigationResultDto
    {
        public string ClueText { get; init; } = string.Empty;
        public string ImageUrl { get; init; } = string.Empty;
    }

    public record AccusationResultDto
    {
        public bool IsCorrect { get; init; }
        public string AccusedSuspect { get; init; } = string.Empty;
        public string GuiltyParty { get; init; } = string.Empty;
        public int PointsAwarded { get; init; }
        public string Message { get; init; } = string.Empty;
    }
}