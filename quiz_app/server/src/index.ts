import { WebSocketServer, WebSocket } from 'ws';
import {
  QuizPhase,
  ClientMessage,
  ServerMessage,
  QuizQuestion
} from '../../packages/shared_types/src/index';

// ─── QuizRoom — state machine (slide J3.06) ───────────────────────────────────

const QUESTIONS: QuizQuestion[] = [
  {
    id: 0,
    question: 'Quel protocole permet la communication bidirectionnelle en temps réel ?',
    choices: ['HTTP', 'WebSocket', 'FTP', 'SMTP'],
    correctIndex: 1,
    duration: 20
  },
  {
    id: 1,
    question: 'Quel code HTTP indique le passage en WebSocket ?',
    choices: ['200 OK', '301 Redirect', '101 Switching Protocols', '404 Not Found'],
    correctIndex: 2,
    duration: 20
  },
  {
    id: 2,
    question: 'Quelle méthode envoie un message via WebSocket côté browser ?',
    choices: ['ws.emit()', 'ws.send()', 'ws.push()', 'ws.post()'],
    correctIndex: 1,
    duration: 20
  }
];

class QuizRoom {
  code: string;
  phase: QuizPhase;
  players: Map<WebSocket, { name: string; score: number }>;
  host: WebSocket | null;
  questions: QuizQuestion[];
  currentQ: number;
  answers: Map<WebSocket, number>;
  timer: NodeJS.Timeout | null;
  tickTimer: NodeJS.Timeout | null;
  remaining: number;

  constructor(code: string) {
    this.code = code;
    this.phase = 'lobby';
    this.players = new Map();
    this.host = null;
    this.questions = QUESTIONS;
    this.currentQ = 0;
    this.answers = new Map();
    this.timer = null;
    this.tickTimer = null;
    this.remaining = 0;
  }

  // lobby → question (slide J3.06)
  start() {
    this.phase = 'question';
    this.answers = new Map();
    this.remaining = this.questions[this.currentQ].duration;

    const q = this.questions[this.currentQ];
    this.broadcastAll({
      type: 'question',
      question: q,
      questionIndex: this.currentQ,
      total: this.questions.length
    });

    this.startTimer();
  }

  // results → question | leaderboard (slide J3.06)
  nextQ() {
    this.currentQ++;
    if (this.currentQ < this.questions.length) {
      this.phase = 'question';
      this.answers = new Map();
      this.remaining = this.questions[this.currentQ].duration;
      const q = this.questions[this.currentQ];
      this.broadcastAll({
        type: 'question',
        question: q,
        questionIndex: this.currentQ,
        total: this.questions.length
      });
      this.startTimer();
    } else {
      this.phase = 'leaderboard';
      this.broadcastAll({
        type: 'leaderboard',
        scores: this.getScores()
      });
    }
  }

  // score = 1000 * remaining/total (slide J3.04 & J3.06)
  answer(ws: WebSocket, choiceIndex: number) {
    if (this.phase !== 'question') return;
    if (this.answers.has(ws)) return; // déjà répondu

    const player = this.players.get(ws);
    if (!player) return;

    const q = this.questions[this.currentQ];
    const correct = choiceIndex === q.correctIndex;
    let gained = 0;

    if (correct) {
      gained = Math.round(1000 * (this.remaining / q.duration));
      player.score += gained;
    }

    this.answers.set(ws, choiceIndex);

    // Feedback immédiat au joueur (slide J3.08)
    this.send(ws, {
      type: 'answer-ack',
      correct,
      score: player.score
    });

    // Si tout le monde a répondu → on passe aux résultats
    if (this.answers.size === this.players.size) {
      this.timeUp();
    }
  }

  // broadcast countdown (slide J3.06)
  tick() {
    this.remaining--;
    this.broadcastAll({ type: 'tick', remaining: this.remaining });
    if (this.remaining <= 0) {
      this.timeUp();
    }
  }

  // question → results (slide J3.06)
  timeUp() {
    this.clearTimers();
    this.phase = 'results';
    const q = this.questions[this.currentQ];
    this.broadcastAll({
      type: 'results',
      correctIndex: q.correctIndex,
      scores: this.getScores()
    });

    // Notifier le host qu'il peut passer à la suite
    if (this.host) {
      this.send(this.host, {
        type: 'phase',
        phase: 'results'
      });
    }
  }

  startTimer() {
    this.clearTimers();
    this.tickTimer = setInterval(() => this.tick(), 1000);
  }

  clearTimers() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.timer) clearTimeout(this.timer);
  }

  broadcastPlayers() {
    const playerNames = Array.from(this.players.values()).map(p => p.name);
    this.broadcastAll({ type: 'lobby', players: playerNames, quizCode: this.code });
    if (this.host) {
      this.send(this.host, { type: 'lobby', players: playerNames, quizCode: this.code });
    }
  }

  broadcastAll(msg: ServerMessage) {
    const data = JSON.stringify(msg);
    // Broadcast aux joueurs
    this.players.forEach((_, ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });
    // Broadcast au host aussi (pour les scores etc)
    if (this.host && this.host.readyState === WebSocket.OPEN) {
      this.host.send(data);
    }
  }

  send(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  getScores(): { name: string; score: number }[] {
    return Array.from(this.players.values())
      .sort((a, b) => b.score - a.score);
  }

  removePlayer(ws: WebSocket) {
    this.players.delete(ws);
    this.answers.delete(ws);
  }
}

// ─── Serveur WebSocket (stack: Node.js + ws — slides J1.12 & J3.03) ──────────

const wss = new WebSocketServer({ port: 8080 });
const rooms = new Map<string, QuizRoom>();

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on('connection', (ws) => {
  console.log('Client connecté');
  let currentRoom: QuizRoom | null = null;
  let isHost = false;

  ws.on('message', (raw) => {
    const msg: ClientMessage = JSON.parse(raw.toString());

    switch (msg.type) {

      // Un joueur rejoint une room
      case 'join': {
        const room = rooms.get(msg.quizCode);
        if (!room) {
          (ws as any).send(JSON.stringify({ type: 'error', message: 'Code invalide' }));
          return;
        }
        if (room.phase !== 'lobby') {
          (ws as any).send(JSON.stringify({ type: 'error', message: 'Quiz déjà commencé' }));
          return;
        }
        room.players.set(ws, { name: msg.name, score: 0 });
        currentRoom = room;
        isHost = false;
        room.broadcastPlayers();
        break;
      }

      // Le host lance le quiz
      case 'host:start': {
        if (!currentRoom || !isHost) return;
        if (currentRoom.phase !== 'lobby') return;
        currentRoom.start();
        break;
      }

      // Le host passe à la question suivante
      case 'host:next': {
        if (!currentRoom || !isHost) return;
        currentRoom.nextQ();
        break;
      }

      // Un joueur répond
      case 'answer': {
        if (!currentRoom) return;
        currentRoom.answer(ws, msg.choiceIndex);
        break;
      }
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      if (isHost) {
        // Host déconnecté
        rooms.delete(currentRoom.code);
        currentRoom.clearTimers();
      } else {
        currentRoom.removePlayer(ws);
        currentRoom.broadcastPlayers();
      }
    }
    console.log('Client déconnecté');
  });

  (ws as any).createRoom = () => {
    const code = generateCode();
    const room = new QuizRoom(code);
    room.host = ws;
    rooms.set(code, room);
    currentRoom = room;
    isHost = true;
    ws.send(JSON.stringify({ type: 'lobby', players: [], quizCode: code }));
  };
});

// Écouter un message spécial 'host:create' pour créer une room
const originalOn = wss.on.bind(wss);
wss.on('connection', (ws) => {
  ws.once('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'host:create') {
        const code = generateCode();
        const room = new QuizRoom(code);
        room.host = ws;
        rooms.set(code, room);

        ws.send(JSON.stringify({ type: 'lobby', players: [], quizCode: code }));

        // Re-brancher le vrai handler de messages
        ws.on('message', (raw2) => {
          const m: ClientMessage = JSON.parse(raw2.toString());
          let currentRoom = room;
          switch (m.type) {
            case 'host:start':
              currentRoom.start();
              break;
            case 'host:next':
              currentRoom.nextQ();
              break;
          }
        });

        ws.on('close', () => {
          rooms.delete(code);
          room.clearTimers();
        });
      }
    } catch {
      // ignore
    }
  });
});

console.log('🚀 Serveur WebSocket démarré sur ws://localhost:8080');
