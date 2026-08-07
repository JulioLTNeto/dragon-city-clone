"use client";

import React, { useEffect, useState, useRef } from "react";
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
}

export default function MultiplayerChat({ userName }: MultiplayerChatProps) {
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "players">("chat");
  const [isOpen, setIsOpen] = useState(false);

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

  if (!isOpen) {
    return (
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
    );
  }

  return (
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
              <div key={p.sessionId} className="flex items-center gap-2 bg-white/10 p-2 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-[#2ecc71] shadow-[0_0_5px_#2ecc71]" />
                <span className="text-white font-bold text-sm truncate">{p.playerName}</span>
                {p.playerName === userName && <span className="text-xs text-white/50">(Você)</span>}
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
  );
}
