"use client";

import dynamic from "next/dynamic";

// Dynamically import the GameCanvas component with SSR disabled.
// PixiJS relies on the 'window' object, so it must only run on the client.
const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-[#5bb3ff] text-white font-bold text-2xl">
      Carregando Ilha...
    </div>
  ),
});

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-[#5bb3ff]">
      <GameCanvas />
    </main>
  );
}
