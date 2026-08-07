import { Room } from 'colyseus';
import * as schema from '@colyseus/schema';
const { Schema, MapSchema, ArraySchema, type } = schema;

class BattleDragon extends Schema {
  constructor(type, maxHp) {
    super();
    this.type = type;
    this.maxHp = maxHp;
    this.currentHp = maxHp;
    this.isDead = false;
  }
}
schema.defineTypes(BattleDragon, {
  type: "string",
  maxHp: "number",
  currentHp: "number",
  isDead: "boolean"
});

class BattlePlayer extends Schema {
  constructor(sessionId, playerName, role) {
    super();
    this.sessionId = sessionId;
    this.playerName = playerName;
    this.role = role;
    this.isReady = false;
    this.currentAttackStep = 0;
    this.dragons = new ArraySchema(); // of BattleDragon
  }
}
schema.defineTypes(BattlePlayer, {
  sessionId: "string",
  playerName: "string",
  role: "string",
  isReady: "boolean",
  currentAttackStep: "number",
  dragons: [BattleDragon]
});

class BattleState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.phase = "lobby"; // lobby, coin_toss, battle, ended
    this.currentTurn = "";
    this.coinTossResult = "";
    this.winnerSessionId = "";
  }
}
schema.defineTypes(BattleState, {
  players: { map: BattlePlayer },
  phase: "string",
  currentTurn: "string",
  coinTossResult: "string",
  winnerSessionId: "string"
});

export class BattleRoom extends Room {
  onCreate(options) {
    this.setState(new BattleState());
    this.maxClients = 2; // only 2 players

    this.onMessage("select_dragons", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (player && this.state.phase === "lobby") {
         const selected = message.dragons || [];
         const arr = new ArraySchema();
         selected.slice(0, 5).forEach(d => {
           // Default mock HP for now
           arr.push(new BattleDragon(d, 100));
         });
         player.dragons = arr;
      }
    });

    this.onMessage("set_ready", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (player && this.state.phase === "lobby") {
         player.isReady = !!message.ready;
         this.checkAllReady();
      }
    });

    this.onMessage("attack", (client, message) => {
      // Validate turn
      if (this.state.phase !== "battle" || this.state.currentTurn !== client.sessionId) return;
      
      const targetIndex = message.targetIndex; // 0 to 4
      const attackType = message.type || "physical";
      
      // Find opponent
      let opponent = null;
      let attacker = this.state.players.get(client.sessionId);
      this.state.players.forEach((p) => {
        if (p.sessionId !== client.sessionId) opponent = p;
      });
      if (!opponent || !attacker) return;

      const targetDragon = opponent.dragons[targetIndex];
      if (!targetDragon || targetDragon.isDead) return;

      // Identify attacker index for the broadcast
      const attackOrder = [3, 4, 0, 1, 2];
      const attackerIndex = attackOrder[attacker.currentAttackStep];

      // Broadcast animation BEFORE applying damage state
      this.broadcast("play_animation", {
        attackerSessionId: client.sessionId,
        attackerIndex: attackerIndex,
        targetSessionId: opponent.sessionId,
        targetIndex: targetIndex,
        type: attackType
      });

      // Apply damage
      let damage = 0;
      if (attackType === "magic") {
        damage = Math.floor(Math.random() * 21) + 25; // 25 to 45
      } else {
        damage = Math.floor(Math.random() * 21) + 15; // 15 to 35
      }
      
      targetDragon.currentHp -= damage;
      if (targetDragon.currentHp <= 0) {
        targetDragon.currentHp = 0;
        targetDragon.isDead = true;
      }

      // Check win condition
      let allDead = true;
      opponent.dragons.forEach(d => {
        if (!d.isDead) allDead = false;
      });

      if (allDead) {
        this.state.phase = "ended";
        this.state.winnerSessionId = client.sessionId;
        return; // End of battle
      }

      // Find next attacker step for the current player
      this.advanceAttackStep(attacker);

      // Pass turn
      this.state.currentTurn = opponent.sessionId;
    });
  }

  advanceAttackStep(player) {
    const attackOrder = [3, 4, 0, 1, 2];
    for (let i = 0; i < 5; i++) {
      player.currentAttackStep = (player.currentAttackStep + 1) % 5;
      const nextDragonIndex = attackOrder[player.currentAttackStep];
      const nextDragon = player.dragons[nextDragonIndex];
      if (nextDragon && !nextDragon.isDead) {
        break; // Found alive dragon
      }
    }
  }

  checkAllReady() {
    let allReady = true;
    let playerCount = 0;
    this.state.players.forEach((player) => {
      playerCount++;
      if (!player.isReady) allReady = false;
    });

    if (playerCount === 2 && allReady) {
      this.state.phase = "coin_toss";
      
      const isChallengerFirst = Math.random() < 0.5;
      const result = isChallengerFirst ? "cara" : "coroa";
      
      let firstTurnSessionId = "";
      this.state.players.forEach((player) => {
        if ((result === "cara" && player.role === "challenger") || (result === "coroa" && player.role === "challenged")) {
          firstTurnSessionId = player.sessionId;
        }
      });
      
      this.state.coinTossResult = result;
      this.state.currentTurn = firstTurnSessionId;

      this.clock.setTimeout(() => {
        this.state.phase = "battle";
      }, 5000);
    }
  }

  onJoin(client, options) {
    const pName = options.name || "Desafiante";
    const pRole = options.role || "challenger";
    this.state.players.set(client.sessionId, new BattlePlayer(client.sessionId, pName, pRole));
    console.log(`[BattleRoom] ${pName} (${client.sessionId}) joined as ${pRole}!`);
  }

  onLeave(client, consented) {
    console.log(`[BattleRoom] ${client.sessionId} left!`);
    if (this.state.phase !== "ended") {
      this.broadcast("opponent_left");
      this.disconnect();
    }
  }

  onDispose() {
    console.log(`[BattleRoom] disposing...`);
  }
}
