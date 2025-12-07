import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { gameAPI } from '../services/api';
import { LeaderboardEntry } from '../types';
import { Trophy, Star, CheckCircle, Volume2, VolumeX, DoorOpen, User, Settings, LogOut } from 'lucide-react';

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

            {/* Guld-ikoner */}
            <button onClick={toggleMute} className="icon-button-gold" title={isMuted ? 'Slå på ljud' : 'Stäng av ljud'}>
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            <button onClick={handleQuit} className="icon-button-gold" title="Avsluta">
              <DoorOpen size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">

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
            <div className="main-layout">
                {/* VÄNSTER: BOK-MAPPAR */}
                <div className="cases-section">
                    <h2 className="section-title">VÄLJ ETT FALL</h2>

                    {activeCases.length === 0 ? (
                      <p className="text-gray-500 italic text-center">Inga aktiva fall.</p>
                    ) : (
                      <div className="books-wrapper">
                        <div className="books-fan">
                          {activeCases.map((caseItem, idx) => {
                            // Beräkna rotation och position för solfjäder-effekt
                            const totalCases = activeCases.length;
                            const centerIndex = (totalCases - 1) / 2;
                            const offsetFromCenter = idx - centerIndex;
                            const rotationDeg = offsetFromCenter * 6; // 6 grader per bok (mindre rotation)
                            const offsetX = offsetFromCenter * 200; // 200px horisontell offset (mer space)
                            const offsetY = Math.abs(offsetFromCenter) * 10; // Mindre böjning uppåt

                            return (
                              <motion.div
                                key={caseItem.id}
                                initial={{ opacity: 0, scale: 0.8, rotateZ: -30 }}
                                animate={{ opacity: 1, scale: 1, rotateZ: rotationDeg }}
                                transition={{ delay: idx * 0.1, type: 'spring', stiffness: 120 }}
                                whileHover={{
                                  y: -40,
                                  rotateZ: 0,
                                  scale: 1.15,
                                  zIndex: 20,
                                  transition: { duration: 0.3 }
                                }}
                                onClick={() => navigate(`/case/${caseItem.id}`)}
                                className="book-card"
                                style={{
                                  transform: `translateX(${offsetX}px) translateY(${offsetY}px) rotate(${rotationDeg}deg)`,
                                }}
                              >
                                {/* BOK-BILD (BAS) */}
                                <img
                                  src={getCaseBookImage(caseItem.category)}
                                  alt={caseItem.category}
                                  className="book-image"
                                  onError={(e) => {
                                    console.error(`Failed to load image: ${getCaseBookImage(caseItem.category)}`);
                                    e.currentTarget.src = '/images/casefolders/mord.png'; // Fallback
                                  }}
                                />

                                {/* TEXT OVANPÅ BOKEN (endast Titel + Plats) */}
                                <div className="book-overlay-text">
                                  <h3 className="book-case-title">{caseItem.title}</h3>
                                  <p className="book-case-location">{caseItem.location}</p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Avslutade fall */}
                    {completedCases.length > 0 && (
                        <div className="completed-section">
                            <h2 className="section-title-muted">
                              <CheckCircle className="text-gray-600" size={20} /> Avslutade Fall
                            </h2>
                            <div className="completed-list">
                                {completedCases.map((c) => (
                                    <div key={c.id} className="completed-item">
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

                {/* HÖGER: TOPPLISTA */}
                <div className="sidebar">
                    <div className="leaderboard-glass">
                        <h3 className="text-xl font-noir text-noir-accent mb-4 flex items-center gap-2">
                          <Trophy size={20} /> Topplista
                        </h3>
                        <div className="space-y-3">
                            {leaderboard.length === 0 ? (
                              <p className="text-gray-500 text-sm italic">Inga resultat än...</p>
                            ) : (
                              leaderboard.map((entry, idx) => (
                                <div key={idx} className="leaderboard-entry-small">
                                    <div className="flex items-center gap-3">
                                        <span className={`rank-small ${idx < 3 ? 'top-three' : ''}`}>#{idx + 1}</span>
                                        <span className="text-gray-300 text-sm">{entry.playerName}</span>
                                    </div>
                                    <span className="font-noir text-noir-accent text-sm">{entry.score}</span>
                                </div>
                              ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* TRE STORA KNAPPAR LÄNGST NER */}
      {!allCompleted && (
        <footer className="dashboard-footer">
          <div className="footer-buttons">
            <button className="footer-btn" onClick={() => alert('Profil-funktionalitet kommer snart!')}>
              <User size={24} />
              <span>PROFIL</span>
            </button>
            <button className="footer-btn" onClick={() => alert('Inställningar kommer snart!')}>
              <Settings size={24} />
              <span>INSTÄLLNINGAR</span>
            </button>
            <button className="footer-btn footer-btn-danger" onClick={handleQuit}>
              <LogOut size={24} />
              <span>LOGGA UT</span>
            </button>
          </div>
        </footer>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');

        .dashboard-container {
          min-height: 100vh;
          background: #0A0A0A;
          position: relative;
          display: flex;
          flex-direction: column;
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

        .dashboard-content {
          flex: 1;
          position: relative;
          z-index: 10;
          padding: 2rem 1rem;
          padding-bottom: 180px; /* Space for footer buttons */
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

        /* MAIN LAYOUT */
        .main-layout {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
        }

        .cases-section {
          position: relative;
        }

        .section-title {
          font-size: 3rem;
          font-family: 'Bebas Neue', sans-serif;
          color: #D4AF37;
          letter-spacing: 4px;
          text-align: center;
          margin-bottom: 3rem;
          text-shadow: 0 0 30px rgba(212, 175, 55, 0.5);
        }

        .section-title-muted {
          font-size: 1.5rem;
          font-family: 'Bebas Neue', sans-serif;
          color: #A0A0A0;
          margin-top: 4rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          letter-spacing: 2px;
        }

        /* BOK-MAPPAR - SOLFJÄDER LAYOUT */
        .books-wrapper {
          min-height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 0;
          position: relative;
        }

        .books-fan {
          position: relative;
          width: 100%;
          max-width: 1400px;
          min-height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .book-card {
          position: absolute;
          width: 400px;
          height: auto;
          cursor: pointer;
          transform-origin: center bottom;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          filter: drop-shadow(0 15px 40px rgba(0, 0, 0, 0.6));
        }

        .book-image {
          width: 100%;
          height: auto;
          display: block;
          pointer-events: none;
          user-select: none;
        }

        .book-overlay-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          width: 70%;
          pointer-events: none;
        }

        .book-case-title {
          font-family: 'Cinzel', serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: #D4AF37;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          line-height: 1.3;
          text-shadow:
            0 2px 6px rgba(0, 0, 0, 1),
            0 0 20px rgba(212, 175, 55, 0.6);
        }

        .book-case-location {
          font-family: 'Cinzel', serif;
          font-size: 1.1rem;
          color: #B89046;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
        }

        /* COMPLETED CASES */
        .completed-section {
          margin-top: 4rem;
        }

        .completed-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .completed-item {
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

        /* LEADERBOARD */
        .sidebar {
          position: sticky;
          top: 100px;
          height: fit-content;
        }

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
          padding: 0.75rem 0.5rem;
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
          min-width: 2rem;
          font-size: 1.1rem;
          color: #707070;
        }

        .rank-number.top-three, .rank-small.top-three {
          color: #D4AF37;
          font-size: 1.3rem;
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

        /* COMPLETION SCREEN */
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

        /* FOOTER BUTTONS */
        .dashboard-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 30;
          background: rgba(26, 26, 26, 0.95);
          backdrop-filter: blur(15px);
          border-top: 2px solid rgba(212, 175, 55, 0.3);
          padding: 1.5rem 2rem;
        }

        .footer-buttons {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          gap: 2rem;
        }

        .footer-btn {
          flex: 1;
          max-width: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1.5rem 2rem;
          background: rgba(212, 175, 55, 0.1);
          border: 2px solid rgba(212, 175, 55, 0.3);
          border-radius: 8px;
          color: #D4AF37;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.1rem;
          letter-spacing: 2px;
          transition: all 0.3s;
          cursor: pointer;
        }

        .footer-btn:hover {
          background: rgba(212, 175, 55, 0.2);
          border-color: #D4AF37;
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(212, 175, 55, 0.3);
        }

        .footer-btn-danger {
          border-color: rgba(220, 38, 38, 0.4);
          color: #dc2626;
        }

        .footer-btn-danger:hover {
          background: rgba(220, 38, 38, 0.2);
          border-color: #dc2626;
          box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3);
        }

        /* RESPONSIVE */
        @media (max-width: 1200px) {
          .main-layout {
            grid-template-columns: 1fr;
          }

          .sidebar {
            position: relative;
            top: 0;
            margin-top: 3rem;
          }
        }

        @media (max-width: 768px) {
          .books-fan {
            flex-direction: column;
            gap: 2rem;
            min-height: auto;
          }

          .book-card {
            position: relative !important;
            transform: none !important;
            margin: 1rem 0;
          }

          .footer-buttons {
            flex-direction: column;
            gap: 1rem;
          }

          .footer-btn {
            max-width: none;
          }

          .dashboard-content {
            padding-bottom: 400px;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
