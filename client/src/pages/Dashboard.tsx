import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { gameAPI } from '../services/api';
import { LeaderboardEntry } from '../types';
import { Eye, Trophy, LogOut, Skull, Briefcase, Home, Heart, Star, CheckCircle, XCircle } from 'lucide-react';

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
    if (confirm("Är du säker? Din session avslutas.")) {
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
      await loadLeaderboard();
    } catch (error) {
      console.error("Kunde inte spara poäng", error);
    } finally {
      setSubmittingScore(false);
    }
  };

  if (!session) return null;

  const allCompleted = session.cases.every(c => c.isCompleted);
  const activeCases = session.cases.filter(c => !c.isCompleted);
  const completedCases = session.cases.filter(c => c.isCompleted);
  
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
      <header className="bg-noir-darker border-b border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full overflow-hidden border border-noir-accent">
                <img src={`/images/${session.avatar}.png`} alt="Avatar" className="w-full h-full object-cover" />
             </div>
             <div>
                <p className="text-gray-400 text-xs uppercase tracking-widest">Detektiv</p>
                <p className="text-noir-accent font-noir">{session.playerName}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
                <p className="text-gray-400 text-xs uppercase tracking-widest">Poäng</p>
                <p className="text-2xl font-noir text-gray-100">{session.score}</p>
            </div>
            <button onClick={handleQuit} className="text-red-400 hover:text-red-300">
                <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        
        {/* === SPELET ÄR SLUT (SUMMARY SCREEN) === */}
        {allCompleted ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto text-center">
            <div className="card-noir p-12 mb-8 border-2 border-noir-accent">
                <Star className="text-noir-accent w-24 h-24 mx-auto mb-6 animate-pulse" />
                <h1 className="text-5xl md:text-6xl font-noir text-noir-accent mb-4">Utredning Avslutad</h1>
                <p className="text-xl text-gray-300 mb-8 font-detective">Bra jobbat, detektiv {session.playerName}.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-noir-dark p-6 rounded border border-gray-700">
                        <p className="text-gray-400 text-sm uppercase">Total Poäng</p>
                        <p className="text-4xl font-noir text-white">{session.score}</p>
                    </div>
                    <div className="bg-noir-dark p-6 rounded border border-gray-700">
                        <p className="text-gray-400 text-sm uppercase">Lösta Fall</p>
                        <p className="text-4xl font-noir text-green-400">{session.cases.filter(c => c.isSolved).length} / {session.cases.length}</p>
                    </div>
                    <div className="bg-noir-dark p-6 rounded border border-gray-700">
                        <p className="text-gray-400 text-sm uppercase">Omdöme</p>
                        <p className="text-2xl font-noir text-noir-accent mt-2">{session.score > 300 ? "MÄSTERDETEKTIV" : "AMATÖR"}</p>
                    </div>
                </div>

                {!scoreSubmitted ? (
                    <button onClick={handleSubmitFinalScore} disabled={submittingScore} className="btn-primary w-full max-w-md mx-auto text-xl py-4">{submittingScore ? 'Sparar...' : 'SPARA TILL TOPPLISTAN'}</button>
                ) : (
                    <button onClick={() => { endGame(); navigate('/'); }} className="btn-secondary w-full max-w-md mx-auto">TILLBAKA TILL STARTSIDAN</button>
                )}
            </div>
            {/* Topplista här om man vill */}
          </motion.div>
        ) : (
            // === SPELET PÅGÅR ===
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-10">
                    
                    {/* AKTIVA FALL */}
                    <div>
                        <h2 className="text-3xl font-noir text-gray-100 mb-6 flex items-center gap-3">
                            <Briefcase className="text-noir-accent" /> Pågående Utredningar
                        </h2>
                        {activeCases.length === 0 ? (
                             <p className="text-gray-500 italic">Inga aktiva fall.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeCases.map((c, idx) => {
                                    const Icon = getIcon(c.category);
                                    return (
                                        <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                                            onClick={() => navigate(`/case/${c.id}`)}
                                            className="p-6 border bg-noir-darker relative overflow-hidden group transition-all border-gray-700 hover:border-noir-accent cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start mb-4"><Icon className="w-8 h-8 text-noir-accent" /></div>
                                            <h3 className="text-xl font-noir mb-2 text-gray-100">{c.title}</h3>
                                            <p className="text-sm text-gray-500 line-clamp-2">{c.description}</p>
                                            <div className="absolute bottom-0 left-0 w-full h-1 bg-noir-accent transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* AVSLUTADE FALL */}
                    {completedCases.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-noir text-gray-400 mb-6 flex items-center gap-3">
                                <CheckCircle className="text-gray-600" /> Avslutade Fall
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {completedCases.map((c) => {
                                    const Icon = getIcon(c.category);
                                    return (
                                        <div key={c.id} className="p-6 border bg-noir-dark/50 border-gray-800 opacity-70">
                                            <div className="flex justify-between items-start mb-4">
                                                <Icon className="w-8 h-8 text-gray-600" />
                                                <span className={`px-3 py-1 text-xs font-bold rounded uppercase tracking-wider ${c.isSolved ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'}`}>
                                                    {c.isSolved ? 'LÖST' : 'MISSLYCKAT'}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-noir mb-2 text-gray-500">{c.title}</h3>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    <div className="card-noir p-6">
                        <h3 className="text-xl font-noir text-noir-accent mb-4 flex items-center gap-2"><Trophy size={20} /> Topplista</h3>
                        <div className="space-y-3">
                            {leaderboard.length === 0 ? <p className="text-gray-500 text-sm italic">Inga resultat än...</p> : 
                                leaderboard.map((entry, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm border-b border-gray-800 pb-2">
                                        <div className="flex items-center gap-3">
                                            <span className={`font-bold w-6 ${idx < 3 ? 'text-noir-accent' : 'text-gray-600'}`}>#{idx + 1}</span>
                                            <span className="text-gray-300">{entry.playerName}</span>
                                        </div>
                                        <span className="font-noir text-noir-accent">{entry.score}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;