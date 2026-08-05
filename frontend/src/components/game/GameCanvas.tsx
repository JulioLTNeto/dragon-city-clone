"use client";

import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";

interface GameCanvasProps {
  placementMode?: string | null;
  movingItemId?: string | null;
  placedItems?: any[];
  onConfirmPlacement?: (x: number, y: number) => void;
  onConfirmMove?: (id: string, x: number, y: number) => void;
  onItemClick?: (id: string) => void;
}

export default function GameCanvas({ 
  placementMode, 
  movingItemId,
  placedItems = [], 
  onConfirmPlacement,
  onConfirmMove,
  onItemClick
}: GameCanvasProps) {
  const [isPixiReady, setIsPixiReady] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  // Refs to access pixi objects across useEffects
  const appRef = useRef<PIXI.Application | null>(null);
  const islandContainerRef = useRef<PIXI.Container | null>(null);
  const ghostSpriteRef = useRef<PIXI.Sprite | null>(null);
  const placedItemsContainerRef = useRef<PIXI.Container | null>(null);

  // Keeps props fresh for event listeners without re-binding
  const propsRef = useRef({ placementMode, movingItemId, onConfirmPlacement, onConfirmMove, onItemClick, placedItems });
  useEffect(() => {
    propsRef.current = { placementMode, movingItemId, onConfirmPlacement, onConfirmMove, onItemClick, placedItems };
  }, [placementMode, movingItemId, onConfirmPlacement, onConfirmMove, onItemClick, placedItems]);

  // 1. INITIALIZE PIXI
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    let isDestroyed = false;
    const app = new PIXI.Application();
    appRef.current = app;

    const handleResize = () => {
      if (isDestroyed || !app.renderer || !app.stage) return;
      app.renderer.resize(window.innerWidth, window.innerHeight);
      if (islandContainerRef.current) {
        islandContainerRef.current.x = app.screen.width / 2;
        islandContainerRef.current.y = app.screen.height / 2;
      }
    };
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isDestroyed || !islandContainerRef.current || !canvasContainerRef.current) return;
      const islandContainer = islandContainerRef.current;
      
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const localX = (mouseX - islandContainer.x) / islandContainer.scale.x;
      const localY = (mouseY - islandContainer.y) / islandContainer.scale.y;

      const direction = e.deltaY > 0 ? -1 : 1;
      const zoomSpeed = 0.15;
      let newScale = islandContainer.scale.x + direction * zoomSpeed;
      newScale = Math.max(0.3, Math.min(3.0, newScale));

      islandContainer.x = mouseX - localX * newScale;
      islandContainer.y = mouseY - localY * newScale;
      islandContainer.scale.set(newScale);
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
          canvasContainerRef.current.addEventListener("wheel", handleWheel, { passive: false });
        }

        window.addEventListener("resize", handleResize);

        await PIXI.Assets.load([
          { alias: "island", src: "/assets/ilha-1.png" },
          { alias: "habitat", src: "/assets/fire-habitat.png" },
          { alias: "dragon", src: "/assets/fire-dragon-1.png" }
        ]);

        if (isDestroyed || !app.stage) return;

        const islandContainer = new PIXI.Container();
        islandContainer.x = app.screen.width / 2;
        islandContainer.y = app.screen.height / 2;
        islandContainerRef.current = islandContainer;

        const island = PIXI.Sprite.from("island");
        island.anchor.set(0.5);
        
        const itemsContainer = new PIXI.Container();
        placedItemsContainerRef.current = itemsContainer;

        islandContainer.addChild(island);
        islandContainer.addChild(itemsContainer);
        app.stage.addChild(islandContainer);

        // --- INTERACTIVITY (PLACEMENT/MOVE MODE) ---
        app.stage.eventMode = 'static';
        app.stage.hitArea = new PIXI.Rectangle(-10000, -10000, 20000, 20000); 

        app.stage.on('pointermove', (e) => {
          const { placementMode, movingItemId, placedItems } = propsRef.current;
          if ((!placementMode && !movingItemId) || !ghostSpriteRef.current || !islandContainerRef.current) return;
          
          const localPos = islandContainerRef.current.toLocal(e.global);
          const ghost = ghostSpriteRef.current;
          
          ghost.x = localPos.x;
          ghost.y = localPos.y;

          // Lógica Visual de Colisão
          let isValid = true;
          if (Math.hypot(ghost.x, ghost.y) > 180) isValid = false; // Fora da ilha
          
          for (const item of placedItems) {
             // Se estamos movendo um item, ignoramos a colisão dele com ele mesmo
             if (movingItemId && item._id === movingItemId) continue;

             if (Math.hypot(ghost.x - item.x, ghost.y - item.y) < 80) {
                 isValid = false; 
                 break;
             }
          }

          ghost.tint = isValid ? 0x00FF00 : 0xFF0000;
          ghost.alpha = 0.7;
        });

        app.stage.on('pointerdown', (e) => {
          const { placementMode, movingItemId, onConfirmPlacement, onConfirmMove } = propsRef.current;
          if ((!placementMode && !movingItemId) || !ghostSpriteRef.current || !islandContainerRef.current) return;

          // Se estiver vermelho, não faz nada (inválido)
          if (ghostSpriteRef.current.tint === 0xFF0000) return;

          const localPos = islandContainerRef.current.toLocal(e.global);
          
          if (placementMode && onConfirmPlacement) {
            onConfirmPlacement(localPos.x, localPos.y);
          } else if (movingItemId && onConfirmMove) {
            onConfirmMove(movingItemId, localPos.x, localPos.y);
          }
        });

        setIsPixiReady(true);

      } catch (error) {
        console.error("Error initializing PixiJS:", error);
      }
    };

    initPixi();

    return () => {
      isDestroyed = true;
      window.removeEventListener("resize", handleResize);
      if (canvasContainerRef.current) {
        canvasContainerRef.current.removeEventListener("wheel", handleWheel);
      }
      
      if (appRef.current) {
        if (appRef.current.ticker) appRef.current.ticker.stop();
        try { appRef.current.destroy(true); } catch (e) { }
      }
    };
  }, []);

  // 2. RENDER PLACED ITEMS
  useEffect(() => {
    const itemsContainer = placedItemsContainerRef.current;
    if (!itemsContainer || !isPixiReady) return;

    itemsContainer.removeChildren();

    placedItems.forEach(item => {
      // Se este item estiver sendo movido, não o renderizamos aqui, pois o fantasma representará ele
      if (movingItemId === item._id) return;

      if (item.itemType === 'fire_habitat') {
        const sprite = PIXI.Sprite.from("habitat");
        sprite.anchor.set(0.5);
        sprite.width = 150;
        sprite.scale.y = sprite.scale.x;
        sprite.x = item.x;
        sprite.y = item.y;
        
        // Interatividade: Permitir clicar para mover
        sprite.eventMode = 'static';
        sprite.cursor = 'pointer';
        sprite.on('pointerdown', (e) => {
          e.stopPropagation(); // Impede de clicar no mapa e acionar a confirmação de uma vez
          const { onItemClick, placementMode, movingItemId } = propsRef.current;
          // Só pode selecionar se não estiver já no meio de uma construção ou movimento
          if (!placementMode && !movingItemId && onItemClick) {
             onItemClick(item._id);
          }
        });

        itemsContainer.addChild(sprite);
      }
    });

  }, [placedItems, movingItemId, isPixiReady]);

  // 3. HANDLE PLACEMENT/MOVE MODE GHOST
  useEffect(() => {
    const islandContainer = islandContainerRef.current;
    if (!islandContainer || !isPixiReady) return;

    if (placementMode || movingItemId) {
      if (!ghostSpriteRef.current) {
        const ghost = PIXI.Sprite.from("habitat"); 
        ghost.anchor.set(0.5);
        ghost.width = 150;
        ghost.scale.y = ghost.scale.x;
        ghost.alpha = 0.7;
        islandContainer.addChild(ghost);
        ghostSpriteRef.current = ghost;
      }
    } else {
      if (ghostSpriteRef.current) {
        islandContainer.removeChild(ghostSpriteRef.current);
        ghostSpriteRef.current.destroy();
        ghostSpriteRef.current = null;
      }
    }
  }, [placementMode, movingItemId, isPixiReady]);

  return (
    <div 
      ref={canvasContainerRef} 
      className={`w-full h-screen overflow-hidden ${(placementMode || movingItemId) ? 'cursor-crosshair' : ''}`} 
    />
  );
}
