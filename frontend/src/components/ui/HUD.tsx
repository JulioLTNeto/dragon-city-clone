"use client";

interface HUDProps {
  userGold: number;
  userGems: number;
  userFood: number;
  userLevel: number;
  onOpenConfig: () => void;
  onOpenInfo: () => void;
  onOpenMarket: () => void;
  onAddGold?: () => void;
}

export default function HUD({ 
  userGold, 
  userGems, 
  userFood, 
  userLevel, 
  onOpenConfig, 
  onOpenInfo,
  onOpenMarket,
  onAddGold
}: HUDProps) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4">
      {/* ================= TOPO ================= */}
      <div className="flex justify-between items-start w-full pointer-events-auto">
        
        {/* Esquerda: Mapa */}
        <button className="w-24 h-16 bg-gradient-to-b from-[#7fb3d5] to-[#2980b9] border-4 border-[#154360] rounded-xl shadow-[0_4px_0_#154360] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center overflow-hidden relative">
          <span className="text-4xl absolute opacity-50">🗺️</span>
        </button>

        {/* Centro: Recursos */}
        <div className="flex gap-4">
          {/* Ouro */}
          <div className="flex flex-col items-center">
            <div className="flex items-center bg-[#1c2833]/80 border-2 border-[#5d6d7e] rounded-full h-8 pl-1 pr-1 shadow-lg relative min-w-[120px]">
              <span className="absolute -left-3 text-3xl drop-shadow-md">🪙</span>
              <span className="text-white font-black text-sm ml-6 w-full text-center drop-shadow-md">{userGold.toLocaleString('pt-BR')}</span>
              <button 
                onClick={onAddGold}
                className="bg-[#2ecc71] hover:bg-[#27ae60] active:scale-95 text-white rounded-full w-6 h-6 flex items-center justify-center font-black border border-[#145a32] shadow-sm ml-2"
              >
                +
              </button>
            </div>
            <span className="text-white text-[10px] font-bold drop-shadow-md uppercase mt-1">[Ouro]</span>
          </div>

          {/* Gemas */}
          <div className="flex flex-col items-center">
            <div className="flex items-center bg-[#1c2833]/80 border-2 border-[#5d6d7e] rounded-full h-8 pl-1 pr-1 shadow-lg relative min-w-[120px]">
              <span className="absolute -left-3 text-3xl drop-shadow-md">💎</span>
              <span className="text-white font-black text-sm ml-6 w-full text-center drop-shadow-md">{userGems.toLocaleString('pt-BR')}</span>
              <button className="bg-[#2ecc71] hover:bg-[#27ae60] text-white rounded-full w-6 h-6 flex items-center justify-center font-black border border-[#145a32] shadow-sm ml-2">+</button>
            </div>
            <span className="text-white text-[10px] font-bold drop-shadow-md uppercase mt-1">[Gemas]</span>
          </div>

          {/* Comida */}
          <div className="flex flex-col items-center">
            <div className="flex items-center bg-[#1c2833]/80 border-2 border-[#5d6d7e] rounded-full h-8 pl-1 pr-1 shadow-lg relative min-w-[120px]">
              <span className="absolute -left-3 text-3xl drop-shadow-md">🍅</span>
              <span className="text-white font-black text-sm ml-6 w-full text-center drop-shadow-md">{userFood.toLocaleString('pt-BR')}</span>
              <button className="bg-[#2ecc71] hover:bg-[#27ae60] text-white rounded-full w-6 h-6 flex items-center justify-center font-black border border-[#145a32] shadow-sm ml-2">+</button>
            </div>
            <span className="text-white text-[10px] font-bold drop-shadow-md uppercase mt-1">[Comida]</span>
          </div>
        </div>

        {/* Direita: Nível e Configuração */}
        <div className="flex gap-4 items-start">
          {/* Estrela de Nível (Abre o Perfil) */}
          <button 
            onClick={onOpenInfo}
            className="relative flex items-center justify-center hover:scale-105 transition-transform"
          >
            <span className="text-5xl drop-shadow-lg filter sepia hue-rotate-180 brightness-110">⭐</span>
            <span className="absolute text-white font-black text-lg drop-shadow-md">{userLevel}</span>
          </button>
          
          {/* Configuração */}
          <button 
            onClick={onOpenConfig}
            className="w-12 h-12 bg-gradient-to-b from-[#5dade2] to-[#2874a6] border-2 border-[#154360] rounded-xl shadow-[0_4px_0_#154360] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center"
          >
            <span className="text-2xl drop-shadow-md">⚙️</span>
          </button>
        </div>
      </div>

      {/* ================= RODAPÉ ================= */}
      <div className="flex justify-between items-end w-full pointer-events-auto">
        
        {/* Rodapé Esquerdo: Menus Principais */}
        <div className="flex gap-3">
          <MenuButton icon="🐉" label="Dragões" color="blue" />
          <MenuButton icon="🏰" label="Habitats" color="orange" />
          <MenuButton icon="🛒" label="Mercado" color="yellow" onClick={onOpenMarket} />
        </div>

        {/* Rodapé Direito: Batalha e Social */}
        <div className="flex gap-3">
          <MenuButton icon="⚔️" label="Batalha" color="red" notification={true} />
          <MenuButton icon="👥" label="Social" color="blue" />
        </div>
      </div>
    </div>
  );
}

// Subcomponente auxiliar para os botões quadrados do rodapé
function MenuButton({ icon, label, color, notification = false, onClick }: { icon: string, label: string, color: 'blue'|'orange'|'yellow'|'red', notification?: boolean, onClick?: () => void }) {
  const colorGradients = {
    blue: "from-[#3498db] to-[#21618c] border-[#154360]",
    orange: "from-[#e67e22] to-[#a04000] border-[#6e2c00]",
    yellow: "from-[#f1c40f] to-[#b7950b] border-[#7d6608]",
    red: "from-[#e74c3c] to-[#943126] border-[#641e16]"
  };

  return (
    <div className="flex flex-col items-center gap-1 group">
      <button 
        onClick={onClick}
        className={`w-16 h-16 bg-gradient-to-b ${colorGradients[color]} border-4 rounded-xl shadow-[0_4px_0_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center relative`}
      >
        <span className="text-3xl drop-shadow-lg group-hover:scale-110 transition-transform">{icon}</span>
        {notification && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-md">!</span>
        )}
      </button>
      <span className="text-white text-xs font-black drop-shadow-[0_1px_1px_rgba(0,0,0,1)] uppercase tracking-wider">{label}</span>
    </div>
  );
}
