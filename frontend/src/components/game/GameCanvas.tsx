"use client";

import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";

interface GameCanvasProps {
  placementMode?: string | null;
  movingItemId?: string | null;
  placedItems?: any[];
  onConfirmPlacement?: (x: number, y: number, habitatId?: string) => void;
  onConfirmMove?: (id: string, x: number, y: number) => void;
  onItemMoveRequest?: (id: string) => void;
}

export default function GameCanvas({ 
  placementMode, 
  movingItemId,
  placedItems = [], 
  onConfirmPlacement,
  onConfirmMove,
  onItemMoveRequest
}: GameCanvasProps) {
  const [isPixiReady, setIsPixiReady] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  // Refs to access pixi objects across useEffects
  const appRef = useRef<PIXI.Application | null>(null);
  const islandContainerRef = useRef<PIXI.Container | null>(null);
  const ghostSpriteRef = useRef<PIXI.Sprite | null>(null);
  const placedItemsContainerRef = useRef<PIXI.Container | null>(null);

  // Keeps props fresh for event listeners without re-binding
  const propsRef = useRef({ placementMode, movingItemId, onConfirmPlacement, onConfirmMove, onItemMoveRequest, placedItems, selectedItemId });
  useEffect(() => {
    propsRef.current = { placementMode, movingItemId, onConfirmPlacement, onConfirmMove, onItemMoveRequest, placedItems, selectedItemId };
  }, [placementMode, movingItemId, onConfirmPlacement, onConfirmMove, onItemMoveRequest, placedItems, selectedItemId]);

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

        // --- SYNC CONTEXT MENU TO SCREEN ---
        app.ticker.add(() => {
          const { selectedItemId, placedItems } = propsRef.current;
          if (selectedItemId && contextMenuRef.current && islandContainerRef.current) {
            const item = placedItems.find(i => i._id === selectedItemId);
            if (item) {
              const globalPos = islandContainerRef.current.toGlobal(new PIXI.Point(item.x, item.y + 110));
              contextMenuRef.current.style.transform = `translate(${globalPos.x}px, ${globalPos.y}px)`;
              contextMenuRef.current.style.display = 'flex';
            } else {
              contextMenuRef.current.style.display = 'none';
            }
          } else if (contextMenuRef.current) {
            contextMenuRef.current.style.display = 'none';
          }

          // --- ANIMATE DRAGONS ---
          if (placedItemsContainerRef.current) {
            placedItemsContainerRef.current.children.forEach((child: any) => {
              if (child.isDragon && child.animState) {
                const state = child.animState;
                
                if (state.pauseTimer > 0) {
                  state.pauseTimer -= ticker.deltaTime;
                } else {
                  // Mover em direção ao alvo
                  const targetX = state.startX + state.targetOffset;
                  const dx = targetX - child.x;
                  
                  // Virar o dragão para a direção do movimento
                  // Assumindo que a imagem original do dragão olha para a esquerda
                  child.scale.x = dx > 0 ? -Math.abs(child.scale.y) : Math.abs(child.scale.y);

                  if (Math.abs(dx) < 1) {
                    child.x = targetX;
                    // Ao chegar, escolhe um novo alvo aleatório no habitat (limite +- 40px)
                    state.targetOffset = (Math.random() * 80) - 40;
                    // Pausa aleatória entre 0 e 5 segundos (60fps * 5 = 300 frames)
                    state.pauseTimer = Math.random() * 300; 
                  } else {
                    // Move gradualmente (Velocidade ajustada para completar o percurso em ~10s a 15s)
                    child.x += Math.sign(dx) * state.speed * ticker.deltaTime;
                  }
                }
              }
            });
          }
        });

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

          let isValid = true;

          // Se estiver comprando um Dragão, a lógica de colisão é diferente
          if (placementMode === 'fire_dragon_egg') {
             isValid = false; // Por padrão, vermelho
             for (const item of placedItems) {
               if (item.itemType === 'fire_habitat') {
                  const dist = Math.hypot(ghost.x - item.x, ghost.y - item.y);
                  if (dist < 80) {
                     // Snaps to habitat e fica verde
                     ghost.x = item.x;
                     ghost.y = item.y;
                     isValid = true;
                     break;
                  }
               }
             }
          } else {
            // Lógica Padrão (Colocando Prédio ou Movendo Prédio)
            if (Math.hypot(ghost.x, ghost.y) > 180) isValid = false; // Fora da ilha
            
            for (const item of placedItems) {
               // Ignora colisão dele com ele mesmo
               if (movingItemId && item._id === movingItemId) continue;

               if (Math.hypot(ghost.x - item.x, ghost.y - item.y) < 80) {
                   isValid = false; 
                   break;
               }
            }
          }

          ghost.tint = isValid ? 0x00FF00 : 0xFF0000;
          ghost.alpha = 0.7;
        });

        app.stage.on('pointerdown', (e) => {
          const { placementMode, movingItemId, placedItems, onConfirmPlacement, onConfirmMove } = propsRef.current;
          
          if (!placementMode && !movingItemId) {
             setSelectedItemId(null);
             return;
          }

          if (!ghostSpriteRef.current || !islandContainerRef.current) return;

          // Se estiver vermelho, não faz nada (inválido)
          if (ghostSpriteRef.current.tint === 0xFF0000) return;

          const localPos = islandContainerRef.current.toLocal(e.global);
          
          if (placementMode && onConfirmPlacement) {
            let habitatId = undefined;
            if (placementMode === 'fire_dragon_egg') {
               for (const item of placedItems) {
                 const dist = Math.hypot(localPos.x - item.x, localPos.y - item.y);
                 if (dist < 80 && item.itemType === 'fire_habitat') {
                    habitatId = item._id;
                    break;
                 }
               }
            }
            onConfirmPlacement(localPos.x, localPos.y, habitatId);
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
      if (movingItemId === item._id) return;

      if (item.itemType === 'fire_habitat') {
        const sprite = PIXI.Sprite.from("habitat");
        sprite.anchor.set(0.5);
        sprite.width = 150;
        sprite.scale.y = sprite.scale.x;
        sprite.x = item.x;
        sprite.y = item.y;
        
        // Se este habitat estiver selecionado, fica com 80% de opacidade
        if (selectedItemId === item._id) {
           sprite.alpha = 0.8;
           // Aplica um filtro de cor para destacar mais a seleção se quiser (opcional)
           sprite.tint = 0xFFFFFF; 
        } else {
           sprite.alpha = 1.0;
           sprite.tint = 0xFFFFFF;
        }
        
        sprite.eventMode = 'static';
        sprite.cursor = 'pointer';
        sprite.on('pointerdown', (e) => {
          e.stopPropagation(); 
          const { placementMode, movingItemId } = propsRef.current;
          if (!placementMode && !movingItemId) {
             setSelectedItemId(item._id);
          }
        });

        itemsContainer.addChild(sprite);

        // RENDER DRAGONS INSIDE HABITAT
        if (item.dragons && item.dragons.length > 0) {
           item.dragons.forEach((dragonType: string, index: number) => {
              const dSprite = PIXI.Sprite.from(dragonType === 'fire_dragon' ? "dragon" : "dragon");
              dSprite.anchor.set(0.5);
              dSprite.width = 60;
              dSprite.scale.y = dSprite.scale.x;
              
              // Setup da Animação
              (dSprite as any).isDragon = true;
              (dSprite as any).animState = {
                startX: item.x, // Centro do habitat
                targetOffset: (Math.random() * 80) - 40, // Ponto inicial aleatório
                speed: 0.1 + Math.random() * 0.05, // pixels por frame (lento)
                pauseTimer: Math.random() * 60, // pausa inicial
              };

              // Posicionamento inicial
              dSprite.x = (dSprite as any).animState.startX + ((index === 0 ? -30 : 30)); 
              dSprite.y = item.y + 10;

              if (selectedItemId === item._id) {
                 dSprite.alpha = 0.8;
                 dSprite.tint = 0xFFFFFF; 
              } else {
                 dSprite.alpha = 1.0;
                 dSprite.tint = 0xFFFFFF;
              }
              
              dSprite.eventMode = 'static';
              dSprite.cursor = 'pointer';
              dSprite.on('pointerdown', (e) => {
                e.stopPropagation(); 
                const { placementMode, movingItemId } = propsRef.current;
                if (!placementMode && !movingItemId) {
                   setSelectedItemId(item._id);
                }
              });

              itemsContainer.addChild(dSprite);
           });
        }
      }
    });

  }, [placedItems, movingItemId, selectedItemId, isPixiReady]);

  // 3. HANDLE PLACEMENT/MOVE MODE GHOST
  useEffect(() => {
    const islandContainer = islandContainerRef.current;
    if (!islandContainer || !isPixiReady) return;

    if (placementMode || movingItemId) {
      if (!ghostSpriteRef.current) {
        let textureName = "habitat";
        if (placementMode === 'fire_dragon_egg') textureName = "dragon";
        
        const ghost = PIXI.Sprite.from(textureName); 
        ghost.anchor.set(0.5);
        ghost.width = textureName === 'dragon' ? 60 : 150;
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

  // Quando o move mode ativa, a seleção some
  useEffect(() => {
    if (movingItemId) {
      setSelectedItemId(null);
    }
  }, [movingItemId]);

  return (
    <div className="relative w-full h-screen">
      <div 
        ref={contextMenuRef}
        style={{ display: 'none', position: 'absolute', top: 0, left: 0, zIndex: 10 }}
        className="flex gap-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center pointer-events-auto"
      >
        <button 
          onClick={() => {
            if (selectedItemId && onItemMoveRequest) {
              onItemMoveRequest(selectedItemId);
              setSelectedItemId(null);
            }
          }}
          className="bg-[#f1c40f] hover:bg-[#f39c12] text-[#5c3a11] font-black text-sm py-2 px-4 rounded-full border-b-4 border-[#d4ac0d] active:border-b-0 active:translate-y-1 transition-all uppercase flex gap-2 items-center shadow-lg"
        >
          <span>🖱️</span> Mover
        </button>
      </div>

      <div 
        ref={canvasContainerRef} 
        className={`w-full h-full overflow-hidden ${(placementMode || movingItemId) ? 'cursor-crosshair' : ''}`} 
      />
    </div>
  );
}
