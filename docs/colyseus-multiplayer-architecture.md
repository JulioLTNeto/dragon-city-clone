# Integração Colyseus: Chat Global e Estado Multiplayer

Este documento serve como **Base de Conhecimento** detalhada sobre a integração do sistema de Chat Global e Lista de Jogadores Online utilizando **Colyseus** no backend (Node.js) e no frontend (Next.js/React). 

O objetivo é documentar as decisões tomadas, os desafios enfrentados com a serialização e compatibilidade de versões, e os padrões arquiteturais escolhidos. Ao invés de o desenvolvedor ou a IA perderem tempo debugando os mesmos problemas no futuro, basta consultar este documento.

---

## 1. Arquitetura e Decisões de Design

### 1.1 "Schema-less" no Cliente (Frontend)
Foi decidido **não** compartilhar as classes de `Schema` (os moldes de estado) do Backend para o Frontend.
- **Motivo**: Manter o código DRY (Don't Repeat Yourself) e evitar a necessidade de configurar um pacote compartilhado (monorepo complexo) ou duplicação manual de classes.
- **Consequência**: O `colyseus.js` no frontend utiliza decodificação dinâmica (schema-less mode). Os objetos recebidos via `room.state` não são instâncias reais de classes do Colyseus, mas sim proxies dinâmicos gerados a partir do binário (`msgpack`).

---

## 2. Solução de Problemas e Aprendizados (Troubleshooting)

Ao longo do desenvolvimento, enfrentamos erros obscuros relacionados à versão da biblioteca e peculiaridades da linguagem JavaScript. Abaixo estão os registros para referência futura.

### 2.1 Erro: `TypeError: Cannot read properties of undefined (reading 'name')` no Matchmaking
- **Sintoma**: Ao tentar conectar com `client.joinOrCreate()`, o cliente lançava um erro imediato ao tentar ler `.name` do objeto `room` da resposta.
- **Causa Raiz**: O pacote `colyseus` do backend estava na versão `0.17.x`, enquanto a biblioteca `colyseus.js` do frontend estava restrita à última versão estável `0.16.x`. Na versão 0.17, o Colyseus mudou o formato da resposta do Matchmaker HTTP (deixou de devolver `response.room.name` aninhado e passou a ser plano).
- **Solução (Decisão)**: Ao invés de tentar adaptar o cliente (que não possuía versão 0.17 estável no npm), **fizemos o downgrade do backend** (incluindo `colyseus`, `@colyseus/schema`, `@colyseus/ws-transport`, `@colyseus/redis-driver`) para a versão `0.16.x`. A paridade de versão entre backend e frontend no Colyseus é **absolutamente estrita**.

### 2.2 Problema de Serialização do ES6 (Variáveis como `undefined` no cliente)
- **Sintoma**: A string `playerName` da classe `Player` chegava como `undefined` no frontend (fazendo a UI exibir um fallback, como "Mestre").
- **Causa Raiz**: No Node.js moderno, definir propriedades de classe (`this.playerName = playerName;`) no construtor sobrescreve fisicamente os *getters/setters* criados na *prototype* da classe pelos decoradores padrão do `@colyseus/schema` (como a função `type()`).
- **Solução (Decisão)**: Substituímos as funções de decorador pela função estática oficial:
  ```javascript
  schema.defineTypes(Player, { playerName: "string" });
  ```
  O método `defineTypes` foi introduzido especificamente para resolver esse bug de inicialização do ES6 em JavaScript puro, garantindo a amarração binária antes da instância ser criada.

### 2.3 Erro: `state.players.onAdd is not a function`
- **Sintoma**: O frontend quebrava tentando ouvir o evento `currentRoom.state.players.onAdd`.
- **Causa Raiz**: Conforme a decisão arquitetural **1.1**, o cliente opera de forma "Schema-less". Objetos de estado gerados dinamicamente no Colyseus 0.14+ **não possuem** os métodos granulares de proxy (`.onAdd`, `.onRemove`).
- **Solução**: Mapear o estado inteiro a cada atualização usando o evento mestre `onStateChange`:
  ```javascript
  currentRoom.onStateChange((state) => {
    // Atualiza a lista completa em Arrays de React State
  });
  ```
  O React.js se encarrega de otimizar a renderização (Virtual DOM diffing) de maneira eficiente, mesmo recebendo a coleção completa.

### 2.4 O Bug dos "3 Mestres" (Iteração Incorreta em MapSchema)
- **Sintoma**: A interface exibia 3 itens genéricos na lista de usuários online, embora o servidor estivesse registrando apenas 1 jogador conectado.
- **Causa Raiz**: O estado `state.players` não é um Objeto regular; no cliente schema-less, ele é um Proxy que representa um `MapSchema`. Utilizar `Object.keys(state.players)` retornava os nomes das propriedades internas do motor de estado: `['$items', '$indexes', 'deletedItems']` (exatamente 3 chaves secretas). Como essas chaves não possuíam `.playerName`, o React caía no fallback `|| "Mestre"`.
- **Solução**: Utilizar obrigatoriamente a função nativa `.forEach` exportada pela estrutura do `MapSchema` para iterar apenas nos valores reais de jogadores:
  ```javascript
  state.players.forEach((player, sessionId) => {
    // Lógica segura
  });
  ```

### 2.5 Vazamento de Conexões e Jogadores "Zumbis" (React Strict Mode)
- **Sintoma**: O backend mantinha sessões ativas do mesmo desenvolvedor acumulando "Fantasmas" ao salvar arquivos.
- **Causa Raiz**: Em ambiente local, o React 18 executa `useEffect` duas vezes consecutivas (Mount -> Unmount -> Mount). Como a promessa `client.joinOrCreate()` é assíncrona, a função de *cleanup* do `useEffect` original executava **antes** de a conexão terminar, não encontrando o objeto `room` para chamar `.leave()`.
- **Solução**: Implementar o controle rigoroso com a variável de encerramento (`isMounted`):
  ```javascript
  let isMounted = true;
  client.joinOrCreate(...).then((r) => {
    if (!isMounted) {
      r.leave(); // Destrói imediatamente se o componente foi desmontado no meio do caminho
      return;
    }
    // ...
  });
  ```

---

## 3. Resumo da Implementação de Código

### `GlobalRoom.js` (Backend)
- Responsável por armazenar o `GlobalState` que contém instâncias de `MapSchema` para `players` e `ArraySchema` para `messages`.
- Limite dinâmico de 50 mensagens configurado no `onCreate`.
- Processa o `name` do jogador nas `options` e inicializa a classe `Player`.

### `MultiplayerChat.tsx` (Frontend)
- Componente de "Painel Gaveta" estilizado de forma flutuante (side-panel).
- Ouve exclusivamente o `onStateChange` mapeando o estado de forma passiva para variáveis locais `useState`.
- Mantém `sessionId` das instâncias para remoção sem duplicação.
