import { Room } from 'colyseus';
import * as schema from '@colyseus/schema';
const { Schema, MapSchema, ArraySchema, type } = schema;

class BattlePlayer extends Schema {
  constructor(sessionId, playerName) {
    super();
    this.sessionId = sessionId;
    this.playerName = playerName;
    this.isReady = false;
    this.dragons = new ArraySchema();
  }
}
schema.defineTypes(BattlePlayer, {
  sessionId: "string",
  playerName: "string",
  isReady: "boolean",
  dragons: ["string"]
});

class BattleState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.phase = "lobby"; // lobby, battle, ended
  }
}
schema.defineTypes(BattleState, {
  players: { map: BattlePlayer },
  phase: "string"
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
      this.state.phase = "battle";
    }
  }

  onJoin(client, options) {
    const pName = options.name || "Desafiante";
    this.state.players.set(client.sessionId, new BattlePlayer(client.sessionId, pName));
    console.log(`[BattleRoom] ${pName} (${client.sessionId}) joined!`);
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
