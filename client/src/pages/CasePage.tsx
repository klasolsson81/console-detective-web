import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { caseAPI, chatAPI } from '../services/api';
import { useGame } from '../contexts/GameContext';
import { Case } from '../types';
import {
  ArrowLeft, Search, Users, Lightbulb, MessageSquare, CheckCircle, Loader, XCircle, Volume2, VolumeX
} from 'lucide-react';
import { Howl } from 'howler';
import { Player } from '@lottiefiles/react-lottie-player';
import FlyingMoney from '../components/animations/FlyingMoney';
import FlashlightSweep from '../components/animations/FlashlightSweep';
import RosePetals from '../components/animations/RosePetals';

const getImagePath = (folder: 'suspects' | 'locations', name: string) => {
  if (!name) return '/images/suspects/unknown.png';
  const normalizedName = name.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o');
  // Locations use .jpg, suspects use .png
  const extension = folder === 'locations' ? 'jpg' : 'png';
  return `/images/${folder}/${normalizedName}.${extension}`;
};

const CasePage = () => {
  const { t } = useTranslation();
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { markCaseCompleted, isMuted } = useGame();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState<string>('');
  const [showSolveModal, setShowSolveModal] = useState(false);
  const [solving, setSolving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [narrationPlaying, setNarrationPlaying] = useState(false);
  const [playingClueId, setPlayingClueId] = useState<string | null>(null);

  const narrationSoundRef = useRef<Howl | null>(null);
  const ambientSoundRef = useRef<Howl | null>(null);
  const clueSoundRef = useRef<Howl | null>(null);

  useEffect(() => {
    if (caseId) loadCase();
  }, [caseId]);

  // Load and play narration + ambient sound when case loads
  useEffect(() => {
    if (!caseData) return;

    // Load narration
    loadNarration();

    // Load ambient sound based on category
    loadAmbientSound();

    // Cleanup on unmount
    return () => {
      if (narrationSoundRef.current) {
        narrationSoundRef.current.unload();
      }
      if (ambientSoundRef.current) {
        ambientSoundRef.current.stop();
        ambientSoundRef.current.unload();
      }
      if (clueSoundRef.current) {
        clueSoundRef.current.unload();
      }
    };
  }, [caseData]);

  // Control all audio based on mute state
  useEffect(() => {
    if (narrationSoundRef.current) {
      if (isMuted) {
        narrationSoundRef.current.pause();
        setNarrationPlaying(false);
      } else {
        // Only resume if it was playing
        if (narrationSoundRef.current.playing()) {
          narrationSoundRef.current.play();
          setNarrationPlaying(true);
        }
      }
    }

    if (ambientSoundRef.current) {
      if (isMuted) {
        ambientSoundRef.current.pause();
      } else {
        ambientSoundRef.current.play();
      }
    }

    if (clueSoundRef.current) {
      if (isMuted) {
        clueSoundRef.current.pause();
        setPlayingClueId(null);
      }
    }
  }, [isMuted]);

  const loadCase = async () => {
    try {
      const data = await caseAPI.getCaseById(caseId!);
      setCaseData(data);
    } catch (error) {
      console.error('Failed to load case:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNarration = async () => {
    if (!caseId) return;

    console.log('🎙️ Loading narration for case:', caseId);
    try {
      const narrationBase64 = await caseAPI.getCaseNarration(caseId);
      console.log('🎙️ Narration response:', narrationBase64 ? 'Audio received' : 'No audio');

      if (narrationBase64) {
        const dataUrl = `data:audio/mpeg;base64,${narrationBase64}`;
        console.log('🎙️ Creating Howl with audio length:', narrationBase64.length);

        narrationSoundRef.current = new Howl({
          src: [dataUrl],
          format: ['mp3'],
          volume: 0.8,
          autoplay: !isMuted, // Don't autoplay if muted
          onload: () => console.log('✅ Narration loaded successfully'),
          onplay: () => {
            console.log('▶️ Narration started playing');
            setNarrationPlaying(true);
          },
          onend: () => {
            console.log('⏹️ Narration finished');
            setNarrationPlaying(false);
          },
          onerror: (id, error) => {
            console.error('❌ Narration playback error:', id, error);
            setNarrationPlaying(false);
          }
        });
      } else {
        console.warn('⚠️ No narration audio returned from API');
      }
    } catch (error) {
      console.error('❌ Failed to load narration:', error);
    }
  };

  const loadAmbientSound = () => {
    if (!caseData) return;

    // Choose ambient sound based on category
    let soundFile = '/sounds/ambience/city-night.mp3'; // Default
    if (caseData.category === 'Mord') {
      soundFile = '/sounds/ambience/rain.mp3';
    } else if (caseData.category === 'Inbrott') {
      soundFile = '/sounds/ambience/clock-ticking.mp3';
    }

    ambientSoundRef.current = new Howl({
      src: [soundFile],
      loop: true,
      volume: 0.15,
      autoplay: !isMuted // Don't autoplay if muted
    });
  };

  const toggleNarration = () => {
    if (!narrationSoundRef.current) return;

    if (narrationPlaying) {
      narrationSoundRef.current.pause();
      setNarrationPlaying(false);
    } else {
      narrationSoundRef.current.play();
      setNarrationPlaying(true);
    }
  };

  const playClueAudio = async (clueId: string) => {
    if (isMuted) return; // Don't play if muted

    // If the same clue is already playing, don't restart it
    if (playingClueId === clueId && clueSoundRef.current && clueSoundRef.current.playing()) {
      console.log('🎙️ Clue already playing, ignoring click');
      return;
    }

    console.log('🎙️ Loading audio for clue:', clueId);

    // Stop currently playing clue only if it's a different clue
    if (clueSoundRef.current && playingClueId !== clueId) {
      clueSoundRef.current.unload();
    }

    // Pause narration when playing a clue
    if (narrationSoundRef.current && narrationPlaying) {
      narrationSoundRef.current.pause();
      setNarrationPlaying(false);
    }

    try {
      const clueAudioBase64 = await caseAPI.getClueAudio(clueId);
      console.log('🎙️ Clue audio response:', clueAudioBase64 ? 'Audio received' : 'No audio');

      if (clueAudioBase64) {
        const dataUrl = `data:audio/mpeg;base64,${clueAudioBase64}`;

        clueSoundRef.current = new Howl({
          src: [dataUrl],
          format: ['mp3'],
          volume: 0.9,
          autoplay: true,
          onload: () => console.log('✅ Clue audio loaded successfully'),
          onplay: () => {
            console.log('▶️ Clue audio started playing');
            setPlayingClueId(clueId);
          },
          onend: () => {
            console.log('⏹️ Clue audio finished');
            setPlayingClueId(null);
          },
          onerror: (id, error) => {
            console.error('❌ Clue audio playback error:', id, error);
            setPlayingClueId(null);
          }
        });
      } else {
        console.warn('⚠️ No clue audio returned from API');
      }
    } catch (error) {
      console.error('❌ Failed to load clue audio:', error);
    }
  };

  const handleInvestigate = async () => {
    if (!caseId) return;
    setInvestigating(true);
    try {
      await caseAPI.investigateScene(caseId);
      await loadCase();
    } catch (error) {
      console.error('Investigation failed:', error);
    } finally {
      setInvestigating(false);
    }
  };

  const handleInterrogate = async (suspectName: string) => {
    if (!caseId) return;
    try {
      const session = await chatAPI.startInterrogation(caseId, suspectName);
      navigate(`/interrogation/${session.sessionId}`);
    } catch (error) {
      console.error('Failed to start interrogation:', error);
    }
  };

  const handleSolveCase = async () => {
    if (!caseId || !selectedSuspect) return;

    setSolving(true);
    try {
      const solutionResult = await caseAPI.solveCase(caseId, selectedSuspect);

      // 1. Spara resultatet lokalt FÖRST så popupen visas
      setResult(solutionResult);
      setShowSolveModal(false);

      // 2. Uppdatera poängen i bakgrunden
      if (solutionResult) {
          markCaseCompleted(caseId, solutionResult.isCorrect, solutionResult.pointsAwarded);
      }
    } catch (error) {
      console.error('Failed to solve case:', error);
      alert("Kunde inte skicka in svaret.");
    } finally {
      setSolving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-noir-darkest flex items-center justify-center"><Loader className="animate-spin text-noir-accent" size={48} /></div>;
  if (!caseData) return <div className="min-h-screen bg-noir-darkest flex items-center justify-center"><p className="text-gray-400">Case not found</p></div>;

  return (
    <div className="min-h-screen bg-noir-darkest pb-24 relative overflow-hidden">
      {/* Office background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/dashboard-office.jpg)' }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Back button */}
      <div className="relative z-10 container mx-auto px-4 pt-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-ghost mb-4 flex items-center gap-2 hover:text-noir-accent transition-colors"
        >
          <ArrowLeft size={20} />
          Tillbaka
        </button>
      </div>

      {/* HEADER med textur - mycket rundare hörn */}
      <div
        className="relative z-10 mx-auto max-w-6xl px-4 mb-8"
        style={{
          backgroundImage: 'url(/images/case_ui/header_texture.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '24px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
        }}
      >
        {/* Semi-transparent overlay för bättre läsbarhet */}
        <div className="absolute inset-0 bg-black/20 rounded-3xl" />

        <div className="relative py-8 px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-noir text-white tracking-wider uppercase"
              style={{
                textShadow: '0 4px 8px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8)'
              }}>
            {caseData.title}
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-detective mt-2 tracking-wide"
             style={{
               textShadow: '0 2px 4px rgba(0,0,0,0.8)'
             }}>
            {caseData.category} - {caseData.location}
          </p>
        </div>
      </div>

      {/* MAIN CONTENT - 2 KOLUMNER */}
      <div className="relative z-10 container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* VÄNSTER KOLUMN - Ärende Detaljer */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-noir text-noir-accent uppercase tracking-wider mb-4 flex items-center gap-2">
                <Lightbulb size={24} />
                Ärende Detaljer
              </h2>

              {/* Brottsplats-foto */}
              {caseData.location && (
                <div className="mb-6 rounded-2xl overflow-hidden border-4 border-noir-accent/30 relative shadow-2xl">
                  <img
                    src={getImagePath('locations', caseData.location)}
                    alt={caseData.location}
                    className="w-full h-80 object-cover"
                  />
                  {/* Animation overlays based on case category */}
                  {caseData.category === 'Mord' && (
                    <div className="absolute inset-0 pointer-events-none">
                      <Player
                        autoplay
                        loop
                        src="/animations/rain.json"
                        style={{ width: '100%', height: '100%', opacity: 0.4 }}
                      />
                    </div>
                  )}
                  {caseData.category === 'Bankrån' && <FlyingMoney />}
                  {caseData.category === 'Inbrott' && <FlashlightSweep />}
                  {caseData.category === 'Otrohet' && <RosePetals />}
                </div>
              )}

              {/* Beskrivning med läder-textur - mycket rundare och mer utrymme */}
              <div
                className="p-8 pb-12 rounded-3xl border-4 border-noir-accent/20 relative overflow-hidden"
                style={{
                  backgroundImage: 'url(/images/case_ui/leather_panel_stitched.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Semi-transparent overlay för bättre kontrast */}
                <div className="absolute inset-0 bg-black/30 rounded-3xl" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    {narrationSoundRef.current && (
                      <button
                        onClick={toggleNarration}
                        className="flex items-center gap-2 bg-black/60 hover:bg-black/80 text-noir-accent px-4 py-2 rounded-xl transition-all border border-noir-accent/40 backdrop-blur-sm"
                      >
                        {narrationPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
                        <span className="text-sm font-semibold">{narrationPlaying ? 'Pausera' : 'Spela upp'}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-white leading-relaxed font-detective text-lg pb-2"
                     style={{
                       textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                     }}>
                    {caseData.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* HÖGER KOLUMN - Misstänkta & Ledtrådar */}
          <div className="space-y-6">

            {/* MISSTÄNKTA - 4 i rad som exempel.png */}
            <div>
              <h2 className="text-2xl font-noir text-noir-accent uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users size={24} />
                Misstänkta
              </h2>

              <div className="grid grid-cols-4 gap-3">
                {caseData.possibleSuspects.map((suspect) => (
                  <button
                    key={suspect}
                    onClick={() => handleInterrogate(suspect)}
                    className="group relative transition-all duration-300 transform hover:scale-105"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-noir-accent/40 group-hover:border-noir-accent mb-2 transition-all shadow-xl">
                        <img
                          src={getImagePath('suspects', suspect)}
                          alt={suspect}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-noir-accent font-detective text-sm tracking-wide drop-shadow-lg">
                        {suspect}
                      </span>
                      <MessageSquare className="text-noir-accent/50 group-hover:text-noir-accent mt-1 transition-colors" size={12} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* LEDTRÅDAR - Mycket rundare */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-noir text-noir-accent uppercase tracking-wider flex items-center gap-2">
                  <Search size={24} />
                  Ledtrådar
                </h2>
                <button
                  onClick={handleInvestigate}
                  disabled={investigating}
                  className="bg-noir-accent hover:bg-noir-accent/90 text-black font-bold px-5 py-2 rounded-2xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
                >
                  <Search size={18} />
                  {investigating ? 'Undersöker...' : 'Undersök'}
                </button>
              </div>

              {caseData.clues && caseData.clues.length > 0 ? (
                <div className="space-y-3">
                  {caseData.clues.map((clue) => (
                    <button
                      key={clue.id}
                      onClick={() => playClueAudio(clue.id)}
                      className={`w-full bg-gradient-to-br from-noir-dark to-noir-darker border-2 p-5 rounded-2xl transition-all text-left group hover:shadow-xl ${
                        playingClueId === clue.id
                          ? 'border-noir-accent shadow-lg shadow-noir-accent/40 scale-[1.02]'
                          : 'border-gray-700/50 hover:border-noir-accent/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <Search
                          className={`flex-shrink-0 mt-1 ${
                            playingClueId === clue.id
                              ? 'text-noir-accent animate-pulse'
                              : 'text-gray-500 group-hover:text-noir-accent'
                          }`}
                          size={22}
                        />
                        <div className="flex-1">
                          <p className="text-gray-100 font-detective text-base leading-relaxed"
                             style={{
                               textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                             }}>
                            {clue.text}
                          </p>
                          <p className="text-xs text-gray-500 mt-2 italic uppercase tracking-wide">{clue.type}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 italic text-center py-8 bg-noir-dark/50 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
                  Inga ledtrådar hittade än. Undersök brottsplatsen!
                </p>
              )}
            </div>

            {/* LÖS ÄRENDET KNAPP - Mycket rundare med visuella effekter */}
            <div className="mt-8">
              <button
                onClick={() => setShowSolveModal(true)}
                className="w-full py-5 rounded-3xl text-xl font-detective uppercase tracking-widest text-black hover:scale-[1.03] hover:shadow-[0_15px_50px_rgba(212,175,55,0.8)] transition-all duration-300 shadow-2xl relative overflow-hidden group"
                style={{
                  background: 'linear-gradient(145deg, #d4af37 0%, #ffd700 50%, #d4af37 100%)',
                  boxShadow: '0 10px 40px rgba(212,175,55,0.7), inset 0 3px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.4)'
                }}
              >
                <span className="relative z-10 drop-shadow-lg font-bold tracking-wider">LÖS ÄRENDET</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                {/* Extra glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                     style={{
                       background: 'radial-gradient(circle at center, rgba(255,215,0,0.3) 0%, transparent 70%)'
                     }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* INPUT MODAL */}
      {showSolveModal && !result && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card-noir p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl sm:text-3xl font-noir text-noir-accent mb-4">Välj den skyldige</h2>
            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
              {caseData.possibleSuspects.map((suspect) => (
                <button key={suspect} onClick={() => setSelectedSuspect(suspect)} className={`w-full p-4 border-2 rounded transition-all ${selectedSuspect === suspect ? 'border-noir-accent bg-noir-accent/10' : 'border-gray-700 hover:border-gray-600'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-600 flex-shrink-0"><img src={getImagePath('suspects', suspect)} alt={suspect} className="w-full h-full object-cover" /></div>
                    <span className="text-gray-100 font-detective text-lg">{suspect}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowSolveModal(false)} className="btn-ghost flex-1">Avbryt</button>
              <button onClick={handleSolveCase} disabled={!selectedSuspect || solving} className="btn-primary flex-1">{solving ? 'Skickar...' : 'Skicka in'}</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* RESULTAT POPUP (OVERLAY) - Nu garanterat synlig */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-noir-darkest/95 z-[60] flex items-center justify-center p-4"
          >
            <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="card-noir p-12 text-center max-w-2xl w-full border-2 border-noir-accent shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              {result.isCorrect ? (
                <>
                  <CheckCircle className="text-green-400 mx-auto mb-6 drop-shadow-lg" size={80} />
                  <h1 className="text-5xl font-noir text-green-400 mb-4">RÄTT!</h1>
                  <p className="text-xl text-gray-300 mb-8">Snyggt jobbat, detektiv. Rättvisan har skipats.</p>
                </>
              ) : (
                <>
                  <XCircle className="text-red-400 mx-auto mb-6 drop-shadow-lg" size={80} />
                  <h1 className="text-5xl font-noir text-red-400 mb-6">FEL!</h1>
                  <div className="bg-noir-dark p-6 rounded border border-gray-700 mb-6">
                      <p className="text-gray-400 text-sm uppercase tracking-widest mb-4">Den skyldige var</p>
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-red-900 mx-auto mb-4">
                        <img src={getImagePath('suspects', result.guiltyParty)} alt={result.guiltyParty} className="w-full h-full object-cover grayscale" />
                      </div>
                      <p className="text-3xl text-noir-accent font-noir">{result.guiltyParty}</p>
                  </div>
                </>
              )}

              <p className="text-2xl text-gray-200 mb-8">
                Poäng: <span className={result.pointsAwarded > 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                    {result.pointsAwarded > 0 ? '+' : ''}{result.pointsAwarded}
                </span>
              </p>

              <button onClick={() => navigate('/dashboard')} className="btn-primary w-full py-4 text-xl">
                Tillbaka till Dashboard
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COPYRIGHT FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-md border-t border-noir-accent/20 py-6 text-center">
        <p className="text-noir-accent/60 text-sm tracking-wider">
          © {new Date().getFullYear()} Console Detective. Skapad av Klas Olsson. Alla rättigheter förbehållna.
        </p>
      </footer>
    </div>
  );
};

export default CasePage;
