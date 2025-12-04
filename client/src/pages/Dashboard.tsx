import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext'; // Uppdaterad
import { gameAPI } from '../services/api';
import { LeaderboardEntry } from '../types';
import { Eye, Trophy, LogOut, Skull, Briefcase, Home, Heart, Lock } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { session, endGame } = useGame();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }
    loadLeaderboard();
  }, [session, navigate]);

  const loadLeaderboard = async () => {
    try {
      const data = await gameAPI.getLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuit = () => {
    if (confirm("Är du säker? Din session avslutas och poängen sparas inte om du inte är klar.")) {
      endGame();
      navigate('/');
    }
  };

  const handleSubmitFinalScore = async () => {
    if (!session || submittingScore) return;
    setSubmittingScore(true);
    try {
      await gameAPI.submitScore(session.playerName, session.avatar, session.score);
      setScoreSubmitted(true);
      await loadLeaderboard(); // Hämta ny lista
    } catch (error) {
      console.error("Kunde inte spara poäng", error);
    } finally {
      setSubmittingScore(false);
    }
  };

  if (!session) return null;

  const allCompleted = session.cases.every(c => c.isCompleted);
  
  const getIcon = (category: string) => {
    switch (category) {
        case 'Mord': return Skull;
        case 'Bankrån': return Briefcase;
        case 'Inbrott': return Home;
        case 'Otrohet': return Heart;
        default: return Eye;
    }
  };

  return (
    <div className="min-h-screen bg-noir-darkest pb-12">
      {/* Header */}
      <header className="bg-noir-darker border-b border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             {/* Spelarens Avatar */}
             <div className="w-10 h-10 rounded-full overflow-hidden border border-noir-accent">
                <img src={`/images/suspects/${session.avatar}.png`} alt="Avatar" className="w-full h-full object-cover" />
             </div>
             <div>
                <p className="text-gray-400 text-xs uppercase tracking-widest">Detektiv</p>
                <p className="text-noir-accent font-noir">{session.playerName}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
                <p className="text-gray-400 text-xs uppercase tracking-widest">Nuvarande Poäng</p>
                <p className="text-2xl font-noir text-gray-100">{session.score}</p>
            </div>
            <button onClick={handleQuit} className="text-red-400 hover:text-red-300">
                <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Column: Cases */}
        <div className="lg:col-span-2 space-y-6">
            <h2 className="text-3xl font-noir text-gray-100 mb-6">Aktiva Fall</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {session.cases.map((c, idx) => {
                    const Icon = getIcon(c.category);
                    return (
                        <motion.div 
                            key={c.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => !c.isCompleted && navigate(`/case/${c.id}`)}
                            className={`p-6 border border-gray-800 bg-noir-darker relative overflow-hidden group transition-all ${c.isCompleted ? 'opacity-70 grayscale' : 'hover:border-noir-accent cursor-pointer'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <Icon className={`w-8 h-8 ${c.isCompleted ? 'text-gray-600' : 'text-noir-accent'}`} />
                                {c.isCompleted && (
                                    <span className={`px-2 py-1 text-xs font-bold rounded ${c.isSolved ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                                        {c.isSolved ? 'LÖST' : 'MISSLYCKAT'}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-xl font-noir text-gray-100 mb-2">{c.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2">{c.description}</p>
                            
                            {!c.isCompleted && (
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-noir-accent transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {allCompleted && !scoreSubmitted && (
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mt-8 p-8 bg-noir-accent/10 border border-noir-accent text-center"
                >
                    <h3 className="text-3xl font-noir text-noir-accent mb-2">Utredning Avslutad</h3>
                    <p className="text-gray-300 mb-6">Slutpoäng: <span className="text-white font-bold text-xl">{session.score}</span></p>
                    <button 
                        onClick={handleSubmitFinalScore}
                        disabled={submittingScore}
                        className="btn-primary w-full max-w-md mx-auto"
                    >
                        {submittingScore ? 'Sparar...' : 'SPARA TILL TOPPLISTAN & AVSLUTA'}
                    </button>
                </motion.div>
            )}
             {allCompleted && scoreSubmitted && (
                <div className="mt-8 text-center">
                     <p className="text-green-400 mb-4">Poäng sparad!</p>
                     <button onClick={() => { endGame(); navigate('/'); }} className="btn-secondary">
                        TILLBAKA TILL START
                     </button>
                </div>
            )}
        </div>

        {/* Sidebar: Leaderboard & Rules */}
        <div className="space-y-8">
            <div className="card-noir p-6">
                <h3 className="text-xl font-noir text-noir-accent mb-4 flex items-center gap-2">
                    <Trophy size={20} /> Topplista
                </h3>
                <div className="space-y-3">
                    {leaderboard.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">Inga resultat än...</p>
                    ) : (
                        leaderboard.map((entry, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm border-b border-gray-800 pb-2">
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold w-6 ${idx < 3 ? 'text-noir-accent' : 'text-gray-600'}`}>#{idx + 1}</span>
                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800">
                                         <img src={`/images/suspects/${entry.avatar}.png`} alt="av" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-gray-300">{entry.playerName}</span>
                                </div>
                                <span className="font-noir text-noir-accent">{entry.score}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="bg-noir-dark p-6 border border-gray-800 text-sm text-gray-400">
                <h4 className="text-gray-200 font-bold mb-2 uppercase tracking-wider">Regler</h4>
                <ul className="space-y-2 list-disc pl-4">
                    <li>Du har 4 fall att lösa.</li>
                    <li>Rätt gissning: <span className="text-green-400">+100p</span></li>
                    <li>Fel gissning: <span className="text-red-400">-50p</span></li>
                    <li>Undersökning: <span className="text-yellow-500">-10p</span></li>
                    <li>Förhörsfråga: <span className="text-yellow-500">-5p</span></li>
                    <li>Maximal poäng: 400p</li>
                </ul>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;