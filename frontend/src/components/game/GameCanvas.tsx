"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";

export default function GameCanvas() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    let isDestroyed = false;
    const app = new PIXI.Application();

    const handleResize = () => {
      if (isDestroyed || !app.renderer || !app.stage) return;
      app.renderer.resize(window.innerWidth, window.innerHeight);
      
      const islandContainer = app.stage.getChildByName("islandGroup") as PIXI.Container;
      if (islandContainer) {
        islandContainer.x = app.screen.width / 2;
        islandContainer.y = app.screen.height / 2;
      }
    };
    
    const initPixi = async () => {
      try {
        await app.init({
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: 0x5bb3ff,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        if (isDestroyed) {
          app.destroy(true);
          return;
        }

        if (canvasContainerRef.current) {
          canvasContainerRef.current.appendChild(app.canvas);
        }

        window.addEventListener("resize", handleResize);

        await PIXI.Assets.load([
          { alias: "island", src: "/assets/island-1.png" },
          { alias: "habitat", src: "/assets/fire-habitat.png" },
          { alias: "dragon", src: "/assets/fire-dragon-1.png" }
        ]);

        if (isDestroyed || !app.stage) return;

        const islandContainer = new PIXI.Container();
        islandContainer.label = "islandGroup";
        
        islandContainer.x = app.screen.width / 2;
        islandContainer.y = app.screen.height / 2;

        // Create Island Sprite (Assuming it's a single image)
        const island = PIXI.Sprite.from("island");
        island.anchor.set(0.5);
        
        /* 
        // --- Create Habitat Sprite (Imagem Simples) ---
        const habitat = PIXI.Sprite.from("habitat");
        habitat.anchor.set(0.5);
        habitat.width = 250;
        habitat.scale.y = habitat.scale.x; // Mantém a proporção da imagem
        habitat.x = 0;
        habitat.y = -60;

        // --- Create Dragon Sprite (Imagem Simples) ---
        const dragon = PIXI.Sprite.from("dragon");
        dragon.anchor.set(0.5);
        dragon.width = 100;
        dragon.scale.y = dragon.scale.x; // Mantém a proporção da imagem
        dragon.x = 20;
        dragon.y = -20;
        */

        islandContainer.addChild(island);
        // islandContainer.addChild(habitat);
        // islandContainer.addChild(dragon);

        app.stage.addChild(islandContainer);

      } catch (error) {
        console.error("Error initializing PixiJS:", error);
      }
    };

    initPixi();

    return () => {
      isDestroyed = true;
      window.removeEventListener("resize", handleResize);
      
      if (app.renderer) {
        if (app.ticker) {
          app.ticker.stop();
        }
        try {
          app.destroy(true);
        } catch (e) {
          console.warn("Destroy error:", e);
        }
      }
    };
  }, []);

  return <div ref={canvasContainerRef} className="w-full h-screen overflow-hidden" />;
}
