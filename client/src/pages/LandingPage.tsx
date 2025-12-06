import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { Eye } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { session, endGame } = useGame();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Om man kommer till startsidan ska vi rensa gamla sessioner
    const hasActiveSession = session && session.cases && session.cases.length > 0;

    if (!hasActiveSession) {
      sessionStorage.clear();
      localStorage.clear();
      endGame();
    } else {
      navigate('/dashboard');
    }

    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, [session, navigate, endGame]);

  const handleStartGame = () => {
    sessionStorage.removeItem('gameSession');
    navigate('/setup');
  };

  return (
    <div className="min-h-screen bg-noir-darkest relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/startbackground.jpg)' }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/70" />
      </div>


      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo/Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <Eye className="text-noir-accent" size={60} />
            <div className="relative">
              <h1 className="text-6xl md:text-7xl font-noir font-black text-noir-accent text-shadow-noir">
                CONSOLE DETECTIVE AI
              </h1>
              {/* "Online" neon badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="absolute -bottom-4 -right-4 md:-right-8"
              >
                <span className="text-2xl md:text-3xl font-noir text-red-500 animate-pulse"
                  style={{
                    textShadow: '0 0 10px #ff0000, 0 0 20px #ff0000, 0 0 30px #ff0000'
                  }}
                >
                  ONLINE
                </span>
              </motion.div>
            </div>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-xl md:text-2xl text-gray-300 font-detective tracking-wider"
          >
            Lös mord, rån och mysterier med AI-genererade fall
          </motion.p>
        </motion.div>

        {/* Tagline */}
        {showContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="text-center max-w-3xl mb-16"
          >
            <p className="text-3xl md:text-4xl font-noir italic text-gray-200 mb-6 text-shadow-noir">
              "Varje brottslinje döljer en sanning"
            </p>
            <p className="text-lg text-gray-400 leading-relaxed">
              Välkommen till världens första AI-drivna detektivspel. Utforska unika,
              AI-genererade mysterier där varje fall är olika. Förhör misstänkta,
              samla ledtrådar och avslöja sanningen.
            </p>
          </motion.div>
        )}

        {/* Start Game Button */}
        {showContent && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(212,175,55,0.6)' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartGame}
              className="btn-primary text-2xl px-16 py-6 font-noir tracking-wider"
            >
              🕵️ STARTA NYTT SPEL
            </motion.button>
            <p className="text-sm text-gray-500 mt-2 font-detective">
              Ingen registrering krävs - spela direkt!
            </p>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="absolute bottom-8 left-0 right-0 text-center"
        >
          <div className="text-noir-accent text-6xl">▼</div>
        </motion.div>
      </div>

      {/* Noise Filter */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-repeat"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
    </div>
  );
};

export default LandingPage;