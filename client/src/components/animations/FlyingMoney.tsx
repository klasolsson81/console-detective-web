import { useEffect, useState } from 'react';

interface Bill {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

const FlyingMoney = () => {
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    // Skapa 8 slumpmässiga sedlar
    const newBills: Bill[] = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: Math.random() * 100, // 0-100%
      delay: Math.random() * 5, // 0-5s delay
      duration: 8 + Math.random() * 4, // 8-12s duration
      size: 40 + Math.random() * 30, // 40-70px
      rotation: Math.random() * 360, // 0-360deg
    }));
    setBills(newBills);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {bills.map((bill) => (
        <div
          key={bill.id}
          className="absolute animate-fall-money"
          style={{
            left: `${bill.left}%`,
            animationDelay: `${bill.delay}s`,
            animationDuration: `${bill.duration}s`,
            width: `${bill.size}px`,
            height: `${bill.size * 0.45}px`,
          }}
        >
          <div
            className="w-full h-full rounded-sm shadow-lg animate-spin-slow"
            style={{
              background: 'linear-gradient(135deg, #2d5016 0%, #4a7c1f 50%, #2d5016 100%)',
              border: '1px solid #5a9c2f',
              animationDuration: '3s',
              transform: `rotate(${bill.rotation}deg)`,
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-white/30 font-bold text-xs">
              $$$
            </div>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes fall-money {
          0% {
            transform: translateY(-100px) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(calc(100vh + 100px)) translateX(50px);
            opacity: 0;
          }
        }

        @keyframes spin-slow {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(360deg);
          }
        }

        .animate-fall-money {
          animation: fall-money linear infinite;
        }

        .animate-spin-slow {
          animation: spin-slow linear infinite;
        }
      `}</style>
    </div>
  );
};

export default FlyingMoney;
