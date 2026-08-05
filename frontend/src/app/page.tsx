"use client";

import dynamic from "next/dynamic";
import HUD from "@/components/ui/HUD";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Dynamically import the GameCanvas component with SSR disabled.
// PixiJS relies on the 'window' object, so it must only run on the client.
const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-[#5bb3ff] text-white font-bold text-2xl">
      Carregando Ilha...
    </div>
  ),
});

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  
  const [placementMode, setPlacementMode] = useState<string | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [placedItems, setPlacedItems] = useState<any[]>([]);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userVolume, setUserVolume] = useState(100);
  const [userGold, setUserGold] = useState(0);
  const [userGems, setUserGems] = useState(0);
  const [userFood, setUserFood] = useState(0);
  const [userDragons, setUserDragons] = useState(0);
  const [userHabitats, setUserHabitats] = useState(0);
  const [userIslands, setUserIslands] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
      const user = JSON.parse(userStr);
      setUserName(user.name || "");
      setUserEmail(user.email || "");
      setUserVolume(user.volume !== undefined ? user.volume : 100);
      setUserGold(user.gold || 0);
      setUserGems(user.gems || 0);
      setUserFood(user.food || 0);
      setUserDragons(user.dragons || 0);
      setUserHabitats(user.habitats || 0);
      setUserIslands(user.islands || 1);
      setUserLevel(user.level || 1);
      setPlacedItems(user.placedItems || []);
    }
  }, [router]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: userName, volume: userVolume })
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data));
        setIsConfigOpen(false);
      } else {
        alert(data.message || "Erro ao salvar as configurações");
      }
    } catch (err) {
      alert("Erro de conexão com o servidor");
    }
    setIsSaving(false);
  };

  const handleStartPlacement = (itemId: string) => {
    // Para ovos de dragão, podemos comprar direto no futuro.
    // Mas para habitats, entramos no modo de construção:
    setPlacementMode(itemId);
    setIsMarketOpen(false);
  };

  const handleConfirmPlacement = async (x: number, y: number, habitatId?: string) => {
    if (!placementMode) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/market/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ itemId: placementMode, x, y, habitatId })
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setUserGold(data.user.gold);
        setUserDragons(data.user.dragons);
        setUserHabitats(data.user.habitats);
        setPlacedItems(data.user.placedItems || []);
        setPlacementMode(null);
      } else {
        alert(data.message || "Erro ao construir");
      }
    } catch (err) {
      alert("Erro de conexão com o servidor");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPlacementMode(null);
        setMovingItemId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleConfirmMove = async (itemId: string, x: number, y: number) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/market/move", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ itemId, x, y })
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setPlacedItems(data.user.placedItems || []);
        setMovingItemId(null);
      } else {
        alert(data.message || "Erro ao mover");
      }
    } catch (err) {
      alert("Erro de conexão com o servidor");
    }
  };

  const handleAddGold = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/user/add-gold", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setUserGold(data.user.gold);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <main className="w-full h-screen overflow-hidden bg-black relative">
      <GameCanvas 
        placementMode={placementMode}
        movingItemId={movingItemId}
        placedItems={placedItems}
        onConfirmPlacement={handleConfirmPlacement}
        onConfirmMove={handleConfirmMove}
        onItemMoveRequest={(id) => setMovingItemId(id)}
      />

      {/* OVERLAY DE CANCELAR CONSTRUÇÃO/MOVIMENTO */}
      {(placementMode || movingItemId) && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <button 
            onClick={() => {
              setPlacementMode(null);
              setMovingItemId(null);
            }}
            className="bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-2 px-6 rounded-full border-2 border-white shadow-xl uppercase flex items-center gap-2"
          >
            <span>❌</span> Cancelar (ESC)
          </button>
        </div>
      )}

      {/* OVERLAY DE INTERFACE (HUD) HTML/TAILWIND */}
      <HUD 
        userGold={userGold}
        userGems={userGems}
        userFood={userFood}
        userLevel={userLevel}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenInfo={() => setIsInfoOpen(true)}
        onOpenMarket={() => setIsMarketOpen(true)}
        onAddGold={handleAddGold}
      />

      {/* MODAL DE CONFIGURAÇÃO SOBREPOSTO */}
      {isConfigOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#f4e2b0] border-[6px] border-[#8e6024] p-8 rounded-2xl shadow-2xl w-full max-w-md relative">
            <button 
              onClick={() => setIsConfigOpen(false)}
              className="absolute -top-4 -right-4 bg-red-500 hover:bg-red-600 border-4 border-[#8e6024] text-white font-bold w-12 h-12 rounded-full text-xl"
            >
              X
            </button>
            
            <h2 className="text-3xl font-black text-center text-[#5c3a11] mb-6 uppercase drop-shadow-md">
              Configurações
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-[#5c3a11] font-bold mb-2 uppercase text-lg">Nome do Mestre</label>
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-white border-4 border-[#c4a162] rounded-xl py-3 px-4 text-gray-800 font-bold focus:outline-none focus:border-[#e67e22]"
                />
              </div>

              <div>
                <label className="block text-[#5c3a11] font-bold mb-2 uppercase text-lg flex justify-between">
                  <span>Volume do Jogo</span>
                  <span>{userVolume}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={userVolume}
                  onChange={(e) => setUserVolume(Number(e.target.value))}
                  className="w-full h-4 bg-[#c4a162] rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-full bg-[#e67e22] hover:bg-[#d35400] text-white font-black py-4 px-4 rounded-xl border-b-6 border-[#a04000] active:border-b-0 active:translate-y-2 transition-all uppercase text-xl shadow-lg mt-8 disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INFORMAÇÕES SOBREPOSTO */}
      {isInfoOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#5bb3ff] border-[6px] border-[#2980b9] p-8 rounded-2xl shadow-2xl w-full max-w-md relative text-white">
            <button 
              onClick={() => setIsInfoOpen(false)}
              className="absolute -top-4 -right-4 bg-red-500 hover:bg-red-600 border-4 border-[#2980b9] text-white font-bold w-12 h-12 rounded-full text-xl"
            >
              X
            </button>
            
            <h2 className="text-3xl font-black text-center mb-6 uppercase drop-shadow-md text-white">
              Perfil do Mestre
            </h2>

            <div className="space-y-4 font-bold text-lg">
              <div className="bg-white/20 p-4 rounded-xl border border-white/40">
                <p className="uppercase text-sm opacity-80">Nome</p>
                <p className="text-xl drop-shadow">{userName}</p>
              </div>

              <div className="bg-white/20 p-4 rounded-xl border border-white/40">
                <p className="uppercase text-sm opacity-80">E-mail</p>
                <p className="text-xl drop-shadow">{userEmail}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#f1c40f]/80 p-4 rounded-xl border-2 border-[#f39c12] text-center">
                  <p className="uppercase text-sm text-[#8e44ad] font-black">Ouro</p>
                  <p className="text-2xl drop-shadow">{userGold}</p>
                </div>
                
                <div className="bg-[#2ecc71]/80 p-4 rounded-xl border-2 border-[#27ae60] text-center">
                  <p className="uppercase text-sm text-[#006400] font-black">Gemas</p>
                  <p className="text-2xl drop-shadow">{userGems}</p>
                </div>

                <div className="bg-[#e74c3c]/80 p-4 rounded-xl border-2 border-[#c0392b] text-center">
                  <p className="uppercase text-sm text-[#641E16] font-black">Dragões</p>
                  <p className="text-2xl drop-shadow">{userDragons}</p>
                </div>

                <div className="bg-[#9b59b6]/80 p-4 rounded-xl border-2 border-[#8e44ad] text-center">
                  <p className="uppercase text-sm text-[#4A235A] font-black">Ilhas</p>
                  <p className="text-2xl drop-shadow">{userIslands}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DO MERCADO SOBREPOSTO */}
      {isMarketOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#f4e2b0] border-[6px] border-[#8e6024] p-8 rounded-2xl shadow-2xl w-full max-w-2xl relative">
            <button 
              onClick={() => setIsMarketOpen(false)}
              className="absolute -top-4 -right-4 bg-red-500 hover:bg-red-600 border-4 border-[#8e6024] text-white font-bold w-12 h-12 rounded-full text-xl"
            >
              X
            </button>
            
            <h2 className="text-4xl font-black text-center text-[#5c3a11] mb-8 uppercase drop-shadow-md">
              Mercado
            </h2>

            <div className="grid grid-cols-2 gap-6">
              
              {/* Item: Habitat de Fogo */}
              <div className="bg-white border-4 border-[#c4a162] rounded-xl p-4 flex flex-col items-center shadow-lg hover:scale-105 transition-transform">
                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-4 overflow-hidden border-2 border-orange-300">
                  <span className="text-5xl">🏰</span>
                </div>
                <h3 className="font-black text-[#5c3a11] text-lg text-center uppercase">Habitat de Fogo</h3>
                <p className="text-sm text-gray-600 text-center mb-4 h-10">Um lar quente para seus dragões de fogo.</p>
                
                <button 
                  onClick={() => handleStartPlacement('fire_habitat')}
                  disabled={userGold < 100}
                  className={`w-full font-black py-3 px-4 rounded-xl border-b-4 transition-all uppercase flex items-center justify-center gap-2 ${userGold >= 100 ? "bg-[#f1c40f] hover:bg-[#f39c12] text-[#5c3a11] border-[#d4ac0d] active:border-b-0 active:translate-y-1" : "bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed opacity-70"}`}
                >
                  <span>Comprar</span>
                  <div className="bg-[#1c2833] text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 border border-[#5d6d7e]">
                    <span>100</span>
                    <span>🪙</span>
                  </div>
                </button>
              </div>

              {/* Item: Ovo de Dragão de Fogo */}
              <div className="bg-white border-4 border-[#c4a162] rounded-xl p-4 flex flex-col items-center shadow-lg hover:scale-105 transition-transform">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4 overflow-hidden border-2 border-red-300">
                  <span className="text-5xl">🐉</span>
                </div>
                <h3 className="font-black text-[#5c3a11] text-lg text-center uppercase">Dragão de Fogo</h3>
                <p className="text-sm text-gray-600 text-center mb-4 h-10">Um dragão flamejante poderoso.</p>
                
                <button 
                  onClick={() => handleStartPlacement('fire_dragon_egg')}
                  disabled={userGold < 500}
                  className={`w-full font-black py-3 px-4 rounded-xl border-b-4 transition-all uppercase flex items-center justify-center gap-2 ${userGold >= 500 ? "bg-[#f1c40f] hover:bg-[#f39c12] text-[#5c3a11] border-[#d4ac0d] active:border-b-0 active:translate-y-1" : "bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed opacity-70"}`}
                >
                  <span>Comprar</span>
                  <div className="bg-[#1c2833] text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 border border-[#5d6d7e]">
                    <span>500</span>
                    <span>🪙</span>
                  </div>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </main>
  );
}
