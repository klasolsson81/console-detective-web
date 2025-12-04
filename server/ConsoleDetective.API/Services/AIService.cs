using OpenAI;
using OpenAI.Chat;
using System.Text.Json;
using ConsoleDetective.API.Models.Domain;
using ConsoleDetective.API.Models.DTOs.Chat;

// Alias för att undvika namespace-konflikter
using OpenAIChatMessage = OpenAI.Chat.ChatMessage;
using DomainChatMessage = ConsoleDetective.API.Models.Domain.ChatMessage;

namespace ConsoleDetective.API.Services
{
    public class AIService
    {
        private readonly OpenAIClient _client;
        private readonly ILogger<AIService> _logger;

        // Vi hårdkodar misstänkta här så vi kan återanvända listan överallt
        private readonly string[] _validSuspects = new[] { "Nemo", "Anna", "Frida", "Carlos" };

        public AIService(IConfiguration configuration, ILogger<AIService> logger)
        {
            var apiKey = configuration["OpenAI:ApiKey"] 
                ?? throw new InvalidOperationException("OpenAI API-nyckel saknas");
            
            _client = new OpenAIClient(apiKey);
            _logger = logger;
        }

        /// <summary>
        /// Genererar ett nytt detektivfall med AI - Nu med högre svårighetsgrad
        /// </summary>
        public async Task<GeneratedCaseData> GenerateCaseAsync(string category)
        {
            var locations = GetLocationsForCategory(category);
            var location = locations[Random.Shared.Next(locations.Length)];
            
            var suspectsString = string.Join(", ", _validSuspects);

            string prompt = $@"
DU ÄR EN MÄSTARE PÅ NOIR-MYSTERIER.
Din uppgift: Skapa ett utmanande mordmysterium/brott som kräver deduktion.

PARAMETRAR:
- Kategori: {category}
- Plats: {location}
- Möjliga misstänkta (ANVÄND ENDAST DESSA): {suspectsString}
- Välj EN skyldig från listan.

REGLER FÖR FALLET:
1. Svårighetsgrad: HÖG. Gör det inte uppenbart.
2. Den skyldige ska ha ett motiv som inte syns direkt.
3. Skapa 2 ""InitialClues"":
   - En ledtråd ska vara vag men korrekt (pekar mot den skyldige).
   - En ledtråd ska vara en ""Red Herring"" (falskt spår) som pekar mot en oskyldig.
4. Beskrivningen ska vara atmosfärisk, mörk och 'gritty'.

FORMAT:
Svara ENDAST med giltig JSON (ingen markdown, ingen annan text):
{{
  ""description"": ""Atmosfärisk berättelse om brottet (max 4 meningar)..."",
  ""guilty"": ""Namn på den skyldige (MÅSTE vara en av: {suspectsString})"",
  ""initialClues"": [""Ledtråd 1 text"", ""Ledtråd 2 text""]
}}";

            try
            {
                var chat = _client.GetChatClient("gpt-4o"); 
                
                var response = await chat.CompleteChatAsync([
                    new SystemChatMessage("Du är en expert på att skriva deckargåtor."),
                    new UserChatMessage(prompt)
                ]);

                var rawContent = string.Join("\n", response.Value.Content.Select(c => c.Text));
                
                // Robust JSON parsing
                int startIndex = rawContent.IndexOf('{');
                int endIndex = rawContent.LastIndexOf('}');

                if (startIndex == -1 || endIndex == -1)
                    throw new InvalidOperationException("AI returnerade ingen giltig JSON");

                var jsonString = rawContent.Substring(startIndex, endIndex - startIndex + 1);
                
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var caseData = JsonSerializer.Deserialize<GeneratedCaseJson>(jsonString, options);
                
                if (caseData == null) throw new InvalidOperationException("Kunde inte tolka AI-svar");

                // Fallback om AI hallucinerar ett namn som inte finns
                if (!_validSuspects.Contains(caseData.Guilty))
                {
                    caseData.Guilty = _validSuspects[0];
                }

                return new GeneratedCaseData
                {
                    Title = $"{category} – {location}",
                    Category = category,
                    Location = location,
                    Description = caseData.Description,
                    PossibleSuspects = _validSuspects.ToList(),
                    Guilty = caseData.Guilty,
                    InitialClues = caseData.InitialClues
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid AI-generering av fall");
                throw;
            }
        }

        /// <summary>
        /// Genererar en ledtråd vid undersökning
        /// </summary>
        public async Task<string> GenerateInvestigationClueAsync(Case caseData)
        {
            var clueTypes = new[] 
            { 
                "Ett fysiskt bevis som tappats", 
                "En kvarglömd lapp eller digitalt spår", 
                "Bara en atmosfärisk iakttagelse (inget bevis)", 
                "Ett vilseledande spår (något som ser misstänkt ut men är oskyldigt)" 
            };
            var selectedType = clueTypes[Random.Shared.Next(clueTypes.Length)];

            string prompt = $@"
SITUATION:
Brott: {caseData.Title}
Plats: {caseData.Location}
Skyldig: {caseData.Guilty}

UPPGIFT:
Spelaren undersöker rummet noggrant.
Skriv vad de hittar. Det ska vara av typen: ""{selectedType}"".

VIKTIGT:
- Var kortfattad (max 2 meningar).
- Om det är en ledtråd, gör den SUBTIL. Skriv inte ""Detta bevisar att X gjorde det"".
- Använd noir-språk.

Svara ENDAST med texten.";

            try
            {
                var chat = _client.GetChatClient("gpt-4o-mini");
                var response = await chat.CompleteChatAsync([
                    new SystemChatMessage("Du är en noir-berättare."),
                    new UserChatMessage(prompt)
                ]);

                return string.Join("\n", response.Value.Content.Select(c => c.Text)).Trim();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid generering av ledtråd");
                throw;
            }
        }

        /// <summary>
        /// Genererar AI-svar under förhör
        /// </summary>
        public async Task<ChatMessageDto> GenerateInterrogationResponseAsync(
            Case caseData,
            string suspectName,
            List<ChatMessageDto> conversationHistory,
            string currentQuestion)
        {
            bool isGuilty = suspectName.Equals(caseData.Guilty, StringComparison.OrdinalIgnoreCase);
            var otherSuspects = _validSuspects.Where(s => s != suspectName).ToList();
            var scapegoat = otherSuspects[Random.Shared.Next(otherSuspects.Count)];

            string behaviorInstruction;
            if (isGuilty)
            {
                behaviorInstruction = $@"
DU ÄR SKYLDIG.
Ditt mål: Bli inte påkommen.
Strategi: 
- Ljug trovärdigt.
- Om du blir pressad, skyll subtilt på {scapegoat}.
- Du kan vara: Kall/Beräknande, Överdrivet hjälpsam, eller Defensiv.";
            }
            else
            {
                behaviorInstruction = $@"
DU ÄR OSKYLDIG.
Ditt mål: Bevisa din oskuld.
Strategi:
- Berätta sanningen.
- Du kan vara nervös eller irriterad.
- Du litar inte på {scapegoat}.";
            }

            string systemPrompt = $@"
Du spelar rollen av {suspectName} i ett förhör.

VÄRLDSREGLER (VIKTIGT):
1. De ENDA personerna som existerar är: {string.Join(", ", _validSuspects)}.
2. Hitta ALDRIG på nya namn.
3. Offret är den som beskrivs i fallet.

KONTEXT:
Brott: {caseData.Title} på {caseData.Location}.
{behaviorInstruction}

INSTRUKTIONER FÖR SVARET:
- Svara kort (1-3 meningar).
- Använd talspråk och karaktärens röst.
- Skriv på svenska.
- Inkludera känslo-tagg först i parentes, ex: (nervös), (arg).";

            var chatMessages = new List<OpenAIChatMessage>
            {
                new SystemChatMessage(systemPrompt)
            };

            var recentHistory = conversationHistory.TakeLast(6);
            foreach (var msg in recentHistory)
            {
                if (msg.Role == "user") chatMessages.Add(new UserChatMessage(msg.Content));
                else chatMessages.Add(new AssistantChatMessage(msg.Content));
            }

            chatMessages.Add(new UserChatMessage(currentQuestion));

            try
            {
                var chat = _client.GetChatClient("gpt-4o-mini");
                var response = await chat.CompleteChatAsync(chatMessages);

                var fullContent = string.Join("\n", response.Value.Content.Select(c => c.Text)).Trim();
                string tone = "neutral";
                string content = fullContent;

                if (fullContent.StartsWith("("))
                {
                    int endParen = fullContent.IndexOf(")");
                    if (endParen != -1)
                    {
                        tone = fullContent.Substring(1, endParen - 1).ToLower();
                        content = fullContent.Substring(endParen + 1).Trim();
                    }
                }

                string mappedTone = MapEmotionalTone(tone);

                return new ChatMessageDto
                {
                    Id = Guid.NewGuid(),
                    Role = "assistant",
                    Content = content,
                    Timestamp = DateTime.UtcNow,
                    EmotionalTone = mappedTone
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid generering av förhörssvar");
                throw;
            }
        }

        public async Task<string?> ExtractClueFromConversationAsync(string question, string answer)
        {
            string prompt = $@"
Analysera dialogen:
F: {question}
S: {answer}

Innehåller svaret ett KONKRET bevis eller ett starkt alibi?
Om JA: Sammanfatta det i en kort mening.
Om NEJ: Svara ""INGEN"".";
            
            try
            {
                var chat = _client.GetChatClient("gpt-4o-mini");
                var response = await chat.CompleteChatAsync([new UserChatMessage(prompt)]);
                var result = string.Join("\n", response.Value.Content.Select(c => c.Text)).Trim();
                return result.ToUpper().Contains("INGEN") ? null : result;
            }
            catch { return null; }
        }

        // === Helpers ===

        private string MapEmotionalTone(string rawTone)
        {
            if (rawTone.Contains("nervös") || rawTone.Contains("rädd") || rawTone.Contains("stressad")) return "nervous";
            if (rawTone.Contains("arg") || rawTone.Contains("irriterad") || rawTone.Contains("sur")) return "irritated";
            if (rawTone.Contains("lugn") || rawTone.Contains("säker") || rawTone.Contains("kall")) return "confident";
            if (rawTone.Contains("defensiv") || rawTone.Contains("anklagande")) return "defensive";
            return "neutral";
        }

        private string[] GetLocationsForCategory(string category) => category switch
        {
            "Bankrån" => new[] { "Centralbank" },
            "Mord" => new[] { "Herrgården", "NBI", "Industrilokal" },
            "Inbrott" => new[] { "Stadshuset", "Teknikaffären", "Villan" },
            "Otrohet" => new[] { "Hotell", "Restaurang", "Lägenheten", "Strandpromenaden" },
            _ => new[] { "Okänd plats" }
        };

        // Intern klass för JSON-parsing
        private class GeneratedCaseJson
        {
            public string Description { get; set; } = string.Empty;
            public string Guilty { get; set; } = string.Empty;
            public List<string> InitialClues { get; set; } = new();
        }
    }

    // === Public DTO som används av andra klasser ===
    public class GeneratedCaseData
    {
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<string> PossibleSuspects { get; set; } = new();
        public string Guilty { get; set; } = string.Empty;
        public List<string> InitialClues { get; set; } = new();
    }
}