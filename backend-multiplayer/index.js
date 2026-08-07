import { Server } from 'colyseus';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { RedisPresence } from '@colyseus/redis-presence';
import { RedisDriver } from '@colyseus/redis-driver';

const port = process.env.PORT || 2567;
const app = express();

app.use(cors());
app.use(express.json());

const server = createServer(app);
const gameServer = new Server({
  server,
  presence: new RedisPresence({ port: 6380 }), 
  driver: new RedisDriver({ port: 6380 }),
});

// Basic route for health check
app.get('/', (req, res) => {
    res.json({ message: 'Dragon City Clone Multiplayer Server running' });
});

import { GlobalRoom } from './rooms/GlobalRoom.js';
import { BattleRoom } from './rooms/BattleRoom.js';

// Define your Colyseus room here
// gameServer.define('battle_room', BattleRoom);
gameServer.define('global_room', GlobalRoom);
gameServer.define('battle_room', BattleRoom);

gameServer.listen(port).then(() => {
    console.log(`🎮 Multiplayer Game Server running on ws://localhost:${port}`);
});
