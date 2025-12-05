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

        // Standard svenska rösten Jonas
        public const string SwedishVoiceJonas = "Hyidyy6OA9R3GpDKGwoZ";

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
        /// </summary>
        /// <param name="text">Texten som ska konverteras till tal</param>
        /// <param name="voiceId">ElevenLabs voice ID (default: Jonas - svensk röst)</param>
        /// <returns>MP3-data som byte array</returns>
        public async Task<byte[]> GenerateSpeechAsync(string text, string? voiceId = null)
        {
            // Validering
            if (string.IsNullOrWhiteSpace(text))
                throw new ArgumentException("Texten får inte vara tom");

            if (text.Length > 5000)
                throw new ArgumentException("Texten är för lång (max 5000 tecken)");

            // Använd Jonas som default om inget voice ID anges
            voiceId ??= SwedishVoiceJonas;

            // Skapa cache-nyckel baserat på text + voiceId
            var cacheKey = $"{voiceId}:{text}";

            // Kolla om vi redan har denna audio i cache
            if (_audioCache.TryGetValue(cacheKey, out var cachedAudio))
            {
                _logger.LogInformation("Returnerar cached audio för text (längd: {Length})", text.Length);
                return cachedAudio;
            }

            try
            {
                _logger.LogInformation("Genererar tal med ElevenLabs för text (längd: {Length})", text.Length);

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

                if (!response.IsSuccessful)
                {
                    _logger.LogError("ElevenLabs API-fel: {StatusCode} - {Content}",
                        response.StatusCode, response.Content);
                    throw new InvalidOperationException($"ElevenLabs API returnerade fel: {response.StatusCode}");
                }

                if (response.RawBytes == null || response.RawBytes.Length == 0)
                {
                    throw new InvalidOperationException("ElevenLabs returnerade tom audio-data");
                }

                // Spara i cache (max 100 items för att inte använda för mycket minne)
                if (_audioCache.Count < 100)
                {
                    _audioCache.TryAdd(cacheKey, response.RawBytes);
                }

                _logger.LogInformation("Tal genererat ({Size} bytes)", response.RawBytes.Length);
                return response.RawBytes;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fel vid generering av tal");
                throw;
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
