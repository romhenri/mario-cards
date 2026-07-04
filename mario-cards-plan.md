# Mario Cards — Plano Técnico e de Produto (v1)

> Jogo de cartas estilo Hearthstone, tema Mario, jogável no navegador.
> Stack: **Next.js + TypeScript** (frontend) e **Node.js + WebSockets** (backend, JavaScript).
> Escopo do v1 é propositalmente pequeno: 2 cartas, 2 modos de jogo, zero arte.

---

## 1. Visão geral e decisões de arquitetura

A decisão mais importante do projeto é: **a lógica de regras do jogo ("game engine") é compartilhada entre cliente e servidor**, através de um pacote `packages/shared`. Isso evita duas implementações divergentes das regras (uma para CPU, outra para multiplayer) e garante que:

- No modo **vs CPU**, o engine roda inteiramente no navegador (sem servidor envolvido).
- No modo **Multiplayer**, o engine roda no servidor Node, que é a autoridade única sobre o estado do jogo (o cliente nunca decide o resultado de uma jogada, só envia intenções).

Para isso funcionar sem complicar o build, `packages/shared` é escrito em **JavaScript puro com JSDoc** (não TypeScript compilado). Assim:

- O servidor Node (JS) importa direto, sem passo de build.
- O Next.js (TS) importa o mesmo pacote; com `checkJs`/JSDoc o editor ainda dá autocomplete e checagem básica de tipos, mas não é obrigatório configurar um pipeline de compilação TS→JS para o pacote compartilhado.

Isso é uma simplificação deliberada do v1. Uma versão futura pode migrar `shared` para TypeScript com build step, se o time preferir tipagem forte no engine.

### Monorepo

Usamos um monorepo com workspaces (pnpm ou npm workspaces):

```
mario-cards/
  apps/
    web/       -> Next.js (TypeScript)
    server/    -> Servidor Node + WebSocket (JavaScript)
  packages/
    shared/    -> Regras do jogo, tipos (JSDoc), cards.json
```

---

## 2. Regras e mecânicas do jogo (spec do v1)

### 2.1 Cartas do v1

Apenas duas cartas existem no jogo. Nomes com tema Mario, mecânica 100% vanilla (sem habilidades especiais):

| id | name | color | manaCost | attack | health |
|---|---|---|---|---|---|
| `goomba` | Goomba | red | 1 | 1 | 1 |
| `koopa_troopa` | Koopa Troopa | blue | 2 | 2 | 2 |

Todas as cartas são do tipo `creature`. Não há cartas de feitiço/magia no v1.

### 2.2 Deck

Cada jogador joga com um deck fixo de 30 cartas: 15x Goomba + 15x Koopa Troopa, embaralhado no início da partida. Não há deck building no v1 — o deck é sempre o mesmo para os dois jogadores.

### 2.3 Setup da partida

1. Cria-se o `GameState` com dois jogadores, cada um com deck embaralhado, HP = 30, mana = 0/0, mão vazia, board vazio.
2. Define-se aleatoriamente (ou pela ordem de conexão, no caso de multiplayer) quem é o `firstPlayer`.
3. Cada jogador compra 3 cartas para a mão inicial (regra simplificada: **sem mulligan e sem "moeda" de compensação para quem joga em segundo** — isso é uma simplificação de escopo consciente; pode virar melhoria de v2).
4. O jogo entra na fase `main`, com o `firstPlayer` como jogador ativo.

### 2.4 Sistema de turno

- Apenas um jogador é o "jogador ativo" por vez; o turno alterna estritamente entre os dois jogadores.
- Sequência de início de turno (`startTurn`):
  1. Todas as criaturas do jogador ativo perdem o estado de "doente de invocação" (`summoningSickness = false`) e voltam a poder atacar (`hasAttackedThisTurn = false`).
  2. `maxMana` do jogador ativo aumenta em 1, até o teto de 10.
  3. `mana` (mana atual) é totalmente restaurado para `maxMana` (sem mana "trancada" ou parcial — diferente de Hearthstone real, mas mais simples para v1).
  4. O jogador compra 1 carta do deck. Se o deck estiver vazio, **nenhuma carta é comprada e nenhum dano é aplicado** (sem fadiga no v1 — simplificação consciente).
  5. Turno entra na fase `main`, onde o jogador pode jogar cartas e atacar em qualquer ordem, quantas vezes quiser, respeitando mana e regras de ataque.
- O jogador ativo encerra o turno explicitamente (ação `end_turn`), passando a vez ao oponente, que passa pela mesma sequência de início de turno.

### 2.5 Sistema de mana

- `maxMana` começa em 0 e sobe 1 por turno (por jogador, no início do próprio turno), até o máximo de 10.
- `mana` (mana disponível no turno) é sempre igual a `maxMana` no início do turno, e diminui conforme cartas são jogadas.
- Jogar uma carta exige `mana atual >= card.manaCost`; ao jogar, `mana -= card.manaCost`.

### 2.6 Vida (HP)

- Ambos os jogadores começam com **30 HP** (`maxHp = 30`, `hp = 30`).
- HP só diminui por dano de ataque direcionado ao "rosto" (face) do jogador.
- Não há cura no v1.

### 2.7 Condição de vitória

- Se `player.hp <= 0`, esse jogador perde imediatamente e a partida termina (`phase = "gameover"`, `winnerId` = o outro jogador).
- Checagem de vitória ocorre logo após qualquer ação que possa reduzir HP (ataques).
- Não há empate no v1 (não é tratado o caso teórico de ambos chegarem a 0 no mesmo instante, pois dano é sempre resolvido um ataque por vez).

### 2.8 Jogar uma carta (`play_card`)

Pré-condições:
- É o turno do jogador.
- A fase é `main`.
- A carta está na mão do jogador (`handIndex`/`cardInstanceId` válido).
- `mana atual >= card.manaCost`.
- O board do jogador não está cheio (limite de **7 criaturas em jogo**, igual ao Hearthstone).

Efeito:
- Remove a carta da mão.
- Cria uma `CardInstance` no board do jogador ativo com `attack`/`health` iguais aos valores base da definição, `summoningSickness = true`, `hasAttackedThisTurn = false`.
- Deduz o custo de mana.

### 2.9 Atacar (`attack`)

Pré-condições:
- É o turno do jogador.
- O atacante é uma `CardInstance` do board do jogador ativo.
- `summoningSickness === false` (criatura não pode atacar no turno em que foi jogada — regra clássica de Hearthstone).
- `hasAttackedThisTurn === false` (cada criatura ataca no máximo 1 vez por turno; sem "Windfury" no v1).
- O alvo é válido: ou `"face"` (o jogador oponente diretamente) ou uma `CardInstance` no board do oponente.

Efeito — ataque contra o rosto (`face`):
- `opponent.hp -= attacker.attack`.
- Atacante marca `hasAttackedThisTurn = true`.
- Checa condição de vitória.

Efeito — ataque contra criatura:
- Trocam dano simultaneamente: `target.health -= attacker.attack` e `attacker.health -= target.attack` (combate mútuo, igual Hearthstone).
- Qualquer criatura com `health <= 0` é removida do board (morre).
- Atacante marca `hasAttackedThisTurn = true` (mesmo se morrer).
- Não há "Taunt"/provocar no v1: qualquer criatura inimiga ou o rosto podem ser escolhidos livremente como alvo.

### 2.10 Fim de jogo

- Ao atingir `phase = "gameover"`, nenhuma ação adicional (`play_card`, `attack`, `end_turn`) é aceita.
- A tela exibe o vencedor e oferece retorno ao menu.

### 2.11 Fora de escopo do v1 (explicitamente adiado)

Para deixar claro o que **não** existe na v1: mulligan, moeda do segundo jogador, fadiga por deck vazio, taunt/provocar, habilidades/efeitos de cartas, feitiços, múltiplas cartas além das 2 definidas, cura, empates, reconexão após queda de WebSocket, deck building, ranking/persistência de partidas.

---

## 3. Modelos de dados

Definidos em `packages/shared/src/types.js` via JSDoc `@typedef` (compartilhados por cliente e servidor).

### 3.1 `CardDefinition` (dado estático, vem do `cards.json`)

```js
/**
 * @typedef {Object} CardDefinition
 * @property {string} id           - identificador único, ex: "goomba"
 * @property {string} name         - nome exibido, ex: "Goomba"
 * @property {"red"|"blue"} color  - cor temática, usada só para estilo de UI (sem arte)
 * @property {"creature"} type     - tipo da carta (só existe "creature" no v1)
 * @property {number} manaCost
 * @property {number} attack
 * @property {number} health
 * @property {string} [flavorText] - texto de sabor opcional, sem efeito em regra
 */
```

### 3.2 `CardInstance` (carta viva dentro de uma partida — na mão ou no board)

```js
/**
 * @typedef {Object} CardInstance
 * @property {string} instanceId          - uuid gerado ao comprar/criar a carta
 * @property {string} defId               - referencia ao CardDefinition.id
 * @property {number} attack              - ataque atual (== base no v1, sem buffs)
 * @property {number} health              - vida atual (pode ser menor que a base, após dano)
 * @property {number} maxHealth           - vida base (para referência/UI)
 * @property {boolean} summoningSickness  - true no turno em que foi jogada
 * @property {boolean} hasAttackedThisTurn
 * @property {string} ownerId             - id do jogador dono da carta
 */
```

### 3.3 `PlayerState`

```js
/**
 * @typedef {Object} PlayerState
 * @property {string} id
 * @property {string} name
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} mana        - mana disponível agora
 * @property {number} maxMana     - teto de mana do turno atual (sobe até 10)
 * @property {CardInstance[]} hand
 * @property {CardInstance[]} board
 * @property {string[]} deck      - lista de defId ainda não comprados (topo = deck[0])
 * @property {boolean} isCpu
 */
```

### 3.4 `GameState`

```js
/**
 * @typedef {Object} GameState
 * @property {string} gameId
 * @property {"cpu"|"multiplayer"} mode
 * @property {Record<string, PlayerState>} players     - chave = playerId
 * @property {string} activePlayerId
 * @property {number} turnNumber
 * @property {"mulligan"|"main"|"gameover"} phase       - "mulligan" reservado p/ futuro; v1 pula direto p/ "main"
 * @property {string|null} winnerId
 * @property {GameLogEntry[]} log
 */
```

### 3.5 `GameLogEntry`

```js
/**
 * @typedef {Object} GameLogEntry
 * @property {number} turnNumber
 * @property {string} message      - ex: "Jogador 1 jogou Goomba"
 * @property {number} ts
 */
```

### 3.6 Ações / Moves (entrada para o engine)

```js
/**
 * @typedef {
 *   {type: "PLAY_CARD", playerId: string, cardInstanceId: string} |
 *   {type: "ATTACK", playerId: string, attackerInstanceId: string, targetInstanceId: string | "face"} |
 *   {type: "END_TURN", playerId: string}
 * } GameAction
 */
```

O engine expõe uma função central, usada por **todos** os fluxos (CPU, multiplayer, IA):

```js
// packages/shared/src/engine/reducer.js
function applyAction(gameState, action) -> { gameState, error }
```

`applyAction` é pura (não muda o estado recebido, retorna um novo `GameState`) e faz toda a validação de regras (seção 2). Se a ação for inválida, retorna `{ gameState (inalterado), error: { code, message } }`.

---

## 4. `cards.json` — fonte de verdade das cartas

Local: `packages/shared/src/data/cards.json`.

```json
[
  {
    "id": "goomba",
    "name": "Goomba",
    "color": "red",
    "type": "creature",
    "manaCost": 1,
    "attack": 1,
    "health": 1,
    "flavorText": "Pisa nele."
  },
  {
    "id": "koopa_troopa",
    "name": "Koopa Troopa",
    "color": "blue",
    "type": "creature",
    "manaCost": 2,
    "attack": 2,
    "health": 2,
    "flavorText": "Sai do casco e ainda ataca."
  }
]
```

### Como é usado

- **Servidor** (`apps/server`): importa `cards.json` diretamente (`require`/`import`), usa para construir o deck padrão (`buildStandardDeck()` em `packages/shared/src/engine/deck.js`) e para validar `defId`s recebidos em ações.
- **Cliente** (`apps/web`): importa o mesmo arquivo via `packages/shared` para:
  - Renderizar `CardView` (nome, custo, ataque, vida, cor) sem precisar que o servidor envie esses dados repetidamente.
  - Rodar o modo CPU inteiramente local (o engine client-side usa o mesmo `cards.json`).
- Nenhum outro lugar do código deve ter uma cópia própria dos dados de carta — sempre importar de `packages/shared`. Isso garante que adicionar/mudar uma carta no v2 é uma edição em um único arquivo.

### Extensibilidade (pensando em v2, sem implementar agora)

O schema já comporta campos futuros sem quebrar o v1: `keywords: string[]` (ex: `"taunt"`, `"charge"`), `text` (efeito descritivo), `rarity`. Não são usados na v1, mas o formato de arquivo já é uma lista de objetos, fácil de estender.

---

## 5. Estrutura de pastas do projeto

```
mario-cards/
  package.json                     # workspaces root
  pnpm-workspace.yaml
  README.md

  apps/
    web/                           # Next.js + TypeScript
      package.json
      next.config.js
      tsconfig.json
      app/
        layout.tsx
        page.tsx                   # rota "/"        -> Home / Menu
        play/
          cpu/
            page.tsx               # rota "/play/cpu"
          online/
            page.tsx               # rota "/play/online"        -> Lobby
            [roomId]/
              page.tsx             # rota "/play/online/[roomId]" -> jogo multiplayer
        rules/
          page.tsx                 # rota "/rules" (opcional, ver seção 7)
      components/
        board/
          Board.tsx
          BoardRow.tsx
          BoardCardView.tsx
        hand/
          Hand.tsx
          CardView.tsx
        hud/
          PlayerHUD.tsx
          ManaBar.tsx
          HealthBar.tsx
          TurnIndicator.tsx
        log/
          GameLog.tsx
        modals/
          GameOverModal.tsx
        lobby/
          CreateRoomForm.tsx
          JoinRoomForm.tsx
        common/
          Button.tsx
          ConnectionStatus.tsx
        GameScreen.tsx              # container principal (ver seção 7)
      hooks/
        useCpuGame.ts
        useGameSocket.ts
      lib/
        socketClient.ts
      styles/
        globals.css

    server/                        # Node.js + WebSocket, JavaScript
      package.json
      src/
        index.js                   # entry point (http server + ws upgrade)
        ws/
          server.js                # cria o WebSocketServer, roteia mensagens
          protocol.js              # constantes de tipos de mensagem
        rooms/
          RoomManager.js           # cria/lista/remove salas
          Room.js                  # 1 sala = 1 partida multiplayer + 2 conexões

  packages/
    shared/                        # JS + JSDoc, usado por web e server
      package.json
      src/
        types.js                   # @typedef de todos os modelos (seção 3)
        data/
          cards.json               # fonte de verdade das cartas (seção 4)
        engine/
          deck.js                  # buildStandardDeck, shuffle
          reducer.js               # applyAction (regras do jogo)
          selectors.js             # helpers (ex: canAttack, isGameOver)
          ai.js                    # IA simples da CPU (seção 8)
```

---

## 6. Páginas / rotas web

| Rota | Componente/página | Responsabilidade |
|---|---|---|
| `/` | Home/Menu | Título do jogo, botão "Jogar contra CPU", botão "Jogar Multiplayer", link para `/rules` |
| `/play/cpu` | Tela de jogo vs CPU | Cria uma partida local (`useCpuGame`), renderiza `GameScreen` com estado 100% client-side, sem rede |
| `/play/online` | Lobby / Matchmaking | Campo de nome do jogador, botão "Criar sala" (gera `roomId` e conecta via WS como host), campo "Entrar com código" (conecta a uma sala existente) |
| `/play/online/[roomId]` | Tela de jogo multiplayer | Conecta ao WebSocket do servidor para aquela sala (`useGameSocket`), aguarda o segundo jogador, depois renderiza o mesmo `GameScreen`, agora orientado pelo estado autoritativo do servidor |
| `/rules` (opcional) | Página estática de regras | Texto explicando mana, turno, ataque e vitória — não é essencial ao v1 funcional, mas é barato de fazer e ajuda onboarding |

Observação de design: `GameScreen` é o mesmo componente para os dois modos de jogo. A diferença entre CPU e multiplayer fica isolada nos hooks (`useCpuGame` vs `useGameSocket`), que expõem a **mesma interface** para o componente (`{ gameState, playCard(id), attack(attackerId, targetId), endTurn(), myPlayerId }`). Isso evita duplicar toda a UI de jogo entre os dois modos.

---

## 7. Componentes React principais

- **`GameScreen`** — Container de mais alto nível da partida. Recebe `gameState` + funções de ação (via hook) e monta o layout: HUD do oponente no topo, board no meio, HUD do jogador + mão embaixo, log lateral. Não conhece a diferença entre CPU/multiplayer.

- **`Board`** — Renderiza as duas fileiras de criaturas em jogo (jogador e oponente), usando `BoardRow` duas vezes. Gerencia a interação de "selecionar atacante -> selecionar alvo" (estado local de seleção, ex: `selectedAttackerId`), chamando `attack()` quando um alvo válido é clicado.

- **`BoardRow`** — Renderiza uma lista de `BoardCardView` para um lado do board (não decide regras, só layout).

- **`BoardCardView`** — Uma criatura em jogo: nome, ataque/vida atuais (texto), indicação visual textual de "pode atacar" vs "cansado" (`summoningSickness` ou já atacou), estado de selecionado/alvo válido.

- **`Hand`** — Renderiza as cartas na mão do jogador ativo (lista de `CardView` clicáveis) e, para o oponente, apenas a contagem de cartas (sem conteúdo, viradas para baixo — texto tipo "Oponente: 4 cartas").

- **`CardView`** — Componente de apresentação genérico (reutilizado na mão e potencialmente em outros contextos): nome, custo de mana, ataque, vida, cor (via texto/classe CSS, sem imagem). Recebe `onClick` e estado `disabled` (ex: mana insuficiente).

- **`PlayerHUD`** — Agrupa `HealthBar` + `ManaBar` + nome do jogador para um dos lados (jogador ou oponente).

- **`HealthBar`** — Exibe HP atual/máximo de forma textual/visual simples (ex: "24/30").

- **`ManaBar`** — Exibe mana atual/máxima (ex: "3/10" ou cristais representados por texto/ícones simples sem arte).

- **`TurnIndicator`** — Mostra de quem é o turno, número do turno, e o botão "Encerrar Turno" (desabilitado quando não é o turno do jogador local).

- **`GameLog`** — Lista rolável de `GameLogEntry`, mostrando o histórico textual da partida ("Jogador 1 jogou Koopa Troopa", "Koopa Troopa atacou o rosto do Jogador 2 por 2").

- **`GameOverModal`** — Exibido quando `phase === "gameover"`: anuncia vencedor/perdedor, botão para voltar ao menu (`/`).

- **`CreateRoomForm` / `JoinRoomForm`** — Formulários simples do lobby (nome do jogador, código da sala).

- **`ConnectionStatus`** — Pequeno indicador de estado da conexão WebSocket (conectando / conectado / desconectado), só relevante no modo multiplayer.

---

## 8. Protocolo WebSocket (multiplayer)

### 8.1 Conexão

- URL: `ws://<host>/ws?roomId=<roomId>&playerId=<playerId>&name=<name>` (playerId gerado no cliente, ex: uuid salvo em memória da sessão do navegador).
- Envelope de mensagem (ambas as direções), sempre JSON:

```json
{ "type": "EVENT_NAME", "payload": { }, "ts": 1735900000000 }
```

### 8.2 Mensagens cliente -> servidor

| type | payload | descrição |
|---|---|---|
| `CREATE_ROOM` | `{ name }` | Cria uma nova sala; servidor responde com `ROOM_CREATED` |
| `JOIN_ROOM` | `{ roomId, name }` | Entra em uma sala existente; servidor responde `ROOM_JOINED` a todos na sala |
| `PLAY_CARD` | `{ cardInstanceId }` | Intenção de jogar uma carta da mão |
| `ATTACK` | `{ attackerInstanceId, targetInstanceId }` | `targetInstanceId` pode ser o literal `"face"` |
| `END_TURN` | `{}` | Encerra o turno do jogador |
| `PING` | `{}` | Heartbeat, servidor responde `PONG` |

### 8.3 Mensagens servidor -> cliente

| type | payload | descrição |
|---|---|---|
| `ROOM_CREATED` | `{ roomId }` | Confirma criação, cliente deve exibir o código para compartilhar |
| `ROOM_JOINED` | `{ roomId, players: [{id,name}] }` | Avisa quem está na sala (host + guest) |
| `GAME_START` | `{ gameState }` | Os 2 jogadores estão presentes; partida inicializada, snapshot completo enviado |
| `STATE_UPDATE` | `{ gameState }` | Enviado após **qualquer** ação válida (play/attack/end_turn); v1 sempre manda o snapshot inteiro (sem diffs — mais simples, aceitável para um jogo com estado pequeno) |
| `ACTION_ERROR` | `{ code, message }` | Ação inválida enviada pelo próprio cliente (ex: mana insuficiente) — enviado só a quem errou |
| `GAME_OVER` | `{ winnerId, reason }` | Partida terminou |
| `OPPONENT_DISCONNECTED` | `{}` | O outro jogador perdeu a conexão (v1: não há reconexão, a partida é encerrada/abandonada) |
| `PONG` | `{}` | Resposta a `PING` |

### 8.4 Autoridade e fluxo

1. Cliente nunca calcula o novo `GameState` sozinho no modo multiplayer — ele só envia a intenção (`PLAY_CARD`, `ATTACK`, `END_TURN`).
2. `Room.js` no servidor chama `applyAction(gameState, action)` do `packages/shared`.
3. Se `error` vier preenchido, servidor manda `ACTION_ERROR` só para quem enviou a ação errada (estado não muda, nada é retransmitido).
4. Se a ação for válida, servidor guarda o novo `gameState` na `Room` e faz broadcast de `STATE_UPDATE` para os dois jogadores da sala.
5. Simplificação consciente do v1: o `STATE_UPDATE` inclui a mão completa dos dois jogadores (inclusive a do oponente); o cliente é responsável por *não renderizar* o conteúdo da mão do oponente (só a contagem). Isso é uma limitação de segurança conhecida (um cliente adulterado poderia "ver" a mão do rival) — endurecer isso (ocultar hand do oponente no payload) é uma melhoria de v2, não bloqueia o v1.

---

## 9. IA da CPU (v1 — simples e determinística)

A IA roda **inteiramente no cliente**, chamando as mesmíssimas funções do engine (`applyAction`) usadas no multiplayer — ou seja, a CPU "joga" através da mesma validação de regras que um jogador humano, só que decidida por uma função ao invés de clique do usuário.

Função principal: `computeCpuTurn(gameState, cpuPlayerId) -> GameAction[]`, chamada assim que o turno passa a ser da CPU. As ações retornadas são aplicadas em sequência (uma a uma, com pequeno delay artificial entre elas puramente para a UI parecer natural — sem isso o turno da CPU seria instantâneo).

Algoritmo, por turno da CPU:

1. **Fase de jogar cartas** (loop guloso):
   - Enquanto houver, na mão da CPU, ao menos uma carta com `manaCost <= mana atual` e o board da CPU não estiver cheio (< 7 criaturas):
     - Escolher a carta jogável de **maior custo de mana** (heurística gulosa: gasta o máximo de mana possível a cada jogada, maximizando "presença no board" por turno).
     - Gerar ação `PLAY_CARD` para essa carta, aplicar, repetir o loop com a mana restante.
   - Parar quando nenhuma carta da mão couber na mana restante, ou a mão estiver vazia, ou o board estiver cheio.

2. **Fase de ataque** (para cada criatura da CPU que pode atacar, na ordem em que estão no board):
   - Se o oponente **não** tem nenhuma criatura no board: atacar `"face"` diretamente.
   - Se o oponente tem criaturas no board: procurar um alvo onde a CPU "vence a troca" — isto é, `attacker.attack >= target.health` (mata o alvo) **e** `target.attack < attacker.health` (a própria criatura sobrevive). Se existir, atacar esse alvo.
   - Se não existir troca favorável, a CPU ainda ataca o rosto do oponente por padrão (postura agressiva — no v1, com apenas cartas 1/1 e 2/2, as trocas são simples e previsíveis, então esse fallback é suficiente para um jogo minimamente desafiador).

3. **Encerrar turno**: gerar ação `END_TURN`.

Essa IA é intencionalmente simples (gulosa, sem lookahead, sem avaliação de posição) — o objetivo do v1 é ter um oponente que joga corretamente e oferece alguma resistência, não uma IA sofisticada. Melhorias (priorizar board control, considerar HP do jogador para decidir agressividade, etc.) ficam para uma versão futura.

---

## 10. Ordem de construção sugerida (milestones)

**M0 — Scaffolding do projeto**
Monorepo com workspaces configurado; `apps/web` (Next.js + TS, template padrão); `apps/server` (Node, servidor HTTP mínimo); `packages/shared` com `cards.json` (as 2 cartas) e `types.js` (JSDoc). Critério de pronto: os três pacotes instalam e rodam (`next dev`, `node src/index.js`) sem erro, mesmo sem funcionalidade real ainda.

**M1 — Engine de regras (sem UI)**
Implementar em `packages/shared/src/engine`: `deck.js` (`buildStandardDeck`, `shuffle`), `reducer.js` (`applyAction` cobrindo `PLAY_CARD`, `ATTACK`, `END_TURN`, checagem de vitória), `selectors.js` (helpers de consulta ao estado). Validar com um script simples de linha de comando ou testes unitários mínimos que simulam uma partida completa via chamadas diretas ao reducer, sem nenhuma UI. Critério de pronto: uma partida inteira (do setup ao `gameover`) pode ser simulada só com chamadas de função, no console.

**M2 — Modo vs CPU jogável de ponta a ponta**
Construir `useCpuGame` (hook que inicializa `GameState` local, expõe `playCard/attack/endTurn`, dispara `computeCpuTurn` automaticamente quando é a vez da CPU) e todos os componentes de UI da seção 7 (`GameScreen`, `Board`, `Hand`, `CardView`, `PlayerHUD`, `ManaBar`, `HealthBar`, `TurnIndicator`, `GameLog`, `GameOverModal`). Ligar tudo na rota `/play/cpu`, mais a Home (`/`) com o botão de entrada. Critério de pronto: dá para abrir o navegador, ir de `/`, jogar uma partida inteira contra a CPU até `gameover`, sem nenhum backend rodando.

**M3 — Servidor WebSocket multiplayer**
Implementar `apps/server`: `RoomManager` (criar/buscar/remover salas), `Room` (2 jogadores, guarda o `GameState` autoritativo, aplica ações via o mesmo `packages/shared`), `ws/server.js` + `ws/protocol.js` (mensagens da seção 8). Critério de pronto: dá para testar o protocolo manualmente (ex: com um cliente WS de linha de comando ou script) e simular uma partida completa entre duas conexões falsas.

**M4 — Cliente multiplayer**
Construir `useGameSocket` (mesma interface que `useCpuGame`, mas conectando ao servidor via `socketClient.ts`), páginas `/play/online` (lobby: criar/entrar em sala) e `/play/online/[roomId]` (jogo), reaproveitando o `GameScreen` e os componentes já feitos em M2. Critério de pronto: dois navegadores (ou duas abas) conseguem jogar uma partida completa um contra o outro pela rede.

**M5 — Robustez e polimento essencial**
Tratar erros de ação (`ACTION_ERROR` exibido ao usuário), desconexão do oponente (`OPPONENT_DISCONNECTED` -> mensagem + volta ao menu), estados de carregamento/erro do `ConnectionStatus`, checklist manual de QA cobrindo os casos-limite: board cheio (7 criaturas), deck vazio (sem fadiga), tentar jogar sem mana, tentar atacar duas vezes com a mesma criatura, tentar atacar no turno em que a criatura entrou (summoning sickness). Passe de estilo básico (CSS) para deixar a informação legível, ainda sem nenhuma arte/imagem.

**M6 — Opcional / stretch**
Página `/rules` estática; deploy (Vercel para `apps/web`, algum host Node com suporte a WebSocket persistente para `apps/server`, ex: Render/Fly.io/Railway); pequenas transições de UI (sem imagens).

---

## 11. Resumo do que fica fora do v1

Para reforçar o escopo: sem arte/imagens, sem mais que 2 cartas, sem habilidades de carta, sem taunt, sem feitiços, sem deck building, sem mulligan, sem fadiga, sem reconexão, sem persistência/histórico de partidas, sem contas de usuário. Tudo isso é candidato natural para v2, mas o objetivo deste documento é permitir chegar a um **jogo completo e jogável (CPU + multiplayer)** com o menor escopo possível.
