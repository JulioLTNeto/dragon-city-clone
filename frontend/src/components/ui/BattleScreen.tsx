"use client";

import React, { useEffect, useState, useRef } from "react";
import * as Colyseus from "colyseus.js";
import CoinTossOverlay from "./CoinTossOverlay";

interface BattleScreenProps {
  room: Colyseus.Room;
  userName: string;
  onFlee: () => void;
}

export default function BattleScreen({ room, userName, onFlee }: BattleScreenProps) {
  const [myPlayer, setMyPlayer] = useState<any>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const [battlePhase, setBattlePhase] = useState<string>("lobby");
  const [coinTossResult, setCoinTossResult] = useState<string>("");
  const [currentTurn, setCurrentTurn] = useState<string>("");
  const [winnerSessionId, setWinnerSessionId] = useState<string>("");

  const slotRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [activeAnimations, setActiveAnimations] = useState<any[]>([]);

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
      
      setBattlePhase(state.phase);
      setCoinTossResult(state.coinTossResult);
      setCurrentTurn(state.currentTurn);
      setWinnerSessionId(state.winnerSessionId);
    };

    room.onStateChange(handleStateChange);
    
    // Initial sync
    handleStateChange(room.state);

    room.onMessage("opponent_left", () => {
      alert("O oponente fugiu da batalha!");
      onFlee();
    });

    room.onMessage("play_animation", (data: any) => {
      const sessionId = room.sessionId;
      const isMyAttack = data.attackerSessionId === sessionId;
      const attackerKey = `${!isMyAttack ? 'opponent' : 'myPlayer'}_${data.attackerIndex}`;
      const targetKey = `${isMyAttack ? 'opponent' : 'myPlayer'}_${data.targetIndex}`;
      
      const attackerEl = slotRefs.current[attackerKey];
      const targetEl = slotRefs.current[targetKey];
      
      if (attackerEl && targetEl) {
        const aRect = attackerEl.getBoundingClientRect();
        const tRect = targetEl.getBoundingClientRect();
        
        // Calcular o centro das caixas
        const startX = aRect.left + aRect.width / 2;
        const startY = aRect.top + aRect.height / 2;
        const endX = tRect.left + tRect.width / 2;
        const endY = tRect.top + tRect.height / 2;
        
        const animId = Date.now() + Math.random();
        
        setActiveAnimations(prev => [...prev, {
          id: animId,
          startX, startY, endX, endY, type: data.type
        }]);
        
        setTimeout(() => {
          setActiveAnimations(prev => prev.filter(a => a.id !== animId));
        }, 1000); // 1 segundo de duração do vôo
      }
    });

    return () => {
      room.removeAllListeners();
    };
  }, [room, onFlee]);

  const [isTargeting, setIsTargeting] = useState(false);
  const [attackType, setAttackType] = useState<string>("physical");

  const handleAttackClick = (type: string) => {
    if (isTargeting && attackType === type) {
      // Clicou no mesmo botão pra cancelar
      setIsTargeting(false);
    } else {
      setAttackType(type);
      setIsTargeting(true);
    }
  };

  const handleTargetSelect = (targetIndex: number) => {
    if (!isTargeting || !isMyTurn) return;
    
    if (opponent.dragons[targetIndex]?.isDead) {
      alert("Este dragão já foi derrotado!");
      return;
    }
    
    room.send("attack", { targetIndex, type: attackType });
    setIsTargeting(false);
  };

  const renderDragonSlot = (dragon: any, index: number, isOpponent: boolean) => {
    if (!dragon || !dragon.type) return <div key={index} className="w-24 h-24 opacity-0" />; 

    const isDead = dragon.isDead;
    const hpPercent = Math.max(0, (dragon.currentHp / dragon.maxHp) * 100);

    const playerState = isOpponent ? opponent : myPlayer;
    const attackOrder = [3, 4, 0, 1, 2];
    const activeDragonIndex = playerState ? attackOrder[playerState.currentAttackStep || 0] : -1;
    const isThisPlayerTurn = currentTurn === playerState?.sessionId;
    const isCurrentlyAttacking = isThisPlayerTurn && activeDragonIndex === index && battlePhase === "battle" && !isDead;

    const animationDelay = `${index * 0.2}s`;
    
    const isClickableTarget = isTargeting && isOpponent && !isDead;

    return (
      <div 
        key={index}
        ref={(el) => { slotRefs.current[`${isOpponent ? 'opponent' : 'myPlayer'}_${index}`] = el; }}
        onClick={() => isClickableTarget ? handleTargetSelect(index) : null}
        className={`relative w-32 h-32 flex flex-col items-center justify-end transition-all ${
          isDead ? 'opacity-30 grayscale filter' : ''
        } ${isClickableTarget ? 'cursor-crosshair hover:scale-110 drop-shadow-[0_0_20px_rgba(231,76,60,1)]' : ''}`}
      >
        {/* Glow if attacking */}
        {isCurrentlyAttacking && (
           <div className="absolute inset-[-20px] bg-[#2ecc71]/40 rounded-full blur-[20px] animate-pulse pointer-events-none" />
        )}
        {isCurrentlyAttacking && (
           <div className="absolute -top-12 text-[#2ecc71] font-black uppercase text-xs bg-black/80 border border-[#2ecc71]/50 px-2 py-1 rounded animate-bounce z-30">
             ATACANTE
           </div>
        )}

        {/* Shadow */}
        <div className="absolute bottom-0 w-24 h-6 bg-black/50 rounded-[100%] blur-[3px]" />
        
        {/* Sprite Wrapped to protect scaleX from animation transform override */}
        <div className={`relative z-10 w-full h-full flex justify-center items-end ${isOpponent ? '-scale-x-100' : ''}`}>
          <img 
            src="/assets/fire-dragon-1.png" 
            alt="Dragon" 
            className={`w-full h-full object-contain ${isDead ? '' : 'animate-[bounce_3s_infinite]'}`}
            style={{ animationDelay }}
          />
        </div>
        
        {/* HP Bar */}
        <div className="absolute -top-6 w-[120%] bg-black/80 p-1 rounded border border-white/20 z-20">
          <div className="w-full h-2 bg-red-900 rounded-sm overflow-hidden relative">
            <div 
               className="absolute top-0 left-0 h-full bg-[#2ecc71] rounded-sm transition-all duration-300" 
               style={{ width: `${hpPercent}%` }}
            />
          </div>
          <div className="text-[9px] font-black text-white text-center mt-[1px]">{dragon.currentHp} / {dragon.maxHp}</div>
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

  const isMyTurn = currentTurn === myPlayer?.sessionId;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#1e272e] overflow-hidden">
      
      {/* END GAME OVERLAY */}
      {battlePhase === "ended" && (
        <div className="fixed inset-0 z-[400] bg-black/90 flex flex-col items-center justify-center backdrop-blur-md">
          {winnerSessionId === myPlayer?.sessionId ? (
            <h1 className="text-6xl font-black text-[#2ecc71] uppercase mb-8 drop-shadow-[0_0_20px_rgba(46,204,113,0.8)] animate-bounce">
              VITÓRIA!
            </h1>
          ) : (
            <h1 className="text-6xl font-black text-[#e74c3c] uppercase mb-8 drop-shadow-[0_0_20px_rgba(231,76,60,0.8)]">
              DERROTA...
            </h1>
          )}
          
          <p className="text-xl text-white/70 mb-12">
            A batalha terminou. Os deuses dos dragões decidiram o vencedor.
          </p>

          <button 
            onClick={() => {
              room.leave();
              onFlee(); // Retorna para a ilha
            }}
            className="bg-[#3498db] hover:bg-[#2980b9] text-white font-black py-4 px-12 rounded-xl text-2xl uppercase shadow-[0_0_20px_rgba(52,152,219,0.5)] transition-all hover:scale-105"
          >
            Voltar à Ilha
          </button>
        </div>
      )}

      {/* ANIMATION LAYER */}
      <div className="fixed inset-0 z-[250] pointer-events-none">
        {activeAnimations.map(anim => {
          const dx = anim.endX - anim.startX;
          const dy = anim.endY - anim.startY;
          
          return (
            <div
              key={anim.id}
              className={`absolute w-8 h-8 rounded-full shadow-[0_0_20px_rgba(255,255,255,1)] flex items-center justify-center ${
                anim.type === 'magic' 
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-purple-500/80 animate-[spin_1s_linear_infinite]'
                  : 'bg-white shadow-white/80 scale-50'
              }`}
              style={{
                top: 0,
                left: 0,
                transform: `translate(${anim.startX - 16}px, ${anim.startY - 16}px)`,
                animation: `flyToTarget 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
                '--startX': `${anim.startX}px`,
                '--startY': `${anim.startY}px`,
                '--dx': `${dx}px`,
                '--dy': `${dy}px`,
              } as React.CSSProperties}
            >
              {anim.type === 'magic' && (
                <div className="w-12 h-12 bg-purple-400/50 rounded-full blur-[8px] animate-pulse absolute" />
              )}
            </div>
          );
        })}
        <style>{`
          @keyframes flyToTarget {
            0% { opacity: 0; transform: translate(calc(var(--startX) - 16px), calc(var(--startY) - 16px)); }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { opacity: 0; transform: translate(calc(var(--startX) - 16px + var(--dx)), calc(var(--startY) - 16px + var(--dy))); }
          }
        `}</style>
      </div>

      {/* COIN TOSS OVERLAY */}
      {battlePhase === "coin_toss" && (
        <CoinTossOverlay 
          result={coinTossResult} 
          myPlayer={myPlayer} 
          opponent={opponent} 
          currentTurn={currentTurn} 
        />
      )}

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

      {/* ACTION PANEL */}
      <div className="h-48 bg-gradient-to-t from-black via-black/90 to-transparent border-t border-white/10 relative z-30">
        <div className="max-w-6xl mx-auto h-full flex items-end justify-between p-8">
          <div className="flex gap-4">
            {myPlayer?.dragons.map((dragon: any, i: number) => (
              <div key={i} className={`w-12 h-12 rounded bg-white/5 border border-white/10 overflow-hidden ${dragon.isDead ? 'opacity-30 grayscale' : ''}`}>
                <img src="/assets/fire-dragon-1.png" alt="Dragon" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center">
            <h3 className="text-xl font-black text-white uppercase tracking-widest mb-4">Ações</h3>
            <div className="flex gap-4">
              <button 
                disabled={!isMyTurn}
                onClick={() => handleAttackClick('physical')}
                className={`border-2 px-8 py-4 rounded-xl font-bold uppercase transition-all ${
                  isMyTurn 
                    ? (isTargeting && attackType === 'physical'
                        ? 'bg-[#c0392b] border-[#c0392b] text-white shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] scale-95' 
                        : 'bg-[#e74c3c] hover:bg-[#c0392b] border-[#c0392b] text-white shadow-[0_0_15px_rgba(231,76,60,0.5)]')
                    : 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                {isTargeting && attackType === 'physical' ? 'Selecione o Alvo' : 'Ataque Físico'}
              </button>
              <button 
                disabled={!isMyTurn}
                onClick={() => handleAttackClick('magic')}
                className={`border-2 px-8 py-4 rounded-xl font-bold uppercase transition-all ${
                  isMyTurn 
                    ? (isTargeting && attackType === 'magic'
                        ? 'bg-[#8e44ad] border-[#8e44ad] text-white shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] scale-95' 
                        : 'bg-[#9b59b6] hover:bg-[#8e44ad] border-[#8e44ad] text-white shadow-[0_0_15px_rgba(155,89,182,0.5)]')
                    : 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                {isTargeting && attackType === 'magic' ? 'Selecione o Alvo' : 'Magia'}
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
