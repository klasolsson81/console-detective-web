import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { gameAPI } from '../services/api';
import { LeaderboardEntry } from '../types';
import { Trophy, Star, CheckCircle, Volume2, VolumeX, DoorOpen } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { session, endGame, isMuted, toggleMute } = useGame();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Parallax effect
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);

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

  // Mappar kategori till bok-bild
  const getCaseBookImage = (category: string) => {
    switch (category) {
      case 'Mord': return '/images/casefolders/mord.png';
      case 'Bankrån': return '/images/casefolders/bank.png';
      case 'Inbrott': return '/images/casefolders/inbrott.png';
      case 'Otrohet': return '/images/casefolders/otrohet.png';
      default: return '/images/casefolders/mord.png';
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

            {/* Nya mässing/guld-ikoner */}
            <button onClick={toggleMute} className="icon-button-gold" title={isMuted ? 'Slå på ljud' : 'Stäng av ljud'}>
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            <button onClick={handleQuit} className="icon-button-gold" title="Avsluta">
              <DoorOpen size={20} />
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

            <div className="leaderboard-glass">
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
                {/* CASE BOOKS - Böcker som mappar */}
                <div className="lg:col-span-2">
                    <h2 className="section-title mb-12 text-center lg:text-left">
                      Välj ett Fall
                    </h2>

                    {/* Bok-mappar layout - Solfjäder */}
                    <div className="case-books-container">
                      {activeCases.length === 0 ? (
                        <p className="text-gray-500 italic text-center">Inga aktiva fall.</p>
                      ) : (
                        <div className="case-books-spread">
                          {activeCases.map((caseItem, idx) => (
                            <motion.div
                              key={caseItem.id}
                              initial={{ opacity: 0, rotateZ: -20, y: 50 }}
                              animate={{ opacity: 1, rotateZ: 0, y: 0 }}
                              transition={{ delay: idx * 0.15, type: 'spring', stiffness: 100 }}
                              whileHover={{
                                y: -30,
                                rotateZ: 0,
                                scale: 1.1,
                                zIndex: 10,
                                transition: { duration: 0.3 }
                              }}
                              onClick={() => navigate(`/case/${caseItem.id}`)}
                              className="case-book"
                              style={{
                                '--book-index': idx,
                                '--book-rotation': `${(idx - activeCases.length / 2) * 8}deg`,
                                '--book-offset-x': `${(idx - activeCases.length / 2) * 60}px`,
                                '--book-offset-y': `${Math.abs(idx - activeCases.length / 2) * 15}px`,
                              } as React.CSSProperties}
                            >
                              {/* Bok-bild */}
                              <img
                                src={getCaseBookImage(caseItem.category)}
                                alt={caseItem.category}
                                className="case-book-image"
                              />

                              {/* Text ovanpå boken */}
                              <div className="case-book-text">
                                <p className="case-book-category">{caseItem.category.toUpperCase()}</p>
                                <h3 className="case-book-title">{caseItem.title}</h3>
                                <p className="case-book-location">{caseItem.location}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Avslutade fall - enklare lista */}
                    {completedCases.length > 0 && (
                        <div className="mt-16">
                            <h2 className="section-title-muted">
                              <CheckCircle className="text-gray-600" /> Avslutade Fall
                            </h2>
                            <div className="completed-cases-list">
                                {completedCases.map((c) => (
                                    <div key={c.id} className="completed-case-item">
                                        <span className="text-gray-500 font-noir">{c.title}</span>
                                        <span className={`status-badge ${c.isSolved ? 'solved' : 'failed'}`}>
                                            {c.isSolved ? 'LÖST' : 'MISSLYCKAT'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* LEADERBOARD - Glass morphism design */}
                <div className="space-y-8">
                    <div className="leaderboard-glass">
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
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');

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

        /* Nya mässing/guld-ikoner */
        .icon-button-gold {
          color: #D4AF37;
          transition: all 0.3s;
          background: rgba(212, 175, 55, 0.1);
          padding: 0.5rem;
          border-radius: 6px;
          border: 1px solid rgba(212, 175, 55, 0.3);
        }

        .icon-button-gold:hover {
          color: #F0C75E;
          background: rgba(212, 175, 55, 0.2);
          transform: scale(1.1);
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
        }

        .font-noir {
          font-family: 'Bebas Neue', sans-serif;
          letter-spacing: 2px;
        }

        .section-title {
          font-size: 2.5rem;
          font-family: 'Bebas Neue', sans-serif;
          color: #D4AF37;
          letter-spacing: 3px;
          text-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
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

        /* CASE BOOKS - Solfjäder layout */
        .case-books-container {
          min-height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 0;
          position: relative;
          z-index: 10;
        }

        .case-books-spread {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 450px;
          width: 100%;
          max-width: 900px;
        }

        .case-book {
          position: absolute;
          width: 280px;
          height: 400px;
          cursor: pointer;
          transform:
            translateX(var(--book-offset-x))
            translateY(var(--book-offset-y))
            rotate(var(--book-rotation));
          transform-origin: center bottom;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5));
        }

        .case-book-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
        }

        .case-book-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          width: 75%;
          pointer-events: none;
        }

        .case-book-category {
          font-family: 'Cinzel', serif;
          font-size: 0.7rem;
          font-weight: 600;
          color: #D4AF37;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          text-shadow:
            0 1px 2px rgba(0, 0, 0, 0.8),
            0 0 10px rgba(212, 175, 55, 0.3);
        }

        .case-book-title {
          font-family: 'Cinzel', serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: #B89046;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 0.3rem;
          line-height: 1.3;
          text-shadow:
            0 2px 4px rgba(0, 0, 0, 0.9),
            0 0 15px rgba(184, 144, 70, 0.4);
        }

        .case-book-location {
          font-family: 'Cinzel', serif;
          font-size: 0.8rem;
          color: #8B7355;
          letter-spacing: 1px;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        /* Completed cases - enkel lista */
        .completed-cases-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .completed-case-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(26, 26, 26, 0.5);
          border: 1px solid rgba(139, 139, 139, 0.3);
          border-radius: 6px;
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

        /* LEADERBOARD - Glass morphism */
        .leaderboard-glass {
          padding: 2rem;
          background: rgba(26, 26, 26, 0.6);
          backdrop-filter: blur(20px);
          border: 2px solid rgba(212, 175, 55, 0.3);
          border-radius: 12px;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
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

        /* Responsive adjustments */
        @media (max-width: 1024px) {
          .case-books-spread {
            flex-direction: column;
            gap: 1rem;
          }

          .case-book {
            position: relative;
            transform: none !important;
            margin: 0.5rem 0;
          }

          .case-book:hover {
            transform: scale(1.05) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
