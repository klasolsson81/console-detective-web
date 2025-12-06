import { Volume2, VolumeX } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { motion } from 'framer-motion';

const MuteButton = () => {
  const { isMuted, toggleMute } = useGame();

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleMute}
      className="fixed top-4 right-4 z-50 bg-noir-dark/80 backdrop-blur-sm border-2 border-noir-accent/50 rounded-full p-3 hover:border-noir-accent transition-all shadow-lg"
      title={isMuted ? 'Slå på ljud' : 'Stäng av ljud'}
    >
      {isMuted ? (
        <VolumeX className="text-red-500" size={24} />
      ) : (
        <Volume2 className="text-noir-accent" size={24} />
      )}
    </motion.button>
  );
};

export default MuteButton;
