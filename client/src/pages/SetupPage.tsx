import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { gameAPI } from '../services/api';
import { User } from 'lucide-react';

const SetupPage = () => {
  const navigate = useNavigate();
  const { startGame } = useGame();
  
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<'man' | 'woman'>('man');
  const [loading, setLoading] = useState(false);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    try {
      // 1. Starta generering av session och fall via API
      const sessionData = await gameAPI.startSession();
      
      // 2. Spara sessionen i context (Global state)
      startGame(name, avatar, sessionData);
      
      // 3. VIKTIGT: En liten paus för att säkra att state hinner uppdateras
      // innan vi byter sida. Detta förhindrar att man loopas tillbaka.
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);

    } catch (error) {
      console.error("Failed to start game", error);
      // Här kan du visa ett felmeddelande om du vill
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-noir-darkest flex items-center justify-center px-4">
      {loading ? (
        <div className="text-center">
            {/* Spinner */}
            <div className="w-20 h-20 border-4 border-noir-accent border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
            
            {/* Laddningstext */}
            <h2 className="text-3xl font-noir text-noir-accent mb-4 animate-pulse">AI Genererar Fall...</h2>
            <p className="text-gray-400 font-detective text-lg">Skapar motiv, alibin och intriger.</p>
            <p className="text-sm text-gray-600 mt-6 font-detective">(Vänta kvar, detektiv...)</p>
        </div>
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
  );
};

export default SetupPage;