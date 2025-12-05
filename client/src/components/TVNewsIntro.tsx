import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Howl } from 'howler';
import { Player } from '@lottiefiles/react-lottie-player';

interface Case {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string;
}

interface TVNewsIntroProps {
  caseData: Case;
  audioBase64?: string;
  onComplete: () => void;
}

export default function TVNewsIntro({ caseData, audioBase64, onComplete }: TVNewsIntroProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Howl | null>(null);
  const fullText = `${caseData.category.toUpperCase()}: ${caseData.description}`;

  // Typewriter effect
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50); // 50ms per character

    return () => clearInterval(interval);
  }, [fullText]);

  // Audio playback
  useEffect(() => {
    if (audioBase64) {
      try {
        // Convert base64 to data URL
        const dataUrl = `data:audio/mpeg;base64,${audioBase64}`;

        soundRef.current = new Howl({
          src: [dataUrl],
          format: ['mp3'],
          autoplay: true,
          volume: 0.8,
          onplay: () => setIsPlaying(true),
          onend: () => {
            setIsPlaying(false);
            // Wait 1 second after audio ends, then complete
            setTimeout(onComplete, 1000);
          },
          onerror: (id, error) => {
            console.error('Audio playback error:', error);
            // If audio fails, still complete after text animation
            setTimeout(onComplete, 5000);
          }
        });
      } catch (error) {
        console.error('Failed to load audio:', error);
        // Fallback: complete after text animation
        setTimeout(onComplete, 5000);
      }
    } else {
      // No audio, complete after text animation
      setTimeout(onComplete, 5000);
    }

    return () => {
      if (soundRef.current) {
        soundRef.current.unload();
      }
    };
  }, [audioBase64, onComplete]);

  // Normalize location name for image path
  const getLocationImage = (location: string) => {
    const normalized = location
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[åä]/g, 'a')
      .replace(/ö/g, 'o');
    return `/images/locations/${normalized}.jpg`;
  };

  return (
    <AnimatePresence>
      <motion.div
        className="tv-news-intro"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Background: Location image */}
        <div
          className="tv-background"
          style={{
            backgroundImage: `url(${getLocationImage(caseData.location)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Dark overlay for readability */}
          <div className="tv-overlay" />

          {/* Lottie rain overlay (if Murder case) */}
          {caseData.category === 'Mord' && (
            <div className="lottie-rain">
              <Player
                autoplay
                loop
                src="/animations/rain.json"
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  opacity: 0.3,
                  pointerEvents: 'none'
                }}
              />
            </div>
          )}

          {/* TV Frame overlay */}
          <img
            src="/images/tv-frame.png"
            alt="TV Frame"
            className="tv-frame"
          />

          {/* Content area */}
          <motion.div
            className="tv-content"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {/* Category badge */}
            <motion.div
              className="tv-category-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              {caseData.category}
            </motion.div>

            {/* Location */}
            <motion.h2
              className="tv-location"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {caseData.location}
            </motion.h2>

            {/* Typewriter text with CRT filter */}
            <motion.div
              className="tv-description crt-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {displayedText}
              <span className="cursor-blink">|</span>
            </motion.div>

            {/* Audio indicator */}
            {isPlaying && (
              <motion.div
                className="audio-indicator"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <div className="audio-bars">
                  <span className="bar" />
                  <span className="bar" />
                  <span className="bar" />
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        <style>{`
          .tv-news-intro {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 9999;
            background: #000;
          }

          .tv-background {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .tv-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.7),
              rgba(0, 0, 0, 0.85)
            );
          }

          .tv-frame {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            pointer-events: none;
            z-index: 10;
            opacity: 0.6;
          }

          .lottie-rain {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 2;
          }

          .tv-content {
            position: relative;
            z-index: 5;
            max-width: 800px;
            padding: 2rem;
            text-align: center;
          }

          .tv-category-badge {
            display: inline-block;
            padding: 0.5rem 1.5rem;
            background: #D4AF37;
            color: #0A0A0A;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1.5rem;
            letter-spacing: 3px;
            font-weight: bold;
            border-radius: 4px;
            box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);
            margin-bottom: 1rem;
          }

          .tv-location {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 3rem;
            color: #E5E5E5;
            text-transform: uppercase;
            letter-spacing: 4px;
            margin: 1rem 0;
            text-shadow: 0 0 20px rgba(212, 175, 55, 0.5),
                         0 4px 8px rgba(0, 0, 0, 0.8);
          }

          .tv-description {
            font-family: 'Courier New', monospace;
            font-size: 1.25rem;
            color: #E5E5E5;
            line-height: 1.8;
            margin-top: 2rem;
            padding: 1.5rem;
            background: rgba(10, 10, 10, 0.8);
            border: 2px solid rgba(212, 175, 55, 0.3);
            border-radius: 8px;
            backdrop-filter: blur(10px);
            min-height: 120px;
          }

          .crt-text {
            text-shadow: 0 0 5px rgba(229, 229, 229, 0.8),
                         0 0 10px rgba(212, 175, 55, 0.3);
            animation: crt-flicker 0.15s infinite alternate;
          }

          @keyframes crt-flicker {
            0% { opacity: 0.98; }
            100% { opacity: 1; }
          }

          .cursor-blink {
            display: inline-block;
            animation: blink 0.7s infinite;
            color: #D4AF37;
            margin-left: 2px;
          }

          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }

          .audio-indicator {
            position: absolute;
            bottom: 2rem;
            right: 2rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .audio-bars {
            display: flex;
            gap: 4px;
            align-items: flex-end;
            height: 30px;
          }

          .bar {
            width: 4px;
            background: #D4AF37;
            border-radius: 2px;
            animation: audio-pulse 0.6s infinite ease-in-out;
          }

          .bar:nth-child(1) { animation-delay: 0s; height: 60%; }
          .bar:nth-child(2) { animation-delay: 0.2s; height: 80%; }
          .bar:nth-child(3) { animation-delay: 0.4s; height: 100%; }

          @keyframes audio-pulse {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(1.5); }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
