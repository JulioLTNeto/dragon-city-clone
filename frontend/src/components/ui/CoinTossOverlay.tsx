"use client";

import React, { useEffect, useState } from "react";

interface CoinTossOverlayProps {
  result: string;
  myPlayer: any;
  opponent: any;
  currentTurn: string;
}

export default function CoinTossOverlay({ result, myPlayer, opponent, currentTurn }: CoinTossOverlayProps) {
  const [spinning, setSpinning] = useState(true);
  
  useEffect(() => {
    // A moeda gira por 2 segundos antes de revelar o resultado
    const t = setTimeout(() => setSpinning(false), 2000);
    return () => clearTimeout(t);
  }, []);
  
  const winnerName = currentTurn === myPlayer?.sessionId ? myPlayer?.playerName : opponent?.playerName;
  
  // Custom spin animation that uses rotateY
  const spinStyle = spinning 
    ? { animation: 'spinMoeda 0.3s linear infinite' } 
    : { transform: result === 'cara' ? 'rotateY(0deg)' : 'rotateY(180deg)' };

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 flex flex-col items-center justify-center backdrop-blur-sm">
      <style>{`
        @keyframes spinMoeda {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
      `}</style>
      
      <h1 className="text-4xl font-black text-[#f1c40f] uppercase mb-16 tracking-[0.2em] drop-shadow-[0_0_10px_rgba(241,196,15,0.8)] text-center">
        {spinning ? 'Sorteando o Primeiro Turno...' : 'O Sorteio Terminou!'}
      </h1>
      
      <div className="relative w-64 h-64 mb-12" style={{ perspective: '1000px' }}>
        <div 
          className="w-full h-full relative transition-transform duration-1000 ease-out" 
          style={{ transformStyle: 'preserve-3d', ...spinStyle }}
        >
          {/* CARA */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-[#f1c40f] to-[#f39c12] rounded-full flex flex-col items-center justify-center border-[12px] border-[#d4ac0d] shadow-[0_0_50px_rgba(241,196,15,0.5)]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-5xl font-black text-[#8e6024] mb-2">CARA</span>
            <span className="text-sm font-bold text-[#8e6024]/70 uppercase">Desafiante</span>
          </div>
          
          {/* COROA */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-[#bdc3c7] to-[#95a5a6] rounded-full flex flex-col items-center justify-center border-[12px] border-[#7f8c8d] shadow-[0_0_50px_rgba(189,195,199,0.5)]"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <span className="text-5xl font-black text-[#2c3e50] mb-2">COROA</span>
            <span className="text-sm font-bold text-[#2c3e50]/70 uppercase">Desafiado</span>
          </div>
        </div>
      </div>
      
      <div className="h-24 text-center flex flex-col items-center justify-center">
        {!spinning && (
          <div className="animate-bounce">
            <p className="text-4xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
              <span className="text-[#2ecc71]">{winnerName}</span> ataca primeiro!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
