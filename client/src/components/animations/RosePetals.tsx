import { useEffect, useState } from 'react';

interface Petal {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

const RosePetals = () => {
  const [petals, setPetals] = useState<Petal[]>([]);

  useEffect(() => {
    // Skapa 12 slumpmässiga rosenblad
    const newPetals: Petal[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100, // 0-100%
      delay: Math.random() * 8, // 0-8s delay
      duration: 10 + Math.random() * 8, // 10-18s duration (långsamt fall)
      size: 15 + Math.random() * 20, // 15-35px
      rotation: Math.random() * 360, // 0-360deg start rotation
    }));
    setPetals(newPetals);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {petals.map((petal) => (
        <div
          key={petal.id}
          className="absolute animate-fall-petal"
          style={{
            left: `${petal.left}%`,
            animationDelay: `${petal.delay}s`,
            animationDuration: `${petal.duration}s`,
            width: `${petal.size}px`,
            height: `${petal.size * 1.2}px`,
          }}
        >
          <div
            className="w-full h-full animate-sway"
            style={{
              animationDuration: `${3 + Math.random() * 2}s`,
              animationDelay: `${petal.delay}s`,
            }}
          >
            {/* Rosenblad form - rundad hjärtform */}
            <div
              className="w-full h-full rounded-full opacity-60"
              style={{
                background: 'radial-gradient(ellipse at 30% 30%, #dc2626 0%, #991b1b 60%, #7f1d1d 100%)',
                transform: `rotate(${petal.rotation}deg)`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                clipPath: 'ellipse(45% 50% at 50% 45%)',
              }}
            ></div>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes fall-petal {
          0% {
            transform: translateY(-100px) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(calc(100vh + 100px)) translateX(100px) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes sway {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-20px);
          }
          75% {
            transform: translateX(20px);
          }
        }

        .animate-fall-petal {
          animation: fall-petal linear infinite;
        }

        .animate-sway {
          animation: sway ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default RosePetals;
