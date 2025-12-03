import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Eye, Languages } from 'lucide-react';

const LandingPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { playAsGuest, isAuthenticated, isGuest } = useAuth();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Om redan inloggad eller gäst, gå till dashboard
    if (isAuthenticated || isGuest) {
      navigate('/dashboard');
    }

    // Visa content efter kort delay
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isGuest, navigate]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'sv' ? 'en' : 'sv';
    i18n.changeLanguage(newLang);
  };

  const handlePlayAsGuest = () => {
    playAsGuest();
    navigate('/dashboard');
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
        {/* Logo/Title with Typewriter Effect */}
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

        {/* Tagline with Animation */}
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

        {/* Call to Action Buttons */}
        {showContent && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2 }}
            className="flex flex-col md:flex-row gap-6 items-center"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(212,175,55,0.5)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/login')}
              className="btn-primary text-xl px-12 py-4"
            >
              {t('landing.login')}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/register')}
              className="btn-secondary text-xl px-12 py-4"
            >
              {t('landing.register')}
            </motion.button>
          </motion.div>
        )}

        {/* Guest Mode Button */}
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5 }}
            className="mt-8 text-center"
          >
            <button
              onClick={handlePlayAsGuest}
              className="text-gray-500 hover:text-noir-accent transition-colors duration-300 text-lg underline decoration-dashed"
            >
              🎭 {t('landing.playAsGuest')}
            </button>
            <p className="text-sm text-gray-600 mt-2">
              ⚠️ {t('landing.guestWarning')}
            </p>
          </motion.div>
        )}

        {/* Footer Decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="absolute bottom-8 left-0 right-0 text-center"
        >
          <div className="text-noir-accent text-6xl">▼</div>
          <p className="text-gray-600 text-sm mt-2 font-detective">
            {i18n.language === 'sv' ? 'Sanningen väntar i mörkret...' : 'Truth awaits in the darkness...'}
          </p>
        </motion.div>
      </div>

      {/* Noir Film Grain Effect */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-repeat"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
    </div>
  );
};

export default LandingPage;
