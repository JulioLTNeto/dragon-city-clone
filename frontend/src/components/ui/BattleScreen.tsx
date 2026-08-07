"use client";

import React, { useEffect, useState } from "react";
import * as Colyseus from "colyseus.js";

interface BattleScreenProps {
  room: Colyseus.Room;
  userName: string;
  onFlee: () => void;
}

export default function BattleScreen({ room, userName, onFlee }: BattleScreenProps) {
  const [myPlayer, setMyPlayer] = useState<any>(null);
  const [opponent, setOpponent] = useState<any>(null);

  useEffect(() => {
    const handleStateChange = (state: any) => {
      let me = null;
      let opp = null;
      
      state.players.forEach((player: any, sessionId: string) => {
        if (sessionId === room.sessionId) {
          me = player;
        } else {
          opp = player;
        }
      });

      // Clone objects for state update to force re-render if necessary
      setMyPlayer(me ? { ...me, dragons: Array.from(me.dragons || []) } : null);
      setOpponent(opp ? { ...opp, dragons: Array.from(opp.dragons || []) } : null);
    };

    room.onStateChange(handleStateChange);
    
    // Initial sync
    handleStateChange(room.state);

    room.onMessage("opponent_left", () => {
      alert("O oponente fugiu da batalha!");
      onFlee();
    });

  }, [room, onFlee]);

  const renderDragonSlot = (dragonType: string | undefined, index: number, isOpponent: boolean) => {
    if (!dragonType) return <div key={index} className="w-24 h-24 opacity-0" />; // Empty slot

    // Flipped sprite for opponent
    const transform = isOpponent ? "scaleX(-1)" : "";

    // Animacao de flutuação basica com delay
    const animationDelay = `${index * 0.2}s`;

    return (
      <div key={index} className="relative w-32 h-32 flex flex-col items-center justify-end">
        {/* Shadow */}
        <div className="absolute bottom-0 w-24 h-6 bg-black/50 rounded-[100%] blur-[3px]" />
        
        {/* Sprite */}
        <img 
          src="/assets/fire-dragon-1.png" 
          alt="Dragon" 
          className="w-full h-full object-contain relative z-10 animate-[bounce_3s_infinite]"
          style={{ transform, animationDelay }}
        />
        
        {/* HP Bar (Mock) */}
        <div className="absolute -top-6 w-[120%] bg-black/80 p-1 rounded border border-white/20 z-20">
          <div className="w-full h-2 bg-red-900 rounded-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-[100%] h-full bg-[#2ecc71] rounded-sm transition-all duration-300" />
          </div>
          <div className="text-[9px] font-black text-white text-center mt-[1px]">100 / 100</div>
        </div>
      </div>
    );
  };

  const renderTeam = (player: any, isOpponent: boolean) => {
    if (!player) return null;
    
    // dragons: [0, 1, 2, 3, 4] -> 0,1,2 front; 3,4 back
    const dragons = player.dragons || [];
    
    return (
      <div className={`flex gap-12 ${isOpponent ? 'flex-row-reverse' : 'flex-row'} items-center h-full`}>
        {/* Back Row (2 dragons) */}
        <div className="flex flex-col gap-24 justify-center h-full">
          {renderDragonSlot(dragons[3], 3, isOpponent)}
          {renderDragonSlot(dragons[4], 4, isOpponent)}
        </div>
        
        {/* Front Row (3 dragons) */}
        <div className="flex flex-col gap-12 justify-center h-full">
          {renderDragonSlot(dragons[0], 0, isOpponent)}
          {renderDragonSlot(dragons[1], 1, isOpponent)}
          {renderDragonSlot(dragons[2], 2, isOpponent)}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#1e272e] overflow-hidden">
      {/* ARENA BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#2c3e50] via-[#34495e] to-[#000000] opacity-90" />
        {/* Chão isométrico estilizado */}
        <div className="absolute bottom-[-20%] left-[-10%] w-[120%] h-[70%] bg-[#27ae60] rounded-[100%] shadow-[inset_0_20px_50px_rgba(0,0,0,0.8)] border-t-[12px] border-[#2ecc71] opacity-30 transform rotate-1" />
        <div className="absolute bottom-[20%] w-full h-[1px] bg-white/5" />
        <div className="absolute bottom-[35%] w-full h-[1px] bg-white/5" />
      </div>

      {/* HEADER */}
      <div className="relative z-10 flex justify-between items-center px-12 py-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4 bg-black/40 px-6 py-2 rounded-full border border-white/10 shadow-lg">
          <div className="w-4 h-4 rounded-full bg-[#3498db] animate-pulse" />
          <h2 className="text-white font-black text-xl uppercase tracking-widest">{myPlayer?.playerName || userName}</h2>
        </div>
        
        <div className="relative">
          <div className="text-5xl font-black text-white italic drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] z-10 relative">VS</div>
          <div className="absolute inset-0 text-5xl font-black text-red-500 italic blur-[4px] z-0">VS</div>
        </div>
        
        <div className="flex items-center gap-4 bg-black/40 px-6 py-2 rounded-full border border-white/10 shadow-lg">
          <h2 className="text-white font-black text-xl uppercase tracking-widest">{opponent?.playerName || "Oponente"}</h2>
          <div className="w-4 h-4 rounded-full bg-[#e74c3c] animate-pulse" />
        </div>
      </div>

      {/* BATTLEFIELD */}
      <div className="relative z-10 flex-1 flex justify-between items-center px-16 xl:px-48 pb-20">
        {/* Left Team (Me) */}
        <div className="h-full flex items-center">
          {renderTeam(myPlayer, false)}
        </div>

        {/* Right Team (Opponent) */}
        <div className="h-full flex items-center">
          {renderTeam(opponent, true)}
        </div>
      </div>

      {/* COMANDOS INFERIORES */}
      <div className="relative z-10 h-48 bg-gradient-to-t from-black via-black/90 to-transparent p-6 flex flex-col justify-end">
        <div className="flex justify-between items-end w-full max-w-7xl mx-auto">
          <div className="flex-1">
            <h3 className="text-white/80 font-black uppercase mb-2 text-sm tracking-widest">Ações</h3>
            <div className="flex gap-4">
              <button className="bg-white/10 border-2 border-white/20 hover:border-white/50 text-white/50 hover:text-white px-8 py-4 rounded-xl font-bold uppercase transition-all">
                Ataque Físico
              </button>
              <button className="bg-white/10 border-2 border-white/20 hover:border-white/50 text-white/50 hover:text-white px-8 py-4 rounded-xl font-bold uppercase transition-all">
                Magia
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => {
              room.leave();
              onFlee();
            }} 
            className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-12 rounded-xl text-lg uppercase tracking-wider shadow-[0_0_20px_rgba(231,76,60,0.3)] transition-all hover:scale-105"
          >
            Fugir da Batalha
          </button>
        </div>
      </div>
    </div>
  );
}
