using RestSharp;
using System.Collections.Concurrent;
using System.Diagnostics;

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

        // Edge-TTS svenska röster (helt gratis, inga begränsningar)
        // Lista över flera röster som fallback om en inte fungerar
        private static readonly string[] EdgeSwedishVoices = new[]
        {
            "sv-SE-SofieNeural",    // Primär kvinnlig svensk röst
            "sv-SE-MattiasNeural",  // Alternativ manlig svensk röst
            "sv-SE-HilleviNeural"   // Alternativ kvinnlig svensk röst
        };

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

            // Tier 3: Fallback till Edge-TTS (Microsoft - helt gratis)
            _logger.LogWarning("⚠️ ElevenLabs misslyckades, försöker med Edge-TTS (gratis Microsoft TTS)");
            var (edgeAudioBytes, usedVoice) = await TryGenerateWithEdgeTtsAsync(text);
            if (edgeAudioBytes != null)
            {
                // Spara i cache med Edge voice
                var edgeCacheKey = $"edge-tts:{usedVoice}:{text}";
                if (_audioCache.Count < 100)
                {
                    _audioCache.TryAdd(edgeCacheKey, edgeAudioBytes);
                }
                return edgeAudioBytes;
            }

            // Tier 4: Inget ljud - spelet fortsätter i tyst läge
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
        /// Försöker generera tal med Edge-TTS (Microsoft - helt gratis)
        /// Försöker med flera svenska röster tills en fungerar
        /// </summary>
        /// <returns>Tuple med audio bytes och rösten som användes, eller (null, null) om alla misslyckades</returns>
        private async Task<(byte[]? audioBytes, string? voice)> TryGenerateWithEdgeTtsAsync(string text)
        {
            // Försök med varje svensk röst tills en fungerar
            foreach (var voice in EdgeSwedishVoices)
            {
                var result = await TryGenerateWithSingleEdgeVoiceAsync(text, voice);
                if (result != null)
                {
                    return (result, voice);
                }
            }

            _logger.LogError("❌ Alla Edge-TTS röster misslyckades");
            return (null, null);
        }

        /// <summary>
        /// Försöker generera tal med en specifik Edge-TTS röst
        /// </summary>
        private async Task<byte[]?> TryGenerateWithSingleEdgeVoiceAsync(string text, string voice)
        {
            var tempTextFile = string.Empty;
            var tempAudioFile = string.Empty;

            try
            {
                _logger.LogInformation("🎤 Genererar tal med Edge-TTS (röst: {Voice})", voice);

                // Skapa temporära filer
                tempTextFile = Path.Combine(Path.GetTempPath(), $"tts_input_{Guid.NewGuid()}.txt");
                tempAudioFile = Path.Combine(Path.GetTempPath(), $"tts_output_{Guid.NewGuid()}.mp3");

                // Skriv texten till temporär fil för att undvika escape-problem
                await File.WriteAllTextAsync(tempTextFile, text, System.Text.Encoding.UTF8);

                _logger.LogInformation("📝 Edge-TTS kommando: edge-tts --voice {Voice} --file {TextFile} --write-media {AudioFile}",
                    voice, tempTextFile, tempAudioFile);

                // Förbered edge-tts kommando (läs från fil istället för argument)
                var startInfo = new ProcessStartInfo
                {
                    FileName = "edge-tts",
                    Arguments = $"--voice {voice} --file \"{tempTextFile}\" --write-media \"{tempAudioFile}\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = new Process { StartInfo = startInfo };
                process.Start();

                var output = await process.StandardOutput.ReadToEndAsync();
                var error = await process.StandardError.ReadToEndAsync();

                await process.WaitForExitAsync();

                if (!string.IsNullOrWhiteSpace(output))
                {
                    _logger.LogInformation("📤 Edge-TTS stdout: {Output}", output);
                }

                if (process.ExitCode != 0)
                {
                    _logger.LogWarning("⚠️ Edge-TTS misslyckades med röst {Voice} (exit code: {ExitCode}): {Error}",
                        voice, process.ExitCode, error);
                    return null;
                }

                // Läs den genererade filen
                if (File.Exists(tempAudioFile))
                {
                    var audioBytes = await File.ReadAllBytesAsync(tempAudioFile);
                    if (audioBytes.Length > 0)
                    {
                        _logger.LogInformation("✅ Tal genererat med Edge-TTS röst {Voice} ({Size} bytes)", voice, audioBytes.Length);
                        return audioBytes;
                    }
                    else
                    {
                        _logger.LogWarning("⚠️ Edge-TTS skapade tom output-fil för röst {Voice}", voice);
                        return null;
                    }
                }
                else
                {
                    _logger.LogWarning("⚠️ Edge-TTS skapade ingen output-fil för röst {Voice}", voice);
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Exception vid generering av tal med Edge-TTS röst {Voice}", voice);
                return null;
            }
            finally
            {
                // Rensa upp temporära filer
                try
                {
                    if (File.Exists(tempTextFile))
                        File.Delete(tempTextFile);
                    if (File.Exists(tempAudioFile))
                        File.Delete(tempAudioFile);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Kunde inte ta bort temporära filer");
                }
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
