import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { gameAPI } from '../services/api';
import { LeaderboardEntry } from '../types';
import { Trophy, Star, CheckCircle, Volume2, VolumeX, DoorOpen, User, Settings, LogOut } from 'lucide-react';
import { Howl } from 'howler';

const Dashboard = () => {
  const navigate = useNavigate();
  const { session, endGame, isMuted, toggleMute } = useGame();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null);

  // Sound refs
  const hoverSoundRef = useRef<Howl | null>(null);

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

  // Load hover sound effect
  useEffect(() => {
    hoverSoundRef.current = new Howl({
      src: ['/sounds/effects/whoosh2.mp3'],
      volume: 0.3, // Subtle volume
      preload: true
    });

    return () => {
      if (hoverSoundRef.current) {
        hoverSoundRef.current.unload();
      }
    };
  }, []);

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

  const handleBookHover = (bookId: string) => {
    // Only play sound if hovering a new book and not muted
    if (hoveredBookId !== bookId && !isMuted && hoverSoundRef.current) {
      setHoveredBookId(bookId);

      // Stop any currently playing sound before playing new one
      if (hoverSoundRef.current.playing()) {
        hoverSoundRef.current.stop();
      }

      hoverSoundRef.current.play();
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

  // Hämta specifika transforms för varje bok
  const getBookTransform = (category: string) => {
    switch (category) {
      case 'Mord': return { rotation: -15, translateY: 20, zIndex: 1 };
      case 'Bankrån': return { rotation: -5, translateY: 0, zIndex: 2 };
      case 'Inbrott': return { rotation: 5, translateY: 0, zIndex: 3 };
      case 'Otrohet': return { rotation: 15, translateY: 20, zIndex: 4 };
      default: return { rotation: 0, translateY: 0, zIndex: 1 };
    }
  };

  // Hämta brottsplats-bild baserat på location
  const getLocationImage = (location: string) => {
    if (!location) return '/images/locations/unknown.jpg';
    const normalizedName = location.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[åä]/g, 'a')
      .replace(/ö/g, 'o');
    return `/images/locations/${normalizedName}.jpg`;
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
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* Mobile: Stack vertically, Desktop: Side by side */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
            {/* Left: Avatar and name */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-start">
               <div className="avatar-frame" style={{ width: '48px', height: '48px' }}>
                  <img src={`/images/${session.avatar || 'man'}.png`} alt="Avatar" className="w-full h-full" />
               </div>
               <div className="text-center sm:text-left">
                  <p className="text-gray-400 text-xs uppercase tracking-widest font-noir">Detektiv</p>
                  <p className="text-noir-accent font-noir text-base sm:text-lg truncate max-w-[150px] sm:max-w-none">{session.playerName}</p>
               </div>
            </div>

            {/* Right: Score and buttons */}
            <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-center sm:text-right">
                  <p className="text-gray-400 text-xs uppercase tracking-widest font-noir">Poäng</p>
                  <p className="text-2xl sm:text-3xl font-noir text-gray-100">{session.score}</p>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={toggleMute} className="icon-button-gold" title={isMuted ? 'Slå på ljud' : 'Stäng av ljud'}>
                  {isMuted ? <VolumeX size={18} className="sm:w-5 sm:h-5" /> : <Volume2 size={18} className="sm:w-5 sm:h-5" />}
                </button>

                <button onClick={handleQuit} className="icon-button-gold" title="Avsluta">
                  <DoorOpen size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="dashboard-content">

        {allCompleted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto text-center px-4"
          >
            <div className="completion-card">
                <Star className="text-noir-accent w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-4 sm:mb-6 animate-pulse" />
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-noir text-noir-accent mb-3 sm:mb-4">Utredning Avslutad</h1>
                <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 font-detective">Bra jobbat, detektiv {session.playerName}.</p>

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
                      <div className="books-container">
                        <div className="books-fan-spread">
                          {activeCases.map((caseItem, idx) => {
                            const transforms = getBookTransform(caseItem.category);

                            return (
                              <motion.div
                                key={caseItem.id}
                                initial={{ opacity: 0, scale: 0.8, rotateZ: transforms.rotation - 20 }}
                                animate={{ opacity: 1, scale: 1, rotateZ: transforms.rotation }}
                                transition={{ delay: idx * 0.15, type: 'spring', stiffness: 100 }}
                                whileHover={{
                                  y: -50,
                                  rotateZ: 0,
                                  scale: 1.1,
                                  zIndex: 50,
                                  transition: { duration: 0.3 }
                                }}
                                onMouseEnter={() => handleBookHover(caseItem.id)}
                                onClick={() => navigate(`/case/${caseItem.id}`)}
                                className={`book-item book-${idx + 1}`}
                                style={{
                                  transform: `rotate(${transforms.rotation}deg) translateY(${transforms.translateY}px)`,
                                  zIndex: transforms.zIndex,
                                }}
                              >
                                {/* BOK-BILD */}
                                <img
                                  src={getCaseBookImage(caseItem.category)}
                                  alt={caseItem.category}
                                  className="book-img"
                                  onError={(e) => {
                                    console.error(`Failed to load: ${getCaseBookImage(caseItem.category)}`);
                                    e.currentTarget.src = '/images/casefolders/mord.png';
                                  }}
                                />

                                {/* TEXT OVERLAY med bild */}
                                <div className="book-text-overlay">
                                  <h3 className="book-title">{caseItem.category}</h3>
                                  <p className="book-location">{caseItem.location}</p>

                                  {/* Liten brottsplats-bild */}
                                  <div className="book-crime-scene-image">
                                    <img
                                      src={getLocationImage(caseItem.location)}
                                      alt={caseItem.location}
                                      className="w-full h-full object-cover rounded"
                                      onError={(e) => {
                                        console.error(`Failed to load location image: ${caseItem.location}`);
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
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

      {/* COPYRIGHT FOOTER */}
      <footer className="copyright-footer">
        <p>© {new Date().getFullYear()} Console Detective. Skapad av Klas Olsson. Alla rättigheter förbehållna.</p>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');

        * {
          box-sizing: border-box;
        }

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
          padding: 1rem 1rem;
          padding-bottom: 80px;
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

        /* ============================================
           BÖCKER - SOLFJÄDER LAYOUT (NYA SYSTEMET)
           ============================================ */

        .books-container {
          width: 100%;
          min-height: 650px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 0;
          position: relative;
        }

        .books-fan-spread {
          position: relative;
          width: 100%;
          max-width: 1400px;
          height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* VARJE BOK - RESPONSIV STORLEK */
        .book-item {
          position: absolute;
          width: 28%;
          min-width: 250px;
          max-width: 450px;
          height: auto;
          cursor: pointer;
          transform-origin: center bottom;
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          filter: drop-shadow(0 20px 50px rgba(0, 0, 0, 0.8));
        }

        /* BOK 1 - MORD (Längst till vänster, lutad kraftigt vänster) */
        .book-1 {
          left: 0%;
        }

        /* BOK 2 - BANKRÅN (Lite till vänster, lite lutning vänster) */
        .book-2 {
          left: 20%;
        }

        /* BOK 3 - INBROTT (Lite till höger, lite lutning höger) */
        .book-3 {
          left: 40%;
        }

        /* BOK 4 - OTROHET (Längst till höger, lutad kraftigt höger) */
        .book-4 {
          left: 60%;
        }

        .book-img {
          width: 100%;
          height: auto;
          display: block;
          pointer-events: none;
          user-select: none;
        }

        .book-text-overlay {
          position: absolute;
          top: 65%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          width: 80%;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .book-title {
          font-family: 'Cinzel', serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #D4AF37;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          line-height: 1.2;
          text-shadow:
            0 3px 8px rgba(0, 0, 0, 1),
            0 0 25px rgba(212, 175, 55, 0.7);
        }

        .book-location {
          font-family: 'Cinzel', serif;
          font-size: 1rem;
          color: #B89046;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          text-shadow: 0 2px 5px rgba(0, 0, 0, 1);
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

        /* COPYRIGHT FOOTER */
        .copyright-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 30;
          background: rgba(26, 26, 26, 0.95);
          backdrop-filter: blur(15px);
          border-top: 1px solid rgba(212, 175, 55, 0.2);
          padding: 1.5rem 2rem;
          text-align: center;
        }

        .copyright-footer p {
          color: rgba(212, 175, 55, 0.6);
          font-size: 0.875rem;
          letter-spacing: 1px;
          margin: 0;
        }

        /* RESPONSIVE */

        /* Extra stora skärmar (> 1920px) */
        @media (min-width: 1921px) {
          .book-item {
            width: 32%;
            max-width: 550px;
          }
        }

        /* Laptops och mindre desktops (1366px - 1920px) */
        @media (max-width: 1920px) {
          .book-item {
            width: 26%;
            min-width: 220px;
            max-width: 380px;
          }

          .books-fan-spread {
            max-width: 1200px;
            height: 500px;
          }

          .section-title {
            font-size: 2.5rem;
            margin-bottom: 2rem;
          }
        }

        /* Mindre laptops och tablets (1024px - 1365px) */
        @media (max-width: 1365px) {
          .book-item {
            width: 24%;
            min-width: 200px;
            max-width: 320px;
          }

          .books-fan-spread {
            height: 450px;
          }
        }

        /* Tablets (768px - 1023px) */
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

        @media (max-width: 1023px) {
          .book-item {
            width: 28%;
            min-width: 180px;
            max-width: 280px;
          }

          .books-fan-spread {
            height: 400px;
          }

          .book-title {
            font-size: 1.2rem;
          }

          .book-location {
            font-size: 0.85rem;
          }
        }

        /* Mobiler och små tablets (< 768px) */
        @media (max-width: 768px) {
          .books-fan-spread {
            flex-direction: column;
            height: auto;
            gap: 2rem;
          }

          .book-item {
            position: relative !important;
            left: auto !important;
            width: 85% !important;
            min-width: 200px !important;
            max-width: 350px !important;
            margin: 0 auto;
          }

          .book-1, .book-2, .book-3, .book-4 {
            left: auto !important;
          }

          .dashboard-content {
            padding-bottom: 80px;
          }

          .section-title {
            font-size: 2rem;
          }
        }

        /* Extra små mobiler (< 480px) */
        @media (max-width: 480px) {
          .book-item {
            width: 95% !important;
            max-width: 280px !important;
          }

          .book-title {
            font-size: 1rem;
          }

          .book-location {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
