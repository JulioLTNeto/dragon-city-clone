import { Room, matchMaker } from 'colyseus';
import * as schema from '@colyseus/schema';
const { Schema, MapSchema, ArraySchema, type } = schema;

class Player extends Schema {
  constructor(playerName) {
    super();
    this.playerName = playerName;
  }
}
schema.defineTypes(Player, {
  playerName: "string"
});

class ChatMessage extends Schema {
  constructor(sender, text, timestamp) {
    super();
    this.sender = sender;
    this.text = text;
    this.timestamp = timestamp;
  }
}
schema.defineTypes(ChatMessage, {
  sender: "string",
  text: "string",
  timestamp: "number"
});

class GlobalState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.messages = new ArraySchema();
  }
}
schema.defineTypes(GlobalState, {
  players: { map: Player },
  messages: [ ChatMessage ]
});

export class GlobalRoom extends Room {
  onCreate(options) {
    this.setState(new GlobalState());
    
    // Limits the chat history to 50 messages
    this.maxMessages = 50;

    this.onMessage("chat_message", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        const chatMsg = new ChatMessage(player.playerName, message.text, Date.now());
        this.state.messages.push(chatMsg);
        
        if (this.state.messages.length > this.maxMessages) {
          this.state.messages.shift();
        }
      }
    });

    this.onMessage("challenge_player", (client, message) => {
      const targetSessionId = message.targetSessionId;
      const targetClient = this.clients.find(c => c.sessionId === targetSessionId);
      const player = this.state.players.get(client.sessionId);
      
      if (targetClient && player) {
        targetClient.send("challenge_received", {
          challengerId: client.sessionId,
          challengerName: player.playerName
        });
      }
    });

    this.onMessage("accept_challenge", async (client, message) => {
      const challengerId = message.challengerId;
      const challengerClient = this.clients.find(c => c.sessionId === challengerId);
      const player = this.state.players.get(client.sessionId);
      const challengerPlayer = this.state.players.get(challengerId);
      
      if (challengerClient && player && challengerPlayer) {
        try {
          const battleRoom = await matchMaker.createRoom("battle_room", {});
          const reservation1 = await matchMaker.reserveSeatFor(battleRoom, { name: player.playerName });
          const reservation2 = await matchMaker.reserveSeatFor(battleRoom, { name: challengerPlayer.playerName });
          
          client.send("battle_ready", { reservation: reservation1 });
          challengerClient.send("battle_ready", { reservation: reservation2 });
        } catch (e) {
          console.error("Error creating battle room:", e);
        }
      }
    });

    this.onMessage("decline_challenge", (client, message) => {
      const challengerId = message.challengerId;
      const challengerClient = this.clients.find(c => c.sessionId === challengerId);
      const player = this.state.players.get(client.sessionId);
      
      if (challengerClient && player) {
        challengerClient.send("challenge_declined", {
          targetName: player.playerName
        });
      }
    });
  }

  onJoin(client, options = {}) {
    const pName = options.name || "Mestre Anônimo";
    this.state.players.set(client.sessionId, new Player(pName));
    console.log(`[GlobalRoom] ${pName} (${client.sessionId}) joined!`);
  }

  onLeave(client, consented) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`[GlobalRoom] ${player.playerName} (${client.sessionId}) left!`);
      this.state.players.delete(client.sessionId);
    }
  }

  onDispose() {
    console.log(`[GlobalRoom] disposing...`);
  }
}
