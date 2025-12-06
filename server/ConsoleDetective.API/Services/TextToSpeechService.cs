using RestSharp;
using System.Collections.Concurrent;

namespace ConsoleDetective.API.Services
{
    public class TextToSpeechService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<TextToSpeechService> _logger;
        private readonly string _apiKey;
        private readonly RestClient _client;

        // In-memory cache för att undvika att generera samma text flera gånger
        private static readonly ConcurrentDictionary<string, byte[]> _audioCache = new();

        // Standard svenska rösten Jonas (kräver Creator tier)
        public const string SwedishVoiceJonas = "Hyidyy6OA9R3GpDKGwoZ";

        // Fallback röst Adam (gratis, engelska men fungerar för enkelt ljud)
        public const string FallbackVoiceAdam = "pNInz6obpgDQGcFmaJgB";

        public TextToSpeechService(IConfiguration configuration, ILogger<TextToSpeechService> logger)
        {
            _configuration = configuration;
            _logger = logger;

            // Försök först med Railway-formatet (ELEVENLABS_API_KEY), sedan nested format (ElevenLabs:ApiKey)
            _apiKey = configuration["ELEVENLABS_API_KEY"]
                ?? configuration["ElevenLabs:ApiKey"]
                ?? throw new InvalidOperationException("ElevenLabs API-nyckel saknas i konfigurationen");

            _client = new RestClient("https://api.elevenlabs.io");
        }

        /// <summary>
        /// Genererar tal från text med ElevenLabs API
        /// Med fallback-system: Jonas → Adam → Null (tyst läge)
        /// </summary>
        /// <param name="text">Texten som ska konverteras till tal</param>
        /// <param name="voiceId">ElevenLabs voice ID (default: Jonas - svensk röst)</param>
        /// <returns>MP3-data som byte array, eller null om TTS misslyckades (spelet fortsätter utan ljud)</returns>
        public async Task<byte[]?> GenerateSpeechAsync(string text, string? voiceId = null)
        {
            // Validering
            if (string.IsNullOrWhiteSpace(text))
            {
                _logger.LogWarning("Tom text skickad till TTS, returnerar null");
                return null;
            }

            if (text.Length > 5000)
            {
                _logger.LogWarning("Text för lång ({Length} tecken), trunkerar till 5000", text.Length);
                text = text.Substring(0, 5000);
            }

            // Använd Jonas som default om inget voice ID anges
            voiceId ??= SwedishVoiceJonas;

            // Skapa cache-nyckel baserat på text + voiceId
            var cacheKey = $"{voiceId}:{text}";

            // Kolla om vi redan har denna audio i cache
            if (_audioCache.TryGetValue(cacheKey, out var cachedAudio))
            {
                _logger.LogInformation("✅ Returnerar cached audio för text (längd: {Length})", text.Length);
                return cachedAudio;
            }

            // Tier 1: Försök med önskad röst (Jonas som default)
            var audioBytes = await TryGenerateWithVoiceAsync(text, voiceId, "Primary voice");
            if (audioBytes != null)
            {
                // Spara i cache
                if (_audioCache.Count < 100)
                {
                    _audioCache.TryAdd(cacheKey, audioBytes);
                }
                return audioBytes;
            }

            // Tier 2: Fallback till Adam (gratis röst) om Jonas misslyckades
            if (voiceId == SwedishVoiceJonas)
            {
                _logger.LogWarning("⚠️ Jonas (Creator tier) misslyckades, försöker med Adam (gratis röst)");
                audioBytes = await TryGenerateWithVoiceAsync(text, FallbackVoiceAdam, "Fallback voice (Adam)");
                if (audioBytes != null)
                {
                    // Spara i cache med Adam's voice ID
                    var fallbackCacheKey = $"{FallbackVoiceAdam}:{text}";
                    if (_audioCache.Count < 100)
                    {
                        _audioCache.TryAdd(fallbackCacheKey, audioBytes);
                    }
                    return audioBytes;
                }
            }

            // Tier 3: Inget ljud - spelet fortsätter i tyst läge
            _logger.LogWarning("❌ TTS misslyckades helt för text (längd: {Length}). Spelet fortsätter utan ljud.", text.Length);
            return null;
        }

        /// <summary>
        /// Försöker generera tal med en specifik röst
        /// </summary>
        /// <returns>Audio bytes om lyckat, null om misslyckat</returns>
        private async Task<byte[]?> TryGenerateWithVoiceAsync(string text, string voiceId, string voiceLabel)
        {
            try
            {
                _logger.LogInformation("🎤 Genererar tal med {Label} (voiceId: {VoiceId}, längd: {Length})",
                    voiceLabel, voiceId, text.Length);

                var request = new RestRequest($"/v1/text-to-speech/{voiceId}", Method.Post);
                request.AddHeader("xi-api-key", _apiKey);
                request.AddHeader("Content-Type", "application/json");

                // ElevenLabs API förväntar denna struktur
                var body = new
                {
                    text = text,
                    model_id = "eleven_multilingual_v2", // Stödjer svenska
                    voice_settings = new
                    {
                        stability = 0.5,
                        similarity_boost = 0.75,
                        style = 0.0,
                        use_speaker_boost = true
                    }
                };

                request.AddJsonBody(body);

                var response = await _client.ExecuteAsync(request);

                // Kontrollera olika felkoder
                if (!response.IsSuccessful)
                {
                    var statusCode = (int)response.StatusCode;

                    // 401: Unauthorized / Insufficient quota
                    // 402: Payment Required / Tier limit
                    // 429: Rate limit
                    if (statusCode == 401 || statusCode == 402 || statusCode == 429)
                    {
                        _logger.LogWarning("⚠️ ElevenLabs {Label} misslyckades: {StatusCode} - {Content}",
                            voiceLabel, response.StatusCode, response.Content);
                        return null; // Returnera null för att trigga fallback
                    }

                    // Andra fel - logga och returnera null
                    _logger.LogError("❌ ElevenLabs API-fel ({Label}): {StatusCode} - {Content}",
                        voiceLabel, response.StatusCode, response.Content);
                    return null;
                }

                if (response.RawBytes == null || response.RawBytes.Length == 0)
                {
                    _logger.LogWarning("⚠️ ElevenLabs returnerade tom audio-data ({Label})", voiceLabel);
                    return null;
                }

                _logger.LogInformation("✅ Tal genererat med {Label} ({Size} bytes)", voiceLabel, response.RawBytes.Length);
                return response.RawBytes;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Exception vid generering av tal med {Label}", voiceLabel);
                return null;
            }
        }

        /// <summary>
        /// Rensar audio-cachen (användbart för att frigöra minne)
        /// </summary>
        public void ClearCache()
        {
            _audioCache.Clear();
            _logger.LogInformation("Audio-cache rensad");
        }

        /// <summary>
        /// Returnerar antal cachade audio-filer
        /// </summary>
        public int GetCacheSize()
        {
            return _audioCache.Count;
        }
    }
}
