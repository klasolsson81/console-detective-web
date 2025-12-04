namespace ConsoleDetective.API.Models.Domain
{
    public class LeaderboardEntry
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string PlayerName { get; set; } = string.Empty;
        public string Avatar { get; set; } = "man"; // "man" eller "woman"
        public int Score { get; set; }
        public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
    }
}