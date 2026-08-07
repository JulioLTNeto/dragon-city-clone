import { Room } from 'colyseus';
import * as schema from '@colyseus/schema';
const { Schema, MapSchema, ArraySchema, type } = schema;

class BattlePlayer extends Schema {
  constructor(sessionId, playerName, role) {
    super();
    this.sessionId = sessionId;
    this.playerName = playerName;
    this.role = role;
    this.isReady = false;
    this.dragons = new ArraySchema();
  }
}
schema.defineTypes(BattlePlayer, {
  sessionId: "string",
  playerName: "string",
  role: "string",
  isReady: "boolean",
  dragons: ["string"]
});

class BattleState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.phase = "lobby"; // lobby, coin_toss, battle, ended
    this.currentTurn = "";
    this.coinTossResult = "";
  }
}
schema.defineTypes(BattleState, {
  players: { map: BattlePlayer },
  phase: "string",
  currentTurn: "string",
  coinTossResult: "string"
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
         selected.slice(0, 5).forEach(d => arr.push(d));
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
    this.broadcast("opponent_left");
    this.disconnect();
  }

  onDispose() {
    console.log(`[BattleRoom] disposing...`);
  }
}
