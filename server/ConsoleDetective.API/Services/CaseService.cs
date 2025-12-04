using ConsoleDetective.API.Data;
using ConsoleDetective.API.Models.Domain;
using Microsoft.EntityFrameworkCore;

namespace ConsoleDetective.API.Services
{
    public class CaseService
    {
        private readonly AppDbContext _context;
        private readonly AIService _aiService;

        // Det statiska ID:t för gästen
        private readonly Guid _guestUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        public CaseService(AppDbContext context, AIService aiService)
        {
            _context = context;
            _aiService = aiService;
        }

        private Guid ParseUserId(string userId)
        {
            if (userId == "guest-user")
            {
                return _guestUserId;
            }
            // Om det kommer in ett gammalt ID från en token, parsa det ändå
            if (Guid.TryParse(userId, out var guid))
            {
                return guid;
            }
            return _guestUserId; // Fallback till gäst om något är knas
        }

        // ==================== SKAPA NYTT FALL ====================
        public async Task<Case> CreateCaseAsync(string userId, GeneratedCaseData generatedData)
        {
            var userGuid = ParseUserId(userId);
            
            // Om det är gäst, se till att användaren finns i DB
            if (userGuid == _guestUserId)
            {
                var guestExists = await _context.Users.AnyAsync(u => u.Id == _guestUserId);
                if (!guestExists)
                {
                    var guestUser = new User
                    {
                        Id = _guestUserId,
                        Username = "Gäst Detektiv",
                        Points = 0,
                        PasswordHash = "guest-mode", 
                        Email = "guest@consoledetective.se" 
                    };
                    _context.Users.Add(guestUser);
                    await _context.SaveChangesAsync();
                }
            }

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

        // ==================== HÄMTA ANVÄNDARENS FALL ====================
        public async Task<List<Case>> GetUserCasesAsync(string userId)
        {
            var userGuid = ParseUserId(userId);
            
            // Om vi frågar efter gästens fall, hämta dem oavsett vem som frågar
            if (userId == "guest-user") userGuid = _guestUserId;

            return await _context.Cases
                .Include(c => c.Clues)
                .Where(c => c.UserId == userGuid)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        // ==================== HÄMTA ETT SPECIFIKT FALL ====================
        public async Task<Case?> GetCaseByIdAsync(Guid caseId, string userId)
        {
            var userGuid = ParseUserId(userId);

            // Specialregel: Om fallet ägs av gästen, låt alla se det.
            // Annars måste userId matcha ägaren.
            var caseData = await _context.Cases
                .Include(c => c.Clues)
                .Include(c => c.InterrogationSessions)
                    .ThenInclude(s => s.Messages)
                .FirstOrDefaultAsync(c => c.Id == caseId);

            if (caseData == null) return null;

            // Behörighetskoll: Om det INTE är ett gästfall OCH fel användare -> blockera
            if (caseData.UserId != _guestUserId && caseData.UserId != userGuid)
            {
                return null;
            }

            return caseData;
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

        public async Task<bool> AssignClueToSuspectAsync(Guid clueId, string suspectName)
        {
            var clue = await _context.Clues.FindAsync(clueId);
            if (clue == null) return false;

            clue.AssignedToSuspect = suspectName;
            await _context.SaveChangesAsync();
            return true;
        }

        // ==================== GÖR ANKLAGELSE (FIXAD) ====================
        public async Task<(bool IsCorrect, int PointsChange, string GuiltyParty)> MakeAccusationAsync(
            Guid caseId,
            string userId,
            string accusedSuspect)
        {
            var userGuid = ParseUserId(userId);

            var caseData = await _context.Cases
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.Id == caseId);

            if (caseData == null)
                throw new InvalidOperationException("Fall hittades inte i databasen.");

            // === HÄR ÄR FIXEN ===
            // Vi tillåter anklagelsen om:
            // 1. Du äger fallet (caseData.UserId == userGuid)
            // 2. ELLER om fallet är ett "allmänt" gästfall (caseData.UserId == _guestUserId)
            if (caseData.UserId != userGuid && caseData.UserId != _guestUserId)
            {
                throw new InvalidOperationException($"Du har inte behörighet. Fallet ägs av {caseData.UserId} men du är {userGuid}");
            }

            if (caseData.IsCompleted)
                throw new InvalidOperationException("Fallet är redan avslutat");

            var accusedNorm = accusedSuspect.Trim().TrimEnd('.', '!', '?');
            var guiltyNorm = caseData.Guilty.Trim().TrimEnd('.', '!', '?');

            bool isCorrect = string.Equals(accusedNorm, guiltyNorm, StringComparison.OrdinalIgnoreCase);

            caseData.IsCompleted = true;
            caseData.IsSolved = isCorrect;

            int pointsChange = isCorrect ? 100 : -50;
            
            // Uppdatera poängen på gäst-kontot (eller ägaren)
            if (caseData.User != null)
            {
                caseData.User.Points += pointsChange;
            }

            await _context.SaveChangesAsync();

            return (isCorrect, pointsChange, caseData.Guilty);
        }

        // ==================== STATISTIK ====================
        public async Task<UserStatistics> GetUserStatisticsAsync(string userId)
        {
            var userGuid = ParseUserId(userId);
            if (userId == "guest-user") userGuid = _guestUserId;
            
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