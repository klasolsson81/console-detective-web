namespace ConsoleDetective.API.Models.Domain
{
    // ==================== USER ====================
    public class User
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public bool IsVerified { get; set; }
        public int Points { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public List<Case> Cases { get; set; } = new();
    }

    // ==================== CASE ====================
    public class Case
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public List<string> PossibleSuspects { get; set; } = new();
        public string Guilty { get; set; } = string.Empty;
        public bool IsCompleted { get; set; }
        public bool IsSolved { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public byte[]? NarrationAudio { get; set; } // TTS audio för case-beskrivning

        // Foreign keys
        public Guid UserId { get; set; }

        // Navigation properties
        public User User { get; set; } = null!;
        public List<Clue> Clues { get; set; } = new();
        public List<InterrogationSession> InterrogationSessions { get; set; } = new();
    }

    // ==================== CLUE ====================
    public class Clue
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Text { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // "Investigation" eller "Interrogation"
        public DateTime DiscoveredAt { get; set; } = DateTime.UtcNow;
        public string? AssignedToSuspect { get; set; } // För Evidence Board
        public byte[]? Audio { get; set; } // TTS audio för ledtråden

        // Foreign keys
        public Guid CaseId { get; set; }

        // Navigation properties
        public Case Case { get; set; } = null!;
    }

    // ==================== INTERROGATION SESSION ====================
    public class InterrogationSession
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string SuspectName { get; set; } = string.Empty;
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? EndedAt { get; set; }
        public bool IsActive { get; set; } = true;
        
        // Foreign keys
        public Guid CaseId { get; set; }
        
        // Navigation properties
        public Case Case { get; set; } = null!;
        public List<ChatMessage> Messages { get; set; } = new();
    }

    // ==================== CHAT MESSAGE ====================
    public class ChatMessage
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Role { get; set; } = string.Empty; // "user" eller "assistant"
        public string Content { get; set; } = string.Empty;
        public string? EmotionalTone { get; set; } // "nervous", "defensive", "calm", etc.
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        
        // Foreign keys
        public Guid SessionId { get; set; }
        
        // Navigation properties
        public InterrogationSession Session { get; set; } = null!;
    }
}