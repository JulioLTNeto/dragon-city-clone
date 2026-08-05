# Dragon City Clone - Alicerces

Este é um monorepo para um jogo de construção de cidade e batalhas, seguindo uma arquitetura moderna dividida entre:

1. **Frontend (`/frontend`)**: Next.js com App Router. Para renderizar elementos interativos complexos (ex: a cidade isométrica ou animações de batalha), você pode usar o PixiJS que já foi instalado.
2. **Backend API (`/backend-api`)**: Servidor Express com Mongoose (MongoDB). Responsável por autenticação, salvamento do estado persistente e da cidade, lojas e compras (operações que não precisam de tempo real absoluto).
3. **Backend Multiplayer (`/backend-multiplayer`)**: Servidor Colyseus. Feito para alta performance e sincronização de estado. As batalhas PvP rodarão em "Rooms" dentro dele. Ele está integrado ao Redis para escalar e fornecer um sistema de presença/matchmaking ágil.
4. **Infraestrutura**: Um arquivo `docker-compose.yml` está na raiz do projeto contendo MongoDB e Redis para desenvolvimento local.

## Como iniciar o ambiente de desenvolvimento local

### 1. Iniciar Banco de Dados e Cache
Certifique-se de ter o Docker Desktop instalado e rodando.
Na pasta raiz do projeto:
```bash
docker-compose up -d
```
Isso subirá o MongoDB na porta `27017` e o Redis na porta `6379`.

### 2. Iniciar API REST
```bash
cd backend-api
node index.js
```
A API rodará em `http://localhost:3001`.

### 3. Iniciar Servidor Multiplayer
```bash
cd backend-multiplayer
node index.js
```
O servidor Colyseus rodará em `ws://localhost:2567`.

### 4. Iniciar o Frontend
```bash
cd frontend
npm run dev
```
O Next.js estará disponível em `http://localhost:3000`.

---
**Desenvolvido com IA com as bases estruturais prontas para os próximos passos de implementação de regras de negócio!**
