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

        public AIService(IConfiguration configuration, ILogger<AIService> logger)
        {
            var apiKey = configuration["OpenAI:ApiKey"] 
                ?? throw new InvalidOperationException("OpenAI API-nyckel saknas");
            
            _client = new OpenAIClient(apiKey);
            _logger = logger;
        }

        /// <summary>
        /// Genererar ett nytt detektivfall med AI
        /// </summary>
        public async Task<GeneratedCaseData> GenerateCaseAsync(string category)
        {
            var locations = GetLocationsForCategory(category);
            var suspects = new[] { "Nemo", "Anna", "Frida", "Carlos" };
            var location = locations[Random.Shared.Next(locations.Length)];

            string prompt = $@"Du är en kreativ noir-författare som skapar detektivfall.

UPPGIFT: Skapa ett {category.ToLower()}-fall på svenska.

KRAV:
- Platsen är: {location}
- Misstänkta: {string.Join(", ", suspects)}
- Välj EN skyldig person från listan
- Skriv en fängslande berättelse (4-6 meningar) som etablerar mysteriet
- Inkludera subtila ledtrådar som pekar mot den skyldige utan att avslöja det
- Ge falska ledtrådar för de andra misstänkta
- Använd noir-estetik: mörk, dramatisk, mystisk ton

SVARA ENDAST med giltig JSON:
{{
  ""description"": ""Din berättelse här..."",
  ""guilty"": ""Namnet på den skyldige"",
  ""initialClues"": [
    ""Ledtråd 1 (subtil)"",
    ""Ledtråd 2 (subtil)""
  ]
}}";

            try
            {
                var chat = _client.GetChatClient("gpt-4o-mini");
                var response = await chat.CompleteChatAsync([
                    new SystemChatMessage("Du är en professionell noir-författare och mysterieskapare."),
                    new UserChatMessage(prompt)
                ]);

                var result = string.Join("\n", response.Value.Content.Select(c => c.Text))
                    .Replace("```json", "")
                    .Replace("```", "")
                    .Trim();

                var caseData = JsonSerializer.Deserialize<GeneratedCaseJson>(result);
                
                if (caseData == null)
                    throw new InvalidOperationException("Kunde inte tolka AI-svar");

                return new GeneratedCaseData
                {
                    Title = $"{category} – {location}",
                    Category = category,
                    Location = location,
                    Description = caseData.Description,
                    PossibleSuspects = suspects.ToList(),
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
        /// Genererar en ledtråd när spelaren undersöker brottsplatsen
        /// </summary>
        public async Task<string> GenerateInvestigationClueAsync(Case caseData)
        {
            string prompt = $@"Du är berättarrösten i ett noir-detektivspel.

SITUATION:
Brott: {caseData.Title}
Plats: {caseData.Location}
Misstänkta: {string.Join(", ", caseData.PossibleSuspects)}
Skyldig: {caseData.Guilty}

UPPGIFT:
Spelaren undersöker brottsplatsen. Ge en kort (2-3 meningar) beskrivning av vad som hittas.
- Om relevant, inkludera en subtil ledtråd som kan kopplas till den skyldige
- Använd noir-estetik och atmosfär
- Skriv på svenska

Svara ENDAST med ledtrådstexten, ingen JSON.";

            try
            {
                var chat = _client.GetChatClient("gpt-4o-mini");
                var response = await chat.CompleteChatAsync([
                    new SystemChatMessage("Du är en noir-berättare med känsla för detaljer och atmosfär."),
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
        /// Genererar AI-svar under ett förhör (med kontext)
        /// </summary>
        public async Task<ChatMessageDto> GenerateInterrogationResponseAsync(
            Case caseData,
            string suspectName,
            List<ChatMessageDto> conversationHistory,
            string currentQuestion)
        {
            bool isGuilty = suspectName.Equals(caseData.Guilty, StringComparison.OrdinalIgnoreCase);

            // Bygg konversationshistorik för kontext
            var chatMessages = new List<OpenAIChatMessage>
            {
                new SystemChatMessage($@"Du är {suspectName} i ett noir-detektivförhör.

SITUATION:
- Brott: {caseData.Title}
- Plats: {caseData.Location}
- Du är: {(isGuilty ? "SKYLDIG" : "OSKYLDIG")}

BETEENDE:
{(isGuilty 
    ? @"- Var nervös och undvikande
- Ge motsägelsefulla svar
- Försök skylla på någon annan
- Läck småningom ledtrådar genom nervositet" 
    : @"- Var trovärdig och sammanhängande
- Svara direkt på frågor
- Ge konsekvent information
- Visa lätt irritation över att vara misstänkt")}

STIL:
- Svara kort (1-3 meningar)
- Använd karaktärens röst
- Skriv på svenska
- Inkludera känslomässiga uttryck i parenteser, t.ex. (nervöst), (ilsket)

Svara ENDAST som karaktären, ingen meta-text.")
            };

            // Lägg till tidigare meddelanden för kontext
            foreach (var msg in conversationHistory)
            {
                if (msg.Role == "user")
                    chatMessages.Add(new UserChatMessage(msg.Content));
                else
                    chatMessages.Add(new AssistantChatMessage(msg.Content));
            }

            // Lägg till aktuell fråga
            chatMessages.Add(new UserChatMessage(currentQuestion));

            try
            {
                var chat = _client.GetChatClient("gpt-4o-mini");
                var response = await chat.CompleteChatAsync(chatMessages);

                var content = string.Join("\n", response.Value.Content.Select(c => c.Text)).Trim();

                // Analysera känslomässig ton
                var tone = AnalyzeEmotionalTone(content, isGuilty);

                return new ChatMessageDto
                {
                    Id = Guid.NewGuid(),
                    Role = "assistant",
                    Content = content,
                    Timestamp = DateTime.UtcNow,
                    EmotionalTone = tone
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid generering av förhörssvar");
                throw;
            }
        }

        /// <summary>
        /// Extraherar potentiella ledtrådar från konversationen
        /// </summary>
        public async Task<string?> ExtractClueFromConversationAsync(
            string question, 
            string answer)
        {
            string prompt = $@"Analysera följande förhörsutbyte:

FRÅGA: {question}
SVAR: {answer}

UPPGIFT:
Om svaret innehåller värdefull information som kan vara en ledtråd, sammanfatta den i 1 mening.
Om svaret INTE innehåller ny information, svara bara 'INGEN'.

Skriv på svenska.";

            try
            {
                var chat = _client.GetChatClient("gpt-4o-mini");
                var response = await chat.CompleteChatAsync([
                    new SystemChatMessage("Du är en analytiker som identifierar viktiga ledtrådar."),
                    new UserChatMessage(prompt)
                ]);

                var result = string.Join("\n", response.Value.Content.Select(c => c.Text)).Trim();
                
                return result.Equals("INGEN", StringComparison.OrdinalIgnoreCase) 
                    ? null 
                    : result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid extrahering av ledtråd");
                return null;
            }
        }

        // === Private Helpers ===

        private string[] GetLocationsForCategory(string category) => category switch
        {
            "Mord" => new[] { 
                "Gamla biblioteket", 
                "Öde industrilokal", 
                "Herrgården vid sjön", 
                "NBI/Handelsakademin" 
            },
            "Bankrån" => new[] { 
                "Göteborgs Centralbank", 
                "Swedbank", 
                "Nordea", 
                "Handelsbanken" 
            },
            "Inbrott" => new[] { 
                "Stadshuset", 
                "Villa Solbacken", 
                "Teknikaffären", 
                "Skolans lärarrum" 
            },
            "Otrohet" => new[] { 
                "Hotell Aurora", 
                "Restaurang Bella Notte", 
                "Lägenheten på Linnégatan", 
                "Strandpromenaden" 
            },
            _ => new[] { "Okänd plats" }
        };

        private string AnalyzeEmotionalTone(string content, bool isGuilty)
        {
            var contentLower = content.ToLower();
            
            if (isGuilty)
            {
                if (contentLower.Contains("jag") && contentLower.Contains("inte"))
                    return "defensive";
                if (contentLower.Contains("nervöst") || contentLower.Contains("vet inte"))
                    return "nervous";
                if (contentLower.Contains("kanske") || contentLower.Contains("tror"))
                    return "evasive";
                
                return "tense";
            }
            else
            {
                if (contentLower.Contains("förbannat") || contentLower.Contains("ilsket"))
                    return "irritated";
                if (contentLower.Contains("naturligtvis") || contentLower.Contains("självklart"))
                    return "confident";
                
                return "calm";
            }
        }

        // === Data Classes ===

        private class GeneratedCaseJson
        {
            public string Description { get; set; } = string.Empty;
            public string Guilty { get; set; } = string.Empty;
            public List<string> InitialClues { get; set; } = new();
        }
    }

    // === Public Data Transfer Object ===
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