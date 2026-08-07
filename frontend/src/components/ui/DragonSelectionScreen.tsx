"use client";

import React, { useEffect, useState, useRef } from "react";
import * as Colyseus from "colyseus.js";

interface DragonSelectionScreenProps {
  userName: string;
  reservation: any;
  placedItems: any[]; // To extract dragons
  onClose: () => void;
  onBattleStart: (battleRoom: Colyseus.Room) => void;
}

export default function DragonSelectionScreen({ userName, reservation, placedItems, onClose, onBattleStart }: DragonSelectionScreenProps) {
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [myDragons, setMyDragons] = useState<string[]>([]);
  const [selectedDragons, setSelectedDragons] = useState<string[]>([]);
  const [opponentName, setOpponentName] = useState<string>("Desafiante");
  const [opponentReady, setOpponentReady] = useState(false);
  const [iAmReady, setIAmReady] = useState(false);
  const hasJoined = useRef(false);

  useEffect(() => {
    if (hasJoined.current) return;
    hasJoined.current = true;

    // Extrai dragões dos habitats
    const dragons: string[] = [];
    placedItems.forEach(item => {
      if (item.dragons && item.dragons.length > 0) {
        dragons.push(...item.dragons);
      }
    });
    setMyDragons(dragons);

    let isMounted = true;
    const client = new Colyseus.Client("ws://localhost:2567");
    let currentRoom: Colyseus.Room | null = null;

    client.consumeSeatReservation(reservation)
      .then((r) => {
        currentRoom = r;
        setRoom(r);

        r.onStateChange((state: any) => {
          if (state.phase === "battle") {
            onBattleStart(r);
            return;
          }

          if (state.players) {
            state.players.forEach((player: any, sessionId: string) => {
              if (sessionId !== r.sessionId) {
                setOpponentName(player.playerName);
                setOpponentReady(player.isReady);
              }
            });
          }
        });

        r.onMessage("opponent_left", () => {
          alert("O oponente fugiu da batalha!");
          onClose();
        });
      })
      .catch((e) => {
        console.error("Erro ao entrar na sala de batalha", e);
        alert("A sala de batalha expirou ou não existe.");
        onClose();
      });

    // Removido cleanup para evitar que o Strict Mode desconecte a sala.
    // O leave() será chamado apenas explicitamente.
  }, [reservation, userName, placedItems, onClose, onBattleStart]);

  const handleFugir = () => {
    if (room) {
      room.leave();
    }
    onClose();
  };

  const toggleDragon = (dragonType: string, index: number) => {
    if (iAmReady) return;
    
    // Identificador único temporário para seleção baseado no index
    const uniqueId = `${dragonType}_${index}`;
    
    setSelectedDragons(prev => {
      if (prev.includes(uniqueId)) {
        return prev.filter(id => id !== uniqueId);
      } else {
        if (prev.length >= 5) return prev;
        return [...prev, uniqueId];
      }
    });
  };

  const handleReady = () => {
    if (selectedDragons.length === 0) {
      alert("Selecione pelo menos um dragão!");
      return;
    }
    if (room) {
      // Envia os tipos de dragão, removendo o sufixo único
      const typesOnly = selectedDragons.map(id => id.split("_")[0]);
      room.send("select_dragons", { dragons: typesOnly });
      room.send("set_ready", { ready: true });
      setIAmReady(true);
    } else {
      alert("Erro de conexão com a sala! Tente sair e entrar novamente.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col p-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black text-[#f1c40f] uppercase drop-shadow-[0_0_15px_rgba(241,196,15,0.5)]">
          Preparação para Batalha
        </h1>
        <button onClick={handleFugir} className="bg-red-600 hover:bg-red-700 font-bold py-2 px-6 rounded-lg uppercase">
          Fugir
        </button>
      </div>

      <div className="flex flex-1 gap-8">
        {/* SEU ESQUADRÃO */}
        <div className="flex-1 bg-white/10 border-4 border-[#3498db] rounded-2xl p-6 flex flex-col">
          <h2 className={`text-2xl font-black mb-4 uppercase text-center transition-colors ${iAmReady ? 'text-[#2ecc71]' : 'text-[#3498db]'}`}>
            Seu Esquadrão {iAmReady && '✅'}
          </h2>
          <div className="grid grid-cols-5 gap-4 mb-8">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-square bg-black/40 border-2 border-white/20 rounded-xl flex items-center justify-center relative overflow-hidden">
                {selectedDragons[i] ? (
                  <img src="/assets/fire-dragon-1.png" alt="Dragon" className="w-20 h-20 object-contain drop-shadow-md" />
                ) : (
                  <span className="text-white/20 text-4xl font-black">{i + 1}</span>
                )}
              </div>
            ))}
          </div>

          <h3 className="text-xl font-bold text-white mb-4">Seus Dragões ({myDragons.length})</h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-wrap gap-4 content-start">
            {myDragons.length === 0 && (
              <div className="text-white/50 w-full text-center p-8">Você não possui dragões nos habitats!</div>
            )}
            {myDragons.map((dragonType, index) => {
              const uniqueId = `${dragonType}_${index}`;
              const isSelected = selectedDragons.includes(uniqueId);
              return (
                <button
                  key={uniqueId}
                  disabled={iAmReady || (!isSelected && selectedDragons.length >= 5)}
                  onClick={() => toggleDragon(dragonType, index)}
                  className={`relative w-24 h-24 rounded-xl border-4 transition-all overflow-hidden ${
                    isSelected ? "border-[#f1c40f] bg-[#f1c40f]/20 scale-105" : "border-white/20 bg-black/40 hover:border-white/50 disabled:opacity-30 disabled:hover:border-white/20"
                  }`}
                >
                  <img src="/assets/fire-dragon-1.png" alt="Dragon" className="w-16 h-16 object-contain absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  {isSelected && <div className="absolute top-1 right-1 w-4 h-4 bg-[#f1c40f] rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTRA / STATUS */}
        <div className="w-[300px] flex flex-col justify-center items-center gap-4">
          
          {/* BOX DO USUÁRIO */}
          <div className={`w-full p-4 rounded-2xl text-center transition-colors border-4 ${iAmReady ? 'bg-[#2ecc71]/20 border-[#2ecc71]' : 'bg-[#3498db]/20 border-[#3498db]'}`}>
            <h3 className="text-white/60 font-bold uppercase text-xs mb-1">Você</h3>
            <p className={`text-xl font-black truncate transition-colors ${iAmReady ? 'text-[#2ecc71]' : 'text-white'}`}>
              {userName}
            </p>
            <div className={`mt-2 py-1 px-2 rounded-lg font-bold uppercase text-xs ${iAmReady ? 'bg-[#2ecc71] text-white' : 'bg-white/10 text-white/50'}`}>
              {iAmReady ? '✅ Dragões Escolhidos' : '⏳ Escolhendo Dragões...'}
            </div>
          </div>

          <div className="text-4xl font-black italic text-red-500 drop-shadow-[0_0_10px_rgba(231,76,60,0.8)]">VS</div>
          
          {/* BOX DO ADVERSÁRIO */}
          <div className={`w-full p-4 rounded-2xl text-center transition-colors border-4 ${opponentReady ? 'bg-[#2ecc71]/20 border-[#2ecc71]' : 'bg-[#e74c3c]/20 border-[#e74c3c]'}`}>
            <h3 className="text-white/60 font-bold uppercase text-xs mb-1">Adversário</h3>
            <p className={`text-xl font-black truncate transition-colors ${opponentReady ? 'text-[#2ecc71]' : 'text-white'}`}>
              {opponentName}
            </p>
            <div className={`mt-2 py-1 px-2 rounded-lg font-bold uppercase text-xs ${opponentReady ? 'bg-[#2ecc71] text-white' : 'bg-white/10 text-white/50'}`}>
              {opponentReady ? '✅ Dragões Escolhidos' : '⏳ Escolhendo Dragões...'}
            </div>
          </div>

          <button 
            disabled={iAmReady}
            onClick={handleReady}
            className={`w-full py-6 rounded-2xl font-black uppercase text-2xl transition-all shadow-xl ${
              iAmReady 
                ? 'bg-gray-600 border-b-4 border-gray-800 text-gray-400 cursor-not-allowed' 
                : 'bg-[#2ecc71] hover:bg-[#27ae60] border-b-8 border-[#1e8449] active:border-b-0 active:translate-y-2 text-white'
            }`}
          >
            {iAmReady ? 'Aguardando...' : 'Estou Pronto!'}
          </button>
        </div>
      </div>
    </div>
  );
}
