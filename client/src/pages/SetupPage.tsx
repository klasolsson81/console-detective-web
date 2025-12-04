import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext'; // Uppdaterad import
import { gameAPI } from '../services/api';
import { User, Loader } from 'lucide-react';

const SetupPage = () => {
  const navigate = useNavigate();
  const { startGame } = useGame();
  
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<'man' | 'woman'>('man');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setLoadingText('Kontaktar högkvarteret...');

    try {
      // 1. Starta generering av 4 fall
      const sessionData = await gameAPI.startSession();
      
      // 2. Initiera spelet i frontend
      startGame(name, avatar, sessionData);
      
      navigate('/dashboard');
    } catch (error) {
      console.error("Failed to start game", error);
      setLoadingText('Något gick fel. Försök igen.');
      setTimeout(() => setLoading(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-noir-darkest flex items-center justify-center px-4">
      {loading ? (
        <div className="text-center">
            <div className="w-20 h-20 border-4 border-noir-accent border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
            <h2 className="text-3xl font-noir text-noir-accent mb-4 animate-pulse">Genererar Fall...</h2>
            <p className="text-gray-400 font-detective">Skapar mord, rån, inbrott och intriger.</p>
            <p className="text-sm text-gray-600 mt-4">(Detta kan ta ca 30 sekunder)</p>
        </div>
      ) : (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-noir p-8 max-w-lg w-full"
        >
          <h1 className="text-4xl font-noir text-noir-accent text-center mb-2">Ny Identitet</h1>
          <p className="text-gray-400 text-center mb-8">Vem är du, detektiv?</p>

          <form onSubmit={handleStart} className="space-y-8">
            {/* Namn Input */}
            <div>
              <label className="block text-gray-300 mb-2 font-detective uppercase tracking-wider">Detektivens Namn</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-noir w-full pl-12 text-lg"
                  placeholder="Namn..."
                  required
                  maxLength={15}
                />
              </div>
            </div>

            {/* Avatar Val */}
            <div>
              <label className="block text-gray-300 mb-4 font-detective uppercase tracking-wider text-center">Välj Utseende</label>
              <div className="flex gap-6 justify-center">
                {/* Man */}
                <div 
                    onClick={() => setAvatar('man')}
                    className={`cursor-pointer transition-all ${avatar === 'man' ? 'scale-110' : 'opacity-50 hover:opacity-80'}`}
                >
                    <div className={`w-24 h-24 rounded-full overflow-hidden border-4 ${avatar === 'man' ? 'border-noir-accent shadow-lg shadow-noir-accent/20' : 'border-gray-700'}`}>
                        <img src="/images/suspects/man.png" alt="Man" className="w-full h-full object-cover" />
                    </div>
                    <p className={`text-center mt-2 font-noir ${avatar === 'man' ? 'text-noir-accent' : 'text-gray-500'}`}>Man</p>
                </div>

                {/* Kvinna */}
                <div 
                    onClick={() => setAvatar('woman')}
                    className={`cursor-pointer transition-all ${avatar === 'woman' ? 'scale-110' : 'opacity-50 hover:opacity-80'}`}
                >
                    <div className={`w-24 h-24 rounded-full overflow-hidden border-4 ${avatar === 'woman' ? 'border-noir-accent shadow-lg shadow-noir-accent/20' : 'border-gray-700'}`}>
                        <img src="/images/suspects/kvinna.png" alt="Kvinna" className="w-full h-full object-cover" />
                    </div>
                    <p className={`text-center mt-2 font-noir ${avatar === 'woman' ? 'text-noir-accent' : 'text-gray-500'}`}>Kvinna</p>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full text-xl py-4">
              BÖRJA UTREDNINGEN
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default SetupPage;