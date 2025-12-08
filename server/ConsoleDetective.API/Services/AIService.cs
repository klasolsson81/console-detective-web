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
            // Säkerhet: Validera category
            var validCategories = new[] { "Mord", "Bankrån", "Inbrott", "Otrohet" };
            if (!validCategories.Contains(category))
                throw new ArgumentException($"Ogiltig kategori: {category}");

            var locations = GetLocationsForCategory(category);
            var location = locations[Random.Shared.Next(locations.Length)];

            var suspectsString = string.Join(", ", _validSuspects);

            string prompt = GetCategorySpecificPrompt(category, location, suspectsString);

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
            var clueTypes = caseData.Category == "Otrohet"
                ? new[]
                {
                    "Ett digitalt spår (sms, kvitto, foto)",
                    "En observation om beteende eller förändring",
                    "Ett fysiskt bevis (parfym, hårstrå, accessoar)",
                    "Ett vilseledande spår (något oskyldigt som ser misstänkt ut)"
                }
                : new[]
                {
                    "Ett fysiskt bevis som tappats",
                    "En kvarglömd lapp eller digitalt spår",
                    "Bara en atmosfärisk iakttagelse (inget bevis)",
                    "Ett vilseledande spår (något som ser misstänkt ut men är oskyldigt)"
                };

            var selectedType = clueTypes[Random.Shared.Next(clueTypes.Length)];

            string categorySpecificRules = caseData.Category == "Otrohet"
                ? @"- Detta är ett otrohetfall, INTE ett brott.
- Använd termer som ""personen"", ""partnern"", ""relationen"" - INTE ""offret"" eller ""brottet"".
- Ledtråden ska handla om misstänkt affär, hemliga möten, lögner etc."
                : @"- Kalla offret för ""offret"" eller ""brottsoffret"" - ALDRIG ett specifikt namn";

            string prompt = $@"
SITUATION:
Fall: {caseData.Title}
Plats: {caseData.Location}
Skyldig: {caseData.Guilty}
Möjliga personer: {string.Join(", ", _validSuspects)}

UPPGIFT:
Spelaren undersöker platsen noggrant.
Skriv vad de hittar. Det ska vara av typen: ""{selectedType}"".

NAMNREGLER (KRITISKT):
- Nämn ENDAST dessa personer vid namn: {string.Join(", ", _validSuspects)}
{categorySpecificRules}
- Hitta ALDRIG på nya namn

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
            // Säkerhet: Validera user input
            if (string.IsNullOrWhiteSpace(currentQuestion))
                throw new ArgumentException("Frågan får inte vara tom");

            if (currentQuestion.Length > 500)
                throw new ArgumentException("Frågan är för lång (max 500 tecken)");

            // Säkerhet: Validera suspectName
            if (!_validSuspects.Contains(suspectName))
                throw new ArgumentException($"Ogiltig misstänkt: {suspectName}");

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

            // Get category-specific interrogation rules
            string categoryRules = GetInterrogationCategoryRules(caseData.Category);

            string systemPrompt = $@"
Du spelar rollen av {suspectName} i ett förhör.

VÄRLDSREGLER (KRITISKT VIKTIGT):
1. De ENDA personerna som existerar och får nämnas vid namn är: {string.Join(", ", _validSuspects)}.
{categoryRules}
2. Hitta ALDRIG på nya namn som Elias, Marcus, Sofia etc.
3. Den skyldige i detta fall är: {caseData.Guilty}

KONTEXT:
Brott: {caseData.Title} på {caseData.Location}.
Beskrivning: {caseData.Description}
{behaviorInstruction}

INSTRUKTIONER FÖR SVARET:
- Svara kort (1-3 meningar).
- Använd talspråk och karaktärens röst.
- Skriv på svenska.
- NÄMN ENDAST de 4 misstänkta vid namn.
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

        /// <summary>
        /// Genererar AI-förslag på lämpliga frågor att ställa under förhör
        /// </summary>
        public async Task<List<string>> GenerateSuggestedQuestionsAsync(
            Case caseData,
            string suspectName,
            List<ChatMessageDto> conversationHistory)
        {
            // Säkerhet: Validera suspectName
            if (!_validSuspects.Contains(suspectName))
                throw new ArgumentException($"Ogiltig misstänkt: {suspectName}");

            // Bygg kontext från senaste meddelanden
            string conversationContext = "";
            if (conversationHistory.Any())
            {
                var lastMessages = conversationHistory.TakeLast(4).ToList();
                conversationContext = "SENASTE KONVERSATIONEN:\n" +
                    string.Join("\n", lastMessages.Select(m =>
                        $"{(m.Role == "user" ? "Detektiv" : suspectName)}: {m.Content}"));
            }
            else
            {
                conversationContext = "Detta är början av förhöret. Inga frågor har ställts än.";
            }

            string categoryContext = GetQuestionSuggestionContext(caseData.Category);

            string prompt = $@"
Du är en erfaren detektiv som förhör {suspectName} om följande fall:

FALL: {caseData.Title}
BESKRIVNING: {caseData.Description}
PLATS: {caseData.Location}
MISSTÄNKTA PERSONER: {string.Join(", ", _validSuspects)}

{conversationContext}

{categoryContext}

UPPGIFT:
Föreslå exakt 3 skarpa, relevanta frågor som en detektiv skulle kunna ställa härnäst.

REGLER:
- Frågorna ska vara direkta och undersökande
- Basera dem på fallbeskrivningen och senaste konversationen
- Om det är början: Fråga om alibi, relation till händelsen, eller vad personen såg
- Om konversation pågår: Följ upp på misstänkta svar eller be om förtydliganden
- Variera frågorna - inte tre varianter av samma fråga
- Max 15 ord per fråga
- Nämn ENDAST dessa personer: {string.Join(", ", _validSuspects)}
- Svara ENDAST med frågorna, en per rad, inga nummer eller extra text

EXEMPEL (endast stil, inte innehåll):
Var befann du dig klockan sex på kvällen?
Hur väl kände du offret?
Varför sa du något annat förut?";

            try
            {
                var chat = _client.GetChatClient("gpt-4o-mini");
                var response = await chat.CompleteChatAsync([
                    new SystemChatMessage("Du är en expert på förhörsteknik."),
                    new UserChatMessage(prompt)
                ]);

                var fullResponse = string.Join("\n", response.Value.Content.Select(c => c.Text)).Trim();

                // Parse frågorna - en per rad
                var questions = fullResponse
                    .Split('\n')
                    .Select(q => q.Trim())
                    .Where(q => !string.IsNullOrWhiteSpace(q))
                    // Ta bort eventuella nummer i början (1., 2., etc.)
                    .Select(q => System.Text.RegularExpressions.Regex.Replace(q, @"^\d+[\.\)]\s*", ""))
                    .Where(q => q.Length > 0)
                    .Take(3)
                    .ToList();

                return questions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid generering av frågeförslag");
                // Returnera fallback-frågor om AI misslyckas
                return GetFallbackQuestions(caseData.Category, conversationHistory.Any());
            }
        }

        private string GetQuestionSuggestionContext(string category)
        {
            return category switch
            {
                "Mord" => "Detta är ett mordfall. Fråga om alibi, motiv, och vad personen såg. Kalla offret för 'offret' eller 'brottsoffret'.",
                "Bankrån" => "Detta är ett bankrån. Fråga om var personen var, vad de såg, och om de känner till pengarna.",
                "Inbrott" => "Detta är ett inbrott. Fråga om var personen var, vad de vet om det stulna, och om de såg något misstänkt.",
                "Otrohet" => "Detta är ett otrohetfall. Fråga om relationen, misstänkta beteenden, och observationer. Använd termer som 'partnern' och 'relationen'.",
                _ => "Ställ relevanta frågor baserat på fallet."
            };
        }

        private List<string> GetFallbackQuestions(string category, bool hasConversationStarted)
        {
            if (!hasConversationStarted)
            {
                return category switch
                {
                    "Mord" => new List<string>
                    {
                        "Var befann du dig vid brottstillfället?",
                        "Hur kände du offret?",
                        "Såg du något misstänkt den kvällen?"
                    },
                    "Bankrån" => new List<string>
                    {
                        "Var befann du dig när rånet inträffade?",
                        "Vad vet du om de stulna pengarna?",
                        "Har du något alibi för tidpunkten?"
                    },
                    "Inbrott" => new List<string>
                    {
                        "Var var du när inbrottet skedde?",
                        "Känner du till det som stals?",
                        "Såg du något ovanligt?"
                    },
                    "Otrohet" => new List<string>
                    {
                        "Hur skulle du beskriva er relation?",
                        "Har du märkt några förändringar i beteendet?",
                        "Var var du förra fredagen?"
                    },
                    _ => new List<string>
                    {
                        "Kan du berätta vad du vet?",
                        "Var befann du dig vid tidpunkten?",
                        "Har du något att tillägga?"
                    }
                };
            }
            else
            {
                return new List<string>
                {
                    "Kan du förtydliga det du sa tidigare?",
                    "Finns det något du inte har berättat?",
                    "Varför verkar du tveksam?"
                };
            }
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
            "Inbrott" => new[] { "Stadshuset", "Teknikaffären", "Villa" },
            "Otrohet" => new[] { "Hotell", "Restaurang", "Lägenheten", "Strandpromenaden" },
            _ => new[] { "Okänd plats" }
        };

        private string GetInterrogationCategoryRules(string category)
        {
            return category switch
            {
                "Mord" => @"- Offret/mordoffret ska ALLTID kallas ""offret"", ""brottsoffret"" eller ""den mördade"" - ALDRIG ett specifikt namn.
- Exempel KORREKT: ""Jag såg Carlos vid brottsplatsen när offret attackerades""
- Exempel FEL: ""Jag såg Carlos när han dödade Elias"" (använd ""offret"" istället för Elias)",

                "Bankrån" => @"- Prata om rånet, pengarna som stals, och vad du såg.
- Nämn inga andra namn än de 4 misstänkta.",

                "Inbrott" => @"- Prata om inbrottet, vad som stals, och vad du vet.
- Nämn inga andra namn än de 4 misstänkta.",

                "Otrohet" => @"- Detta handlar om en misstänkt kärleksaffär, INTE ett brott eller mord.
- Prata om relationer, misstankar, observationer av beteende.
- Använd termer som ""partnern"", ""äktenskapet"", ""relationen"" - INTE ""offret"" eller ""brottet"".
- Nämn inga andra namn än de 4 personerna i situationen.",

                _ => @"- Nämn inga andra namn än de 4 misstänkta."
            };
        }

        private string GetCategorySpecificPrompt(string category, string location, string suspectsString)
        {
            return category switch
            {
                "Mord" => $@"
DU ÄR EN MÄSTARE PÅ NOIR-MYSTERIER.
Din uppgift: Skapa ett utmanande mordmysterium som kräver deduktion.

PARAMETRAR:
- Kategori: Mord
- Plats: {location}
- Möjliga misstänkta (ANVÄND ENDAST DESSA): {suspectsString}
- Välj EN skyldig från listan.

KRITISKA REGLER FÖR NAMN:
1. De ENDA personerna som får nämnas vid namn är: {suspectsString}
2. Offret/mordoffret ska ALLTID kallas ""offret"" eller ""mordoffret"" - ALDRIG ett specifikt namn
3. HITTA ALDRIG PÅ nya namn som Elias, Marcus, etc.
4. Exempel KORREKT: ""Ett brutalt mord har begåtts på offret...""
5. Exempel FEL: ""Elias hittades död..."" (använd ""offret"" istället)

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
  ""description"": ""Atmosfärisk berättelse om mordet (max 4 meningar). VIKTIGT: Kalla offret för 'offret' INTE ett specifikt namn!"",
  ""guilty"": ""Namn på mördaren (MÅSTE vara en av: {suspectsString})"",
  ""initialClues"": [""Ledtråd 1 text"", ""Ledtråd 2 text""]
}}",

                "Bankrån" => $@"
DU ÄR EN MÄSTARE PÅ NOIR-MYSTERIER.
Din uppgift: Skapa ett utmanande bankrån-mysterium.

PARAMETRAR:
- Kategori: Bankrån
- Plats: {location}
- Möjliga misstänkta (ANVÄND ENDAST DESSA): {suspectsString}
- Välj EN skyldig från listan.

KRITISKA REGLER FÖR NAMN:
1. De ENDA personerna som får nämnas vid namn är: {suspectsString}
2. HITTA ALDRIG PÅ nya namn.
3. Beskriv rånet, bytesbeloppet, och metoden.

REGLER FÖR FALLET:
1. Svårighetsgrad: HÖG. Gör det inte uppenbart vem som gjorde det.
2. Den skyldige ska ha ett smart alibi eller motiv.
3. Skapa 2 ""InitialClues"":
   - En ledtråd ska vara vag men korrekt (pekar mot den skyldige).
   - En ledtråd ska vara en ""Red Herring"" (falskt spår).
4. Beskrivningen ska vara spännande och detaljerad.

FORMAT:
Svara ENDAST med giltig JSON (ingen markdown, ingen annan text):
{{
  ""description"": ""Spännande berättelse om bankrånet (max 4 meningar)."",
  ""guilty"": ""Namn på rånaren (MÅSTE vara en av: {suspectsString})"",
  ""initialClues"": [""Ledtråd 1 text"", ""Ledtråd 2 text""]
}}",

                "Inbrott" => $@"
DU ÄR EN MÄSTARE PÅ NOIR-MYSTERIER.
Din uppgift: Skapa ett utmanande inbrott-mysterium.

PARAMETRAR:
- Kategori: Inbrott
- Plats: {location}
- Möjliga misstänkta (ANVÄND ENDAST DESSA): {suspectsString}
- Välj EN skyldig från listan.

KRITISKA REGLER FÖR NAMN:
1. De ENDA personerna som får nämnas vid namn är: {suspectsString}
2. HITTA ALDRIG PÅ nya namn.
3. Beskriv vad som stulits och hur inbrottet gick till.

REGLER FÖR FALLET:
1. Svårighetsgrad: HÖG. Gör det inte uppenbart.
2. Den skyldige ska ha tillgång eller kunskap om platsen.
3. Skapa 2 ""InitialClues"":
   - En ledtråd ska vara vag men korrekt (pekar mot den skyldige).
   - En ledtråd ska vara en ""Red Herring"" (falskt spår).
4. Beskrivningen ska vara atmosfärisk och spännande.

FORMAT:
Svara ENDAST med giltig JSON (ingen markdown, ingen annan text):
{{
  ""description"": ""Spännande berättelse om inbrottet (max 4 meningar)."",
  ""guilty"": ""Namn på inbrottstjuven (MÅSTE vara en av: {suspectsString})"",
  ""initialClues"": [""Ledtråd 1 text"", ""Ledtråd 2 text""]
}}",

                "Otrohet" => $@"
DU ÄR EN ERFAREN PRIVATDETEKTIV.
Din uppgift: Skapa en misstänkt kärleksaffär/otrohetssituation.

PARAMETRAR:
- Kategori: Misstänkt otrohet
- Plats: {location}
- De 4 misstänkta älskarna (ANVÄND ENDAST DESSA NAMN): {suspectsString}

KRITISKA REGLER FÖR OTROHET:
1. Använd en UTOMSTÅENDE person som misstänker otrohet (INTE en av de 4).
   - Exempel på utomstående: Josef, Greta, Erik, Lisa, Magnus, Sofia
2. Den utomstående personen misstänker att deras partner har varit otrogen med EN av de 4: {suspectsString}
3. ""Guilty"" = EN av de 4 misstänkta som faktiskt HAR haft en affär.
4. Exempel KORREKT: ""Josef misstänker att hans fru Greta har träffat Nemo i hemlighet. Guilty: Nemo""
5. Exempel KORREKT: ""Erik har sett sin partner Lisa sms:a med Anna sent på kvällen. Guilty: Anna""
6. De 4 misstänkta ska vara älskare/den tredje personen, INTE den som misstänker!

STRUKTUR:
- Utomstående person (Josef/Greta/Erik/Lisa/etc) är den som anlitar detektiven
- Deras partner (också utomstående) misstänks vara otrogen
- EN av de 4 ({suspectsString}) är älskaren/älskarinnan (guilty)

REGLER FÖR FALLET:
1. Svårighetsgrad: MEDEL. Gör det trovärdigt men inte uppenbart.
2. Beskriv misstankarna, observationer, beteendeförändringar.
3. Skapa 2 ""InitialClues"":
   - En ledtråd som pekar mot rätt misstänkt älskare (subtilt).
   - En ledtråd som kan vara missförstånd eller peka mot fel person.
4. Använd realistiska situationer (hemliga möten, sms, parfym, lögner om var man varit).

FORMAT:
Svara ENDAST med giltig JSON (ingen markdown, ingen annan text):
{{
  ""description"": ""Beskriv situationen (max 4 meningar): Vem misstänker (utomstående), vem är partnern som misstänks, vilka observationer gjorts, varför misstankarna finns."",
  ""guilty"": ""Namnet på älskaren/älskarinnan (MÅSTE vara EN av: {suspectsString})"",
  ""initialClues"": [""Ledtråd 1 text"", ""Ledtråd 2 text""]
}}",

                _ => throw new ArgumentException($"Okänd kategori: {category}")
            };
        }

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