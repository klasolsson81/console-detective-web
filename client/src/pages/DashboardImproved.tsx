import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { gameAPI } from '../services/api';
import { LeaderboardEntry } from '../types';
import { Eye, Trophy, LogOut, Skull, Briefcase, Home, Heart, Star, CheckCircle } from 'lucide-react';
import { Howl } from 'howler';

const Dashboard = () => {
  const navigate = useNavigate();
  const { session, endGame } = useGame();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const ambientSoundRef = useRef<Howl | null>(null);

  // Parallax effect
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);

  // Ambient sound setup
  useEffect(() => {
    if (!ambientSoundRef.current) {
      ambientSoundRef.current = new Howl({
        src: ['/sounds/ambience/city-night.mp3'],
        loop: true,
        volume: 0.2,
        autoplay: true
      });
    }

    return () => {
      if (ambientSoundRef.current) {
        ambientSoundRef.current.stop();
        ambientSoundRef.current.unload();
      }
    };
  }, []);

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
    setErrorMsg('');

    try {
      const safeAvatar = session.avatar || 'man';
      const safeName = session.playerName || 'Okänd Detektiv';
      const safeScore = session.score || 0;

      await gameAPI.submitScore(safeName, safeAvatar, safeScore);

      setScoreSubmitted(true);
      await loadLeaderboard();

    } catch (error) {
      console.error("Kunde inte spara poäng", error);
      setErrorMsg('Kunde inte spara till topplistan. Försök igen.');
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
    <div className="dashboard-container">
      {/* Parallax background */}
      <motion.div
        className="dashboard-background"
        style={{ y: backgroundY }}
      />

      {/* Vignette overlay */}
      <div className="dashboard-vignette" />

      <header className="dashboard-header">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="avatar-frame">
                <img src={`/images/${session.avatar || 'man'}.png`} alt="Avatar" />
             </div>
             <div>
                <p className="text-gray-400 text-xs uppercase tracking-widest font-noir">Detektiv</p>
                <p className="text-noir-accent font-noir text-lg">{session.playerName}</p>
             </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
                <p className="text-gray-400 text-xs uppercase tracking-widest font-noir">Poäng</p>
                <p className="text-3xl font-noir text-gray-100">{session.score}</p>
            </div>
            <button onClick={handleQuit} className="quit-button">
                <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">

        {allCompleted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="completion-card">
                <Star className="text-noir-accent w-24 h-24 mx-auto mb-6 animate-pulse" />
                <h1 className="text-5xl md:text-6xl font-noir text-noir-accent mb-4">Utredning Avslutad</h1>
                <p className="text-xl text-gray-300 mb-8 font-detective">Bra jobbat, detektiv {session.playerName}.</p>

                <div className="stats-grid">
                    <div className="stat-card">
                        <p className="text-gray-400 text-sm uppercase font-noir">Total Poäng</p>
                        <p className="text-4xl font-noir text-white">{session.score}</p>
                    </div>
                    <div className="stat-card">
                        <p className="text-gray-400 text-sm uppercase font-noir">Lösta Fall</p>
                        <p className="text-4xl font-noir text-green-400">{session.cases.filter(c => c.isSolved).length} / {session.cases.length}</p>
                    </div>
                    <div className="stat-card">
                        <p className="text-gray-400 text-sm uppercase font-noir">Omdöme</p>
                        <p className="text-2xl font-noir text-noir-accent mt-2">{session.score > 300 ? "MÄSTERDETEKTIV" : "AMATÖR"}</p>
                    </div>
                </div>

                {errorMsg && <p className="text-red-400 mb-4">{errorMsg}</p>}

                {!scoreSubmitted ? (
                    <button onClick={handleSubmitFinalScore} disabled={submittingScore} className="btn-primary-large">
                        {submittingScore ? 'Sparar...' : 'SPARA TILL TOPPLISTAN'}
                    </button>
                ) : (
                    <button onClick={() => { endGame(); navigate('/'); }} className="btn-secondary-large">
                        TILLBAKA TILL STARTSIDAN
                    </button>
                )}
            </div>

            <div className="leaderboard-card-large">
                <h3 className="text-2xl font-noir text-white mb-6 flex items-center justify-center gap-2">
                  <Trophy className="text-noir-accent"/> Topplista
                </h3>
                <div className="space-y-3">
                    {leaderboard.map((entry, idx) => (
                         <div key={idx} className={`leaderboard-entry ${entry.playerName === session.playerName && scoreSubmitted ? 'highlighted' : ''}`}>
                            <div className="flex items-center gap-4">
                                <span className={`rank-number ${idx < 3 ? 'top-three' : ''}`}>#{idx + 1}</span>
                                <div className="leaderboard-avatar">
                                     <img src={`/images/${entry.avatar || 'man'}.png`} alt="av" />
                                </div>
                                <span className="text-gray-200 text-lg">{entry.playerName}</span>
                            </div>
                            <span className="font-noir text-noir-accent text-xl">{entry.score}p</span>
                        </div>
                    ))}
                </div>
            </div>

          </motion.div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-10">
                    <div>
                        <h2 className="section-title">
                          <Briefcase className="text-noir-accent" /> Pågående Utredningar
                        </h2>
                        {activeCases.length === 0 ? <p className="text-gray-500 italic">Inga aktiva fall.</p> : (
                            <div className="cases-grid">
                                {activeCases.map((c, idx) => {
                                    const Icon = getIcon(c.category);
                                    return (
                                        <motion.div
                                          key={c.id}
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: idx * 0.1 }}
                                          whileHover={{ y: -8, scale: 1.02 }}
                                          onClick={() => navigate(`/case/${c.id}`)}
                                          className="case-file-card"
                                        >
                                            <div className="case-file-header">
                                              <Icon className="case-icon" />
                                              <span className="case-category">{c.category}</span>
                                            </div>
                                            <h3 className="case-title">{c.title}</h3>
                                            <p className="case-description">{c.description}</p>
                                            <div className="case-glow" />
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {completedCases.length > 0 && (
                        <div>
                            <h2 className="section-title-muted">
                              <CheckCircle className="text-gray-600" /> Avslutade Fall
                            </h2>
                            <div className="cases-grid">
                                {completedCases.map((c) => {
                                    const Icon = getIcon(c.category);
                                    return (
                                        <div key={c.id} className="case-file-completed">
                                            <div className="flex justify-between items-start mb-4">
                                                <Icon className="w-8 h-8 text-gray-600" />
                                                <span className={`status-badge ${c.isSolved ? 'solved' : 'failed'}`}>
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

                <div className="space-y-8">
                    <div className="leaderboard-card">
                        <h3 className="text-xl font-noir text-noir-accent mb-4 flex items-center gap-2">
                          <Trophy size={20} /> Topplista
                        </h3>
                        <div className="space-y-3">
                            {leaderboard.length === 0 ? <p className="text-gray-500 text-sm italic">Inga resultat än...</p> :
                                leaderboard.map((entry, idx) => (
                                    <div key={idx} className="leaderboard-entry-small">
                                        <div className="flex items-center gap-3">
                                            <span className={`rank-small ${idx < 3 ? 'top-three' : ''}`}>#{idx + 1}</span>
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

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');

        .dashboard-container {
          min-height: 100vh;
          background: #0A0A0A;
          position: relative;
          overflow-x: hidden;
        }

        .dashboard-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 120%;
          background-image: url('/images/dashboard-office.jpg');
          background-size: cover;
          background-position: center;
          opacity: 0.15;
          z-index: 0;
          pointer-events: none;
        }

        .dashboard-vignette {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          box-shadow: inset 0 0 150px rgba(0, 0, 0, 0.7);
          pointer-events: none;
          z-index: 1;
        }

        .dashboard-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(26, 26, 26, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
        }

        .avatar-frame {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #D4AF37;
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.3);
        }

        .avatar-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .quit-button {
          color: #dc2626;
          transition: all 0.2s;
        }

        .quit-button:hover {
          color: #ef4444;
          transform: scale(1.1);
        }

        .font-noir {
          font-family: 'Bebas Neue', sans-serif;
          letter-spacing: 2px;
        }

        .section-title {
          font-size: 2rem;
          font-family: 'Bebas Neue', sans-serif;
          color: #E5E5E5;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          letter-spacing: 2px;
        }

        .section-title-muted {
          font-size: 1.75rem;
          font-family: 'Bebas Neue', sans-serif;
          color: #A0A0A0;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          letter-spacing: 2px;
        }

        .cases-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .case-file-card {
          position: relative;
          padding: 2rem;
          background: rgba(26, 26, 26, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(58, 58, 58, 0.5);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .case-file-card:hover {
          border-color: #D4AF37;
          box-shadow: 0 8px 32px rgba(212, 175, 55, 0.2),
                      0 0 20px rgba(212, 175, 55, 0.15);
          background: rgba(26, 26, 26, 0.95);
        }

        .case-file-card:hover .case-glow {
          opacity: 1;
        }

        .case-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }

        .case-file-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .case-icon {
          width: 2rem;
          height: 2rem;
          color: #D4AF37;
        }

        .case-category {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 0.875rem;
          color: #D4AF37;
          letter-spacing: 1px;
        }

        .case-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.5rem;
          color: #E5E5E5;
          margin-bottom: 0.75rem;
          letter-spacing: 1px;
        }

        .case-description {
          font-size: 0.95rem;
          color: #A0A0A0;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .case-file-completed {
          padding: 1.5rem;
          background: rgba(26, 26, 26, 0.5);
          border: 1px solid rgba(139, 139, 139, 0.3);
          border-radius: 8px;
          opacity: 0.7;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          font-family: 'Bebas Neue', sans-serif;
          font-weight: bold;
          border-radius: 4px;
          letter-spacing: 1px;
        }

        .status-badge.solved {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .status-badge.failed {
          background: rgba(220, 38, 38, 0.2);
          color: #dc2626;
        }

        .leaderboard-card, .leaderboard-card-large {
          padding: 2rem;
          background: rgba(26, 26, 26, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .leaderboard-entry, .leaderboard-entry-small {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          border-bottom: 1px solid rgba(139, 139, 139, 0.2);
          transition: all 0.2s;
        }

        .leaderboard-entry:hover {
          background: rgba(212, 175, 55, 0.05);
        }

        .leaderboard-entry.highlighted {
          background: rgba(212, 175, 55, 0.2);
          border: 1px solid #D4AF37;
          border-radius: 4px;
        }

        .rank-number, .rank-small {
          font-family: 'Bebas Neue', sans-serif;
          font-weight: bold;
          width: 1.5rem;
          font-size: 1.25rem;
          color: #707070;
        }

        .rank-number.top-three, .rank-small.top-three {
          color: #D4AF37;
          font-size: 1.5rem;
        }

        .leaderboard-avatar {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          overflow: hidden;
          background: #2A2A2A;
        }

        .leaderboard-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .completion-card {
          padding: 3rem;
          background: rgba(26, 26, 26, 0.9);
          backdrop-filter: blur(10px);
          border: 2px solid #D4AF37;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          margin-bottom: 2rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .stat-card {
          padding: 1.5rem;
          background: rgba(26, 26, 26, 0.8);
          border: 1px solid rgba(139, 139, 139, 0.3);
          border-radius: 8px;
        }

        .btn-primary-large, .btn-secondary-large {
          width: 100%;
          max-width: 28rem;
          margin: 0 auto;
          padding: 1rem 2rem;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.25rem;
          letter-spacing: 2px;
          border-radius: 8px;
          transition: all 0.3s;
          cursor: pointer;
        }

        .btn-primary-large {
          background: #D4AF37;
          color: #0A0A0A;
          border: none;
        }

        .btn-primary-large:hover {
          background: #F0C75E;
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);
          transform: translateY(-2px);
        }

        .btn-secondary-large {
          background: rgba(139, 139, 139, 0.2);
          color: #E5E5E5;
          border: 1px solid rgba(139, 139, 139, 0.5);
        }

        .btn-secondary-large:hover {
          background: rgba(139, 139, 139, 0.3);
          border-color: #D4AF37;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
