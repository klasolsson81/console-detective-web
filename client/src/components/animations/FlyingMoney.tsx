const FlyingMoney = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Blinkande polisljus - röd och blå i hörnen */}
      <div className="absolute top-0 left-0 w-32 h-32 animate-police-red opacity-20 blur-3xl"></div>
      <div className="absolute top-0 right-0 w-32 h-32 animate-police-blue opacity-20 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 animate-police-blue opacity-15 blur-3xl" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute bottom-0 right-0 w-32 h-32 animate-police-red opacity-15 blur-3xl" style={{ animationDelay: '0.5s' }}></div>

      {/* Spotlight som svetar fram och tillbaka */}
      <div className="absolute inset-0 animate-spotlight-sweep">
        <div
          className="absolute top-0 w-64 h-full opacity-20"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }}
        ></div>
      </div>

      {/* Subtil vit pulsande overlay för "alarm"-effekt */}
      <div className="absolute inset-0 bg-white animate-alarm-pulse opacity-0"></div>

      <style>{`
        @keyframes police-red {
          0%, 100% {
            background-color: transparent;
          }
          50% {
            background-color: rgba(220, 38, 38, 0.6);
          }
        }

        @keyframes police-blue {
          0%, 100% {
            background-color: transparent;
          }
          50% {
            background-color: rgba(37, 99, 235, 0.6);
          }
        }

        @keyframes spotlight-sweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(calc(100% + 300px));
          }
        }

        @keyframes alarm-pulse {
          0%, 90%, 100% {
            opacity: 0;
          }
          95% {
            opacity: 0.08;
          }
        }

        .animate-police-red {
          animation: police-red 1.2s ease-in-out infinite;
        }

        .animate-police-blue {
          animation: police-blue 1.2s ease-in-out infinite;
        }

        .animate-spotlight-sweep {
          animation: spotlight-sweep 8s ease-in-out infinite;
        }

        .animate-alarm-pulse {
          animation: alarm-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default FlyingMoney;
