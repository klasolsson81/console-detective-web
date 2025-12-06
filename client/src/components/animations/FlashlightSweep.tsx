const FlashlightSweep = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Mörk overlay */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Ficklampa som svetar */}
      <div className="absolute inset-0 animate-flashlight-sweep">
        <div
          className="absolute top-0 w-48 h-full opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255, 255, 200, 0.4) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        ></div>
      </div>

      {/* Små ljusprickar (stjärnor) som twinklar */}
      <div className="absolute top-4 left-[10%] w-1 h-1 bg-white/40 rounded-full animate-twinkle"></div>
      <div className="absolute top-8 left-[30%] w-1 h-1 bg-white/30 rounded-full animate-twinkle" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-12 right-[20%] w-1 h-1 bg-white/40 rounded-full animate-twinkle" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-6 right-[40%] w-1 h-1 bg-white/30 rounded-full animate-twinkle" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute top-16 left-[60%] w-1 h-1 bg-white/40 rounded-full animate-twinkle" style={{ animationDelay: '1.5s' }}></div>

      <style>{`
        @keyframes flashlight-sweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(calc(100% + 200px));
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.5);
          }
        }

        .animate-flashlight-sweep {
          animation: flashlight-sweep 12s ease-in-out infinite;
        }

        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default FlashlightSweep;
