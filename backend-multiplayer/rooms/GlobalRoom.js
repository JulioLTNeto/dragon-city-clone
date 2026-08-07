import { Room } from 'colyseus';
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
