"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import * as Colyseus from "colyseus.js";

interface Player {
  playerName: string;
  sessionId: string;
}

interface ChatMessage {
  sender: string;
  text: string;
  timestamp: number;
}

interface MultiplayerChatProps {
  userName: string;
  onBattleReady?: (reservation: any) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: "chat" | "players";
  setActiveTab: (tab: "chat" | "players") => void;
}

export default function MultiplayerChat({ userName, onBattleReady, isOpen, setIsOpen, activeTab, setActiveTab }: MultiplayerChatProps) {
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  
  const [challengingPlayer, setChallengingPlayer] = useState<Player | null>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<any>(null);
  const [waitingForResponse, setWaitingForResponse] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userName) return;

    let isMounted = true;
    let currentRoom: Colyseus.Room | null = null;
    const client = new Colyseus.Client("ws://localhost:2567");

    client.joinOrCreate("global_room", { name: userName })
      .then((r) => {
        if (!isMounted) {
          // If component unmounted before connection finished, leave immediately
          r.leave();
          return;
        }

        currentRoom = r;
        setRoom(currentRoom);

        currentRoom.onStateChange((state: any) => {
          if (state.players) {
            const playersList: any[] = [];
            state.players.forEach((player: any, sessionId: string) => {
              playersList.push({
                playerName: player.playerName || "Mestre",
                sessionId: sessionId,
              });
            });
            setPlayers(playersList);
          }

          if (state.messages) {
            const msgsList = state.messages.map((msg: any) => ({
              sender: msg.sender,
              text: msg.text,
              timestamp: msg.timestamp,
            }));
            setMessages(msgsList);
          }
        });

        // OUVIR EVENTOS DE BATALHA
        currentRoom.onMessage("challenge_received", (message) => {
          setIncomingChallenge({
            challengerId: message.challengerId,
            challengerName: message.challengerName
          });
        });

        currentRoom.onMessage("challenge_declined", (message) => {
          setWaitingForResponse(false);
          alert(`O mestre ${message.targetName} recusou o seu desafio.`);
        });

        currentRoom.onMessage("battle_ready", (message) => {
          if (onBattleReady) {
            onBattleReady(message.reservation);
          }
          setChallengingPlayer(null);
          setWaitingForResponse(false);
          setIncomingChallenge(null);
        });

      })
      .catch((e) => {
        console.error("Error connecting to Colyseus global_room", e);
      });

    return () => {
      isMounted = false;
      if (currentRoom) {
        currentRoom.leave();
      }
    };
  }, [userName]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (activeTab === "chat" && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab, isOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMessage.trim() && room) {
      room.send("chat_message", { text: currentMessage.trim() });
      setCurrentMessage("");
    }
  };

  const renderModals = () => {
    return (
      <>
        {/* MODALS DE DESAFIO (USANDO PORTAL PARA ESCAPAR DO OVERFLOW HIDDEN) */}
        {typeof window !== 'undefined' && challengingPlayer && createPortal(
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
            <div className="bg-[#c4a162] border-4 border-[#8e6024] rounded-xl p-4 flex flex-col items-center shadow-2xl w-full max-w-sm">
              <h3 className="font-black text-[#5c3a11] text-lg uppercase text-center mb-2">
                Desafiar Mestre
              </h3>
              <p className="text-sm font-bold text-[#3e270b] text-center mb-4">
                Deseja desafiar <span className="text-white drop-shadow-md">{challengingPlayer.playerName}</span> para uma batalha de dragões?
              </p>
              
              {waitingForResponse ? (
                <div className="text-white font-bold animate-pulse text-sm">
                  Aguardando resposta...
                </div>
              ) : (
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={() => setChallengingPlayer(null)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg border-b-4 border-red-700 active:border-b-0 active:translate-y-1 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      if (room) {
                        room.send("challenge_player", { targetSessionId: challengingPlayer.sessionId });
                        setWaitingForResponse(true);
                      }
                    }}
                    className="flex-1 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-bold py-2 rounded-lg border-b-4 border-[#1e8449] active:border-b-0 active:translate-y-1 transition-all"
                  >
                    Desafiar!
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {typeof window !== 'undefined' && incomingChallenge && createPortal(
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
            <div className="bg-gradient-to-br from-[#e74c3c] to-[#c0392b] border-4 border-[#922b21] rounded-xl p-6 flex flex-col items-center shadow-2xl w-full max-w-md">
              <h3 className="font-black text-[#f1c40f] text-2xl uppercase text-center mb-2 animate-bounce">
                ⚔️ DESAFIO RECEBIDO!
              </h3>
              <p className="text-sm font-bold text-white text-center mb-6">
                O mestre <span className="text-[#f1c40f] text-2xl uppercase block mt-2">{incomingChallenge.challengerName}</span> desafiou você!
              </p>
              
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => {
                    if (room) {
                      room.send("decline_challenge", { challengerId: incomingChallenge.challengerId });
                      setIncomingChallenge(null);
                    }
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg border-b-4 border-gray-800 active:border-b-0 active:translate-y-1 transition-all"
                >
                  Recusar
                </button>
                <button 
                  onClick={() => {
                    if (room) {
                      room.send("accept_challenge", { challengerId: incomingChallenge.challengerId });
                      // Fica aguardando o battle_ready
                    }
                  }}
                  className="flex-1 bg-[#f1c40f] hover:bg-[#f39c12] text-[#c0392b] font-black uppercase py-3 rounded-lg border-b-4 border-[#d4ac0d] active:border-b-0 active:translate-y-1 transition-all shadow-[0_0_15px_#f1c40f]"
                >
                  Aceitar!
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  };

  if (!isOpen) {
    return (
      <>
        <button 
          onClick={() => setIsOpen(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-50 w-[50px] h-[150px] bg-[#e67e22] hover:bg-[#d35400] text-white font-bold rounded-r-2xl border-y-4 border-r-4 border-[#a04000] border-l-0 shadow-[5px_0_15px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center transition-all hover:pl-2"
        >
          <div className="relative mb-6">
            <span className="text-2xl">💬</span>
            <div className="absolute -top-2 -right-2 bg-[#2ecc71] text-[10px] w-5 h-5 flex items-center justify-center rounded-full border border-white text-black font-black">
              {players.length}
            </div>
          </div>
          <span className="text-xs uppercase origin-center -rotate-90 whitespace-nowrap tracking-widest font-black drop-shadow-md">
            Chat
          </span>
        </button>
        {renderModals()}
      </>
    );
  }

  return (
    <>
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-50 w-[350px] h-[75vh] bg-black/70 backdrop-blur-md border-y-[4px] border-r-[4px] border-[#c4a162] border-l-0 rounded-r-2xl shadow-[10px_0_30px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden transition-all duration-300">
      {/* HEADER */}
      <div className="bg-[#c4a162] flex justify-between items-center px-4 py-2">
        <h3 className="font-black text-[#5c3a11] uppercase drop-shadow-sm text-sm tracking-wide">
          Multiplayer
        </h3>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-[#5c3a11] hover:text-white font-black text-xl transition-colors leading-none"
        >
          &times;
        </button>
      </div>

      {/* TABS */}
      <div className="flex bg-[#8e6024]/80">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-2 font-bold text-sm uppercase transition-colors ${activeTab === "chat" ? "bg-white/20 text-white" : "text-white/60 hover:text-white"}`}
        >
          Chat Global
        </button>
        <button
          onClick={() => setActiveTab("players")}
          className={`flex-1 py-2 font-bold text-sm uppercase transition-colors ${activeTab === "players" ? "bg-white/20 text-white" : "text-white/60 hover:text-white"}`}
        >
          Online ({players.length})
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar">
        {activeTab === "chat" && (
          <>
            {messages.length === 0 ? (
              <div className="text-white/50 text-center text-sm font-bold mt-10">
                Nenhuma mensagem ainda. Diga olá!
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="flex flex-col mb-1">
                  <span className="text-[#f1c40f] font-bold text-xs">{msg.sender}</span>
                  <span className="text-white text-sm bg-white/10 p-2 rounded-lg rounded-tl-none break-words">
                    {msg.text}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </>
        )}

        {activeTab === "players" && (
          <div className="flex flex-col gap-2">
            {players.map((p) => (
              <div key={p.sessionId} className="flex items-center justify-between bg-white/10 p-2 rounded-lg group">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-2 h-2 rounded-full bg-[#2ecc71] shadow-[0_0_5px_#2ecc71] shrink-0" />
                  <span className="text-white font-bold text-sm truncate">{p.playerName}</span>
                  {p.playerName === userName && <span className="text-xs text-white/50 shrink-0">(Você)</span>}
                </div>
                {p.playerName !== userName && (
                  <button 
                    onClick={() => setChallengingPlayer(p)}
                    className="bg-[#e74c3c] hover:bg-[#c0392b] text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-md transition-transform active:scale-95"
                  >
                    Desafiar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INPUT (Only in Chat tab) */}
      {activeTab === "chat" && (
        <form onSubmit={handleSendMessage} className="p-2 bg-black/40 flex gap-2">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="Digite algo..."
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 text-white text-sm focus:outline-none focus:border-[#f1c40f] placeholder:text-white/40"
          />
          <button 
            type="submit"
            disabled={!currentMessage.trim()}
            className="bg-[#2ecc71] hover:bg-[#27ae60] text-white font-bold px-3 py-1 rounded-lg disabled:opacity-50 transition-colors"
          >
            Enviar
          </button>
        </form>
      )}
      </div>
      {renderModals()}
    </>
  );
}
