using ConsoleDetective.API.Data;
using ConsoleDetective.API.Models.Domain;
using Microsoft.EntityFrameworkCore;

namespace ConsoleDetective.API.Services
{
    public class CaseService
    {
        private readonly AppDbContext _context;
        private readonly AIService _aiService;

        public CaseService(AppDbContext context, AIService aiService)
        {
            _context = context;
            _aiService = aiService;
        }

        // ==================== HÄMTA ANVÄNDARENS FALL ====================
        public async Task<List<Case>> GetUserCasesAsync(string userId)
        {
            var userGuid = Guid.Parse(userId);
            
            return await _context.Cases
                .Include(c => c.Clues)
                .Where(c => c.UserId == userGuid)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        // ==================== HÄMTA SPECIFIKT FALL ====================
        public async Task<Case?> GetCaseByIdAsync(Guid caseId, string userId)
        {
            var userGuid = Guid.Parse(userId);
            
            return await _context.Cases
                .Include(c => c.Clues)
                .Include(c => c.InterrogationSessions)
                    .ThenInclude(s => s.Messages)
                .FirstOrDefaultAsync(c => c.Id == caseId && c.UserId == userGuid);
        }

        // ==================== SKAPA NYTT FALL ====================
        public async Task<Case> CreateCaseAsync(string userId, GeneratedCaseData generatedData)
        {
            var userGuid = Guid.Parse(userId);
            
            var newCase = new Case
            {
                UserId = userGuid,
                Title = generatedData.Title,
                Category = generatedData.Category,
                Description = generatedData.Description,
                Location = generatedData.Location,
                PossibleSuspects = generatedData.PossibleSuspects,
                Guilty = generatedData.Guilty
            };

            // Lägg till initial ledtrådar
            foreach (var clueText in generatedData.InitialClues)
            {
                newCase.Clues.Add(new Clue
                {
                    Text = clueText,
                    Type = "Investigation"
                });
            }

            _context.Cases.Add(newCase);
            await _context.SaveChangesAsync();

            return newCase;
        }

        // ==================== LÄGG TILL LEDTRÅD ====================
        public async Task<Clue> AddClueAsync(Guid caseId, string clueText, string type = "Investigation")
        {
            var clue = new Clue
            {
                CaseId = caseId,
                Text = clueText,
                Type = type
            };

            _context.Clues.Add(clue);
            await _context.SaveChangesAsync();

            return clue;
        }

        // ==================== TILLDELA LEDTRÅD TILL MISSTÄNKT ====================
        public async Task<bool> AssignClueToSuspectAsync(Guid clueId, string suspectName)
        {
            var clue = await _context.Clues.FindAsync(clueId);
            
            if (clue == null)
                return false;

            clue.AssignedToSuspect = suspectName;
            await _context.SaveChangesAsync();

            return true;
        }

        // ==================== GÖR ANKLAGELSE ====================
        public async Task<(bool IsCorrect, int PointsChange)> MakeAccusationAsync(
            Guid caseId, 
            string userId, 
            string accusedSuspect)
        {
            var userGuid = Guid.Parse(userId);
            
            var caseData = await _context.Cases
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.Id == caseId && c.UserId == userGuid);

            if (caseData == null)
                throw new InvalidOperationException("Fall hittades inte");

            if (caseData.IsCompleted)
                throw new InvalidOperationException("Fallet är redan avslutat");

            // Normalisera namn för jämförelse
            var accusedNorm = accusedSuspect.Trim().TrimEnd('.', '!', '?');
            var guiltyNorm = caseData.Guilty.Trim().TrimEnd('.', '!', '?');

            bool isCorrect = string.Equals(accusedNorm, guiltyNorm, StringComparison.OrdinalIgnoreCase);

            // Uppdatera case
            caseData.IsCompleted = true;
            caseData.IsSolved = isCorrect;

            // Beräkna poäng
            int pointsChange = isCorrect ? 100 : -50;
            caseData.User.Points += pointsChange;

            await _context.SaveChangesAsync();

            return (isCorrect, pointsChange);
        }

        // ==================== HÄMTA STATISTIK ====================
        public async Task<UserStatistics> GetUserStatisticsAsync(string userId)
        {
            var userGuid = Guid.Parse(userId);
            
            var cases = await _context.Cases
                .Where(c => c.UserId == userGuid)
                .ToListAsync();

            var user = await _context.Users.FindAsync(userGuid);

            return new UserStatistics
            {
                TotalCases = cases.Count,
                SolvedCases = cases.Count(c => c.IsSolved),
                FailedCases = cases.Count(c => c.IsCompleted && !c.IsSolved),
                ActiveCases = cases.Count(c => !c.IsCompleted),
                TotalPoints = user?.Points ?? 0
            };
        }
    }

    // ==================== USER STATISTICS DTO ====================
    public class UserStatistics
    {
        public int TotalCases { get; set; }
        public int SolvedCases { get; set; }
        public int FailedCases { get; set; }
        public int ActiveCases { get; set; }
        public int TotalPoints { get; set; }
        public double SuccessRate => TotalCases > 0 
            ? Math.Round((double)SolvedCases / TotalCases * 100, 1) 
            : 0;
    }
}