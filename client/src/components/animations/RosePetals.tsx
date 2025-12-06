const RosePetals = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Neon-ljus som flimrar - röd/rosa/magenta */}
      <div className="absolute top-0 left-0 w-48 h-48 animate-neon-flicker opacity-15 blur-3xl rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.6) 0%, transparent 70%)' }}
      ></div>
      <div className="absolute bottom-0 right-0 w-56 h-56 animate-neon-flicker opacity-12 blur-3xl rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(219, 39, 119, 0.5) 0%, transparent 70%)',
          animationDelay: '0.7s'
        }}
      ></div>
      <div className="absolute top-1/2 right-1/4 w-40 h-40 animate-neon-flicker opacity-10 blur-3xl rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(244, 114, 182, 0.4) 0%, transparent 70%)',
          animationDelay: '1.2s'
        }}
      ></div>

      {/* Subtil dimma/haze-effekt som rör sig */}
      <div className="absolute inset-0 animate-haze-drift opacity-10">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background: 'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
            filter: 'blur(40px)',
          }}
        ></div>
      </div>

      {/* Cigarettrök-effekt - långsam stigande dimma */}
      <div className="absolute bottom-0 left-1/4 w-32 h-64 animate-smoke-rise opacity-5 blur-2xl"
        style={{ background: 'linear-gradient(to top, rgba(255, 255, 255, 0.3) 0%, transparent 100%)' }}
      ></div>

      {/* Subtil pulsande overlay för atmosfär */}
      <div className="absolute inset-0 bg-pink-900 animate-atmosphere-pulse opacity-0"></div>

      <style>{`
        @keyframes neon-flicker {
          0%, 100% {
            opacity: 0.15;
          }
          10% {
            opacity: 0.05;
          }
          15% {
            opacity: 0.2;
          }
          20% {
            opacity: 0.1;
          }
          25%, 75% {
            opacity: 0.15;
          }
          80% {
            opacity: 0.08;
          }
          85% {
            opacity: 0.18;
          }
        }

        @keyframes haze-drift {
          0% {
            transform: translateX(-10%) translateY(0);
          }
          50% {
            transform: translateX(10%) translateY(-5%);
          }
          100% {
            transform: translateX(-10%) translateY(0);
          }
        }

        @keyframes smoke-rise {
          0% {
            transform: translateY(0) scaleY(1);
            opacity: 0.05;
          }
          50% {
            opacity: 0.08;
          }
          100% {
            transform: translateY(-50px) scaleY(1.3);
            opacity: 0;
          }
        }

        @keyframes atmosphere-pulse {
          0%, 100% {
            opacity: 0;
          }
          50% {
            opacity: 0.03;
          }
        }

        .animate-neon-flicker {
          animation: neon-flicker 4s ease-in-out infinite;
        }

        .animate-haze-drift {
          animation: haze-drift 20s ease-in-out infinite;
        }

        .animate-smoke-rise {
          animation: smoke-rise 15s ease-out infinite;
        }

        .animate-atmosphere-pulse {
          animation: atmosphere-pulse 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default RosePetals;
