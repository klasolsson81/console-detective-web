import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { gameAPI } from '../services/api';
import { User, Brain, Music, FileText, Search } from 'lucide-react';
import { Howl } from 'howler';
import { Player } from '@lottiefiles/react-lottie-player';

const detectiveTips = [
  "Tips: Lyssna noga på vad misstänkta säger - ibland avslöjar de sig själva.",
  "Tips: Kontrollera alibin noggrant. Den skyldige ljuger alltid om något.",
  "Tips: Leta efter motsägelser i vittnesmål.",
  "Tips: Motiv, tillfälle och metod - de tre pelarna i varje utredning.",
  "Tips: Ibland är det den minsta detaljen som löser fallet.",
  "Tips: Misstro alltid den som verkar för hjälpsam.",
  "Tips: Håll reda på alla ledtrådar - koppla samman dem.",
  "Tips: Den som har mest att förlora har oftast mest att dölja."
];

const loadingStages = [
  { label: 'Genererar brott...', icon: Brain, time: 0 },
  { label: 'Skapar alibin...', icon: FileText, time: 25 },
  { label: 'Placerar ledtrådar...', icon: Search, time: 50 },
  { label: 'Komponerar musik...', icon: Music, time: 75 }
];

const SetupPage = () => {
  const navigate = useNavigate();
  const { startGame, isMuted } = useGame();

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<'man' | 'woman'>('man');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const rainSoundRef = useRef<Howl | null>(null);

  // Progress animation during loading
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev; // Stop at 95%, complete when API returns
          return prev + 1;
        });
      }, 600); // ~60 seconds to reach 95%

      return () => clearInterval(interval);
    }
  }, [loading]);

  // Update current stage based on progress
  useEffect(() => {
    const stage = loadingStages.findIndex((s, i) => {
      const nextStage = loadingStages[i + 1];
      return progress >= s.time && (!nextStage || progress < nextStage.time);
    });
    setCurrentStage(Math.max(0, stage));
  }, [progress]);

  // Rotate tips every 4 seconds
  useEffect(() => {
    if (loading) {
      const tipInterval = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % detectiveTips.length);
      }, 4000);

      return () => clearInterval(tipInterval);
    }
  }, [loading]);

  // Load and play rain sound
  useEffect(() => {
    if (!rainSoundRef.current) {
      rainSoundRef.current = new Howl({
        src: ['/sounds/ambience/rain.mp3'],
        loop: true,
        volume: 0.2, // Lägre volym så bakgrundsmusiken hörs mer
        autoplay: !isMuted
      });
    }

    return () => {
      if (rainSoundRef.current) {
        rainSoundRef.current.stop();
        rainSoundRef.current.unload();
      }
    };
  }, []);

  // Control rain sound based on mute state
  useEffect(() => {
    if (rainSoundRef.current) {
      if (isMuted) {
        rainSoundRef.current.pause();
      } else {
        rainSoundRef.current.play();
      }
    }
  }, [isMuted]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setProgress(0);

    try {
      // 1. Starta generering av session och fall via API
      const sessionData = await gameAPI.startSession();

      // 2. När API returnerar, sätt progress till 100%
      setProgress(100);

      // 3. Spara sessionen i context (Global state)
      startGame(name, avatar, sessionData);

      // 4. Kort paus för att visa 100% completion
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);

    } catch (error) {
      console.error("Failed to start game", error);
      setLoading(false);
      setProgress(0);
    }
  };

  const CurrentStageIcon = loadingStages[currentStage]?.icon || Brain;

  return (
    <div className="min-h-screen bg-noir-darkest flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/startbackground.jpg)' }}
      >
        <div className="absolute inset-0 bg-black/70" />
      </div>

      {/* Rain Animation */}
      <div className="absolute inset-0 pointer-events-none z-[2] opacity-40">
        <Player
          autoplay
          loop
          src="/animations/rain.json"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full flex items-center justify-center">
      {loading ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-2xl w-full px-8"
        >
          {/* Animated Icon */}
          <motion.div
            key={currentStage}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="mb-8"
          >
            <CurrentStageIcon
              size={80}
              className="mx-auto text-noir-accent drop-shadow-[0_0_15px_rgba(212,175,55,0.6)]"
            />
          </motion.div>

          {/* Main Title */}
          <h2 className="text-4xl font-noir text-noir-accent mb-6 tracking-wide">
            {loadingStages[currentStage]?.label || 'Förbereder...'}
          </h2>

          {/* Progress Bar */}
          <div className="w-full bg-gray-800 rounded-full h-4 mb-4 overflow-hidden border border-gray-700">
            <motion.div
              className="h-full bg-gradient-to-r from-noir-accent via-yellow-500 to-noir-accent rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Progress Percentage */}
          <p className="text-noir-accent font-mono text-2xl font-bold mb-8">
            {progress}%
          </p>

          {/* Rotating Tips */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTip}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="min-h-[60px] flex items-center justify-center"
            >
              <p className="text-gray-400 font-detective text-lg italic px-4">
                {detectiveTips[currentTip]}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Subtle note */}
          <p className="text-sm text-gray-600 mt-8 font-detective">
            Vänligen vänta medan AI-detektiven förbereder dina fall...
          </p>
        </motion.div>
      ) : (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-noir p-8 max-w-lg w-full"
        >
          {/* Uppdaterade Rubriker enligt önskemål */}
          <h1 className="text-4xl font-noir text-noir-accent text-center mb-2">Ny Detektiv</h1>
          <p className="text-gray-400 text-center mb-10 font-detective text-lg">Välj din Detektiv</p>

          <form onSubmit={handleStart} className="space-y-10">
            {/* Namn Input */}
            <div>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-noir w-full pl-14 py-4 text-xl"
                  placeholder="Fyll i ditt namn..."
                  required
                  maxLength={15}
                  autoFocus
                />
              </div>
            </div>

            {/* Avatar Val med bilder */}
            <div className="flex gap-8 justify-center">
                {/* Man */}
                <div 
                    onClick={() => setAvatar('man')}
                    className={`cursor-pointer transition-all group relative ${avatar === 'man' ? 'scale-110' : 'opacity-50 hover:opacity-100 hover:scale-105'}`}
                >
                    {/* Cirkel-behållare för bilden */}
                    <div className={`w-28 h-28 rounded-full overflow-hidden border-4 transition-colors ${
                        avatar === 'man' 
                        ? 'border-noir-accent shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                        : 'border-gray-700 group-hover:border-gray-500'
                    }`}>
                        {/* BILDEN - med rätt sökväg och anpassning */}
                        <img 
                            src="/images/man.png" 
                            alt="Man" 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                    {/* Text under */}
                    <p className={`text-center mt-3 font-noir tracking-wider transition-colors ${avatar === 'man' ? 'text-noir-accent' : 'text-gray-500 group-hover:text-gray-300'}`}>MAN</p>
                </div>

                {/* Kvinna */}
                <div 
                    onClick={() => setAvatar('woman')}
                    className={`cursor-pointer transition-all group relative ${avatar === 'woman' ? 'scale-110' : 'opacity-50 hover:opacity-100 hover:scale-105'}`}
                >
                    {/* Cirkel-behållare för bilden */}
                    <div className={`w-28 h-28 rounded-full overflow-hidden border-4 transition-colors ${
                        avatar === 'woman' 
                        ? 'border-noir-accent shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                        : 'border-gray-700 group-hover:border-gray-500'
                    }`}>
                        {/* BILDEN - med rätt sökväg och anpassning */}
                        <img 
                            src="/images/kvinna.png" 
                            alt="Kvinna" 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                    {/* Text under */}
                    <p className={`text-center mt-3 font-noir tracking-wider transition-colors ${avatar === 'woman' ? 'text-noir-accent' : 'text-gray-500 group-hover:text-gray-300'}`}>KVINNA</p>
                </div>
            </div>

            {/* Submit knapp */}
            <button 
                type="submit" 
                className="btn-primary w-full text-xl py-4 uppercase tracking-wider font-bold"
                disabled={!name.trim()} // Inaktivera om inget namn är ifyllt
            >
              Börja Utredningen
            </button>
          </form>
        </motion.div>
      )}
      </div>

      {/* COPYRIGHT FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-md border-t border-noir-accent/20 py-6 text-center">
        <p className="text-noir-accent/60 text-sm tracking-wider">
          © {new Date().getFullYear()} Console Detective. Skapad av Klas Olsson. Alla rättigheter förbehållna.
        </p>
      </footer>
    </div>
  );
};

export default SetupPage;