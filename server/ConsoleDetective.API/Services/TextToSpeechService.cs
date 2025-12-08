using System.Collections.Concurrent;
using System.Diagnostics;
using RestSharp;

namespace ConsoleDetective.API.Services
{
    public class TextToSpeechService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<TextToSpeechService> _logger;
        private readonly string? _apiKey;
        private readonly RestClient _client;

        // In-memory cache för att undvika att generera samma text flera gånger
        private static readonly ConcurrentDictionary<string, byte[]> _audioCache = new();

        // ElevenLabs röster (fallback)
        public const string FallbackVoiceAdam = "pNInz6obpgDQGcFmaJgB"; // Gratis engelsk röst

        // Edge-TTS svenska röster (primärt alternativ - helt gratis)
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

            // API-nyckel är optional nu - bara för fallback
            _apiKey = configuration["ELEVENLABS_API_KEY"]
                ?? configuration["ElevenLabs:ApiKey"];

            _client = new RestClient("https://api.elevenlabs.io");
        }

        /// <summary>
        /// Genererar tal från text med fallback-system
        /// Tier 1: Edge-TTS (snabbt och gratis)
        /// Tier 2: ElevenLabs (fallback om Edge-TTS misslyckas)
        /// </summary>
        /// <param name="text">Texten som ska konverteras till tal</param>
        /// <param name="voiceId">Används inte längre (för bakåtkompatibilitet)</param>
        /// <returns>MP3-data som byte array, eller null om TTS misslyckades</returns>
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

            // Skapa cache-nyckel baserat på text
            var cacheKey = $"tts:{text}";

            // Kolla om vi redan har denna audio i cache
            if (_audioCache.TryGetValue(cacheKey, out var cachedAudio))
            {
                _logger.LogInformation("✅ Returnerar cached audio för text (längd: {Length})", text.Length);
                return cachedAudio;
            }

            // Tier 1: Försök Edge-TTS först (snabbt och gratis)
            _logger.LogInformation("🎤 Tier 1: Försöker Edge-TTS (gratis Microsoft TTS)");
            var (edgeAudioBytes, usedVoice) = await TryGenerateWithEdgeTtsAsync(text);
            if (edgeAudioBytes != null)
            {
                _logger.LogInformation("✅ Edge-TTS lyckades!");
                // Spara i cache
                if (_audioCache.Count < 100)
                {
                    _audioCache.TryAdd(cacheKey, edgeAudioBytes);
                }
                return edgeAudioBytes;
            }

            // Tier 2: Fallback till ElevenLabs om Edge-TTS misslyckades
            if (!string.IsNullOrEmpty(_apiKey))
            {
                _logger.LogWarning("⚠️ Edge-TTS misslyckades, försöker ElevenLabs fallback");
                var elevenLabsAudio = await TryGenerateWithElevenLabsAsync(text, FallbackVoiceAdam);
                if (elevenLabsAudio != null)
                {
                    _logger.LogInformation("✅ ElevenLabs fallback lyckades!");
                    // Spara i cache
                    if (_audioCache.Count < 100)
                    {
                        _audioCache.TryAdd(cacheKey, elevenLabsAudio);
                    }
                    return elevenLabsAudio;
                }
            }
            else
            {
                _logger.LogWarning("⚠️ Edge-TTS misslyckades och ingen ElevenLabs API-nyckel finns");
            }

            // Inget ljud - spelet fortsätter i tyst läge
            _logger.LogWarning("❌ Alla TTS-alternativ misslyckades för text (längd: {Length}). Spelet fortsätter utan ljud.", text.Length);
            return null;
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

                // Lägg till timeout på 10 sekunder för Edge-TTS
                var outputTask = process.StandardOutput.ReadToEndAsync();
                var errorTask = process.StandardError.ReadToEndAsync();

                var timeoutTask = Task.Delay(TimeSpan.FromSeconds(10));
                var processTask = process.WaitForExitAsync();

                var completedTask = await Task.WhenAny(processTask, timeoutTask);

                if (completedTask == timeoutTask)
                {
                    _logger.LogWarning("⚠️ Edge-TTS timeout (10s) för röst {Voice}, avbryter process", voice);
                    try { process.Kill(); } catch { }
                    return null;
                }

                var output = await outputTask;
                var error = await errorTask;

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
        /// Försöker generera tal med ElevenLabs (fallback)
        /// </summary>
        private async Task<byte[]?> TryGenerateWithElevenLabsAsync(string text, string voiceId)
        {
            try
            {
                _logger.LogInformation("🎤 Genererar tal med ElevenLabs (voiceId: {VoiceId})", voiceId);

                var request = new RestRequest($"/v1/text-to-speech/{voiceId}", Method.Post);
                request.AddHeader("xi-api-key", _apiKey);
                request.AddHeader("Content-Type", "application/json");

                var body = new
                {
                    text = text,
                    model_id = "eleven_multilingual_v2",
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
                    _logger.LogWarning("⚠️ ElevenLabs misslyckades: {StatusCode} - {Content}",
                        response.StatusCode, response.Content);
                    return null;
                }

                if (response.RawBytes == null || response.RawBytes.Length == 0)
                {
                    _logger.LogWarning("⚠️ ElevenLabs returnerade tom audio-data");
                    return null;
                }

                _logger.LogInformation("✅ Tal genererat med ElevenLabs ({Size} bytes)", response.RawBytes.Length);
                return response.RawBytes;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Exception vid generering av tal med ElevenLabs");
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
