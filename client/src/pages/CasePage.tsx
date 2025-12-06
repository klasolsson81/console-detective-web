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
    <div className="min-h-screen bg-noir-darkest pb-12 sm:pb-16 lg:pb-20 relative">
      <div className="bg-noir-darker border-b border-gray-800 py-4 sm:py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={() => navigate('/dashboard')} className="btn-ghost mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <ArrowLeft size={18} className="sm:w-5 sm:h-5" />{t('common.back')}
          </button>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-noir text-noir-accent mb-2 leading-tight">{caseData.title}</h1>
          <p className="text-sm sm:text-base text-gray-400">{caseData.location}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="card-noir p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-noir text-gray-100">{t('case.details')}</h2>
                {narrationSoundRef.current && (
                  <button
                    onClick={toggleNarration}
                    className="btn-secondary flex items-center justify-center gap-2 text-sm sm:text-base py-2"
                    title="Toggle narration"
                  >
                    {narrationPlaying ? <Volume2 size={18} className="sm:w-5 sm:h-5" /> : <VolumeX size={18} className="sm:w-5 sm:h-5" />}
                    <span className="whitespace-nowrap">{narrationPlaying ? 'Pausera' : 'Spela upp'}</span>
                  </button>
                )}
              </div>
              {caseData.location && (
                <div className="mb-4 rounded overflow-hidden border border-gray-700 relative">
                  <img src={getImagePath('locations', caseData.location)} alt={caseData.location} className="w-full h-64 object-cover" />
                  {/* Lottie animation overlays based on case category */}
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
                  {caseData.category === 'Bankrån' && (
                    <div className="absolute inset-0 pointer-events-none">
                      <Player
                        autoplay
                        loop
                        src="/animations/police-lights.json"
                        style={{ width: '100%', height: '100%', opacity: 0.3 }}
                      />
                    </div>
                  )}
                  {caseData.category === 'Inbrott' && (
                    <div className="absolute inset-0 pointer-events-none">
                      <Player
                        autoplay
                        loop
                        src="/animations/smoke.json"
                        style={{ width: '100%', height: '100%', opacity: 0.25 }}
                      />
                    </div>
                  )}
                  {caseData.category === 'Otrohet' && (
                    <div className="absolute inset-0 pointer-events-none">
                      <Player
                        autoplay
                        loop
                        src="/animations/neon-flicker.json"
                        style={{ width: '100%', height: '100%', opacity: 0.2 }}
                      />
                    </div>
                  )}
                </div>
              )}
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{caseData.description}</p>
            </div>
            <div className="card-noir p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-noir text-gray-100 flex items-center gap-2">
                  <Lightbulb className="text-noir-accent" size={24} />
                  <span className="sm:inline">{t('case.clues')}</span>
                </h2>
                <button onClick={handleInvestigate} disabled={investigating} className="btn-primary flex items-center justify-center gap-2 text-sm sm:text-base py-2 whitespace-nowrap">
                  <Search size={18} className="sm:w-5 sm:h-5" />
                  {investigating ? t('case.investigating') : t('case.investigate')}
                </button>
              </div>
              {caseData.clues && caseData.clues.length > 0 ? (
                <div className="space-y-3">
                  {caseData.clues.map((clue) => (
                    <button
                      key={clue.id}
                      onClick={() => playClueAudio(clue.id)}
                      className={`w-full bg-noir-dark border p-4 rounded transition-all text-left group hover:bg-noir-medium ${
                        playingClueId === clue.id
                          ? 'border-noir-accent shadow-lg shadow-noir-accent/20'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Volume2
                          className={`flex-shrink-0 mt-1 ${
                            playingClueId === clue.id
                              ? 'text-noir-accent animate-pulse'
                              : 'text-gray-500 group-hover:text-gray-400'
                          }`}
                          size={20}
                        />
                        <div className="flex-1">
                          <p className="text-gray-300">{clue.text}</p>
                          <p className="text-sm text-gray-500 mt-2">{clue.type}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">{t('case.noCluesYet')}</p>
              )}
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="card-noir p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-noir text-gray-100 mb-4 flex items-center gap-2">
                <Users className="text-noir-accent" size={24} />
                {t('case.suspects')}
              </h2>
              <div className="space-y-2 sm:space-y-3">
                {caseData.possibleSuspects.map((suspect) => (
                  <button
                    key={suspect}
                    onClick={() => handleInterrogate(suspect)}
                    className="w-full bg-noir-dark hover:bg-noir-medium border border-gray-700 hover:border-noir-accent p-3 sm:p-4 rounded transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-gray-600 group-hover:border-noir-accent flex-shrink-0">
                        <img src={getImagePath('suspects', suspect)} alt={suspect} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-sm sm:text-base text-gray-100 font-detective flex-1 text-left">{suspect}</span>
                      <MessageSquare className="text-gray-500 group-hover:text-noir-accent flex-shrink-0" size={18} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="card-noir p-4 sm:p-6 border-2 border-noir-accent/50">
              <h2 className="text-xl sm:text-2xl font-noir text-noir-accent mb-4">{t('case.solve')}</h2>
              <button onClick={() => setShowSolveModal(true)} className="btn-primary w-full py-3 sm:py-4 text-sm sm:text-base">{t('case.solve')} →</button>
            </div>
          </div>
        </div>
      </div>

      {/* INPUT MODAL */}
      {showSolveModal && !result && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card-noir p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl sm:text-3xl font-noir text-noir-accent mb-4">{t('solution.title')}</h2>
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
              <button onClick={() => setShowSolveModal(false)} className="btn-ghost flex-1">{t('common.cancel')}</button>
              <button onClick={handleSolveCase} disabled={!selectedSuspect || solving} className="btn-primary flex-1">{solving ? t('common.loading') : t('solution.submit')}</button>
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
                  <h1 className="text-5xl font-noir text-green-400 mb-4">{t('solution.correct')}</h1>
                  <p className="text-xl text-gray-300 mb-8">Snyggt jobbat, detektiv. Rättvisan har skipats.</p>
                </>
              ) : (
                <>
                  <XCircle className="text-red-400 mx-auto mb-6 drop-shadow-lg" size={80} />
                  <h1 className="text-5xl font-noir text-red-400 mb-6">{t('solution.incorrect')}</h1>
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
                {t('solution.backToDashboard')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CasePage;