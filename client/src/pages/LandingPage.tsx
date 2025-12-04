import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGame } from '../contexts/GameContext';
import { Eye, Languages } from 'lucide-react';

const LandingPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session, endGame } = useGame(); // Hämta endGame för att kunna nollställa
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // === "STÄDPATRULLEN" ===
    // Om man kommer till startsidan ska vi rensa gamla sessioner för att undvika buggar.
    // Men om man redan har en AKTIV session (från context) låter vi den vara.
    const hasActiveSession = session && session.cases && session.cases.length > 0;
    
    if (!hasActiveSession) {
      // Rensa allt gammalt skräp
      sessionStorage.clear();
      localStorage.clear();
      // Kalla på endGame för att nollställa context
      endGame();
    } else {
      // Om vi har en giltig session, gå till dashboard
      navigate('/dashboard');
    }

    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, [session, navigate, endGame]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'sv' ? 'en' : 'sv';
    i18n.changeLanguage(newLang);
  };

  const handleStartGame = () => {
    // Dubbelkolla att vi är rena innan vi startar nytt
    sessionStorage.removeItem('gameSession');
    navigate('/setup');
  };

  return (
    <div className="min-h-screen bg-noir-darkest relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-96 h-96 bg-noir-accent rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-noir-blood rounded-full blur-[120px] animate-pulse animation-delay-2000" />
      </div>

      {/* Language Switcher */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute top-8 right-8 z-50"
      >
        <button
          onClick={toggleLanguage}
          className="btn-ghost flex items-center gap-2"
        >
          <Languages size={20} />
          {i18n.language === 'sv' ? '🇸🇪 Svenska' : '🇬🇧 English'}
        </button>
      </motion.div>

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
            <h1 className="text-7xl md:text-8xl font-noir font-black text-noir-accent text-shadow-noir">
              {t('app.title')}
            </h1>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-xl md:text-2xl text-gray-400 font-detective tracking-wider"
          >
            {t('app.subtitle')}
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
              "{t('landing.tagline')}"
            </p>
            <p className="text-lg text-gray-400 leading-relaxed">
              {t('landing.intro')}
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
              🕵️ {i18n.language === 'sv' ? 'STARTA NYTT SPEL' : 'START NEW GAME'}
            </motion.button>
            <p className="text-sm text-gray-500 mt-2 font-detective">
              {i18n.language === 'sv' ? 'Ingen registrering krävs - spela direkt!' : 'No registration required - play instantly!'}
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