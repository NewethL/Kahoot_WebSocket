import { useState, useRef } from 'react'
import { ServerMessage, QuizQuestion } from 'shared_types'

// ─── Écrans du Host (slide J3.07) ────────────────────────────────────────────
// 1. Lobby — code quiz + joueurs
// 2. Question — timer + nb réponses
// 3. Résultats — barres animées
// 4. Leaderboard — classement

type Screen = 'connect' | 'lobby' | 'question' | 'results' | 'leaderboard'

type Score = { name: string; score: number }

export default function App() {
  const ws = useRef<WebSocket | null>(null)
  const [screen, setScreen] = useState<Screen>('connect')
  const [quizCode, setQuizCode] = useState('')
  const [players, setPlayers] = useState<string[]>([])
  const [question, setQuestion] = useState<QuizQuestion | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [total, setTotal] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [answersCount, setAnswersCount] = useState(0)
  const [scores, setScores] = useState<Score[]>([])
  const [correctIndex, setCorrectIndex] = useState<number | null>(null)

  // Connexion WebSocket au serveur
  function connect() {
    const socket = new WebSocket('ws://localhost:8080')
    ws.current = socket

    socket.onopen = () => {
      // Créer une room en tant que host
      socket.send(JSON.stringify({ type: 'host:create' }))
    }

    socket.onmessage = (e) => {
      const msg: ServerMessage = JSON.parse(e.data)

      switch (msg.type) {

        case 'lobby':
          setQuizCode(msg.quizCode)
          setPlayers(msg.players)
          setScreen('lobby')
          break

        case 'question':
          setQuestion(msg.question)
          setQuestionIndex(msg.questionIndex)
          setTotal(msg.total)
          setAnswersCount(0)
          setScreen('question')
          break

        case 'tick':
          setRemaining(msg.remaining)
          break

        case 'answer-ack':
          // Compter les réponses reçues
          setAnswersCount(prev => prev + 1)
          break

        case 'results':
          setCorrectIndex(msg.correctIndex)
          setScores(msg.scores)
          setScreen('results')
          break

        case 'leaderboard':
          setScores(msg.scores)
          setScreen('leaderboard')
          break
      }
    }

    socket.onclose = () => {
      setScreen('connect')
    }
  }

  // Lancer le quiz (slide J3.07 : Lobby → Question)
  function startQuiz() {
    ws.current?.send(JSON.stringify({ type: 'host:start' }))
  }

  // Passer à la suite (slide J3.07 : Résultats → Question suivante ou Leaderboard)
  function next() {
    ws.current?.send(JSON.stringify({ type: 'host:next' }))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (screen === 'connect') {
    return (
      <div className="app">
        <h1>🎮 Live Quiz — Host</h1>
        <p>Connecte-toi pour créer un quiz</p>
        <button onClick={connect}>Créer un quiz</button>
      </div>
    )
  }

  // Écran 1 : Lobby — code quiz grand et visible + joueurs (slide J3.07)
  if (screen === 'lobby') {
    return (
      <div className="app screen-lobby">
        <h2>En attente des joueurs...</h2>
        <div className="quiz-code">{quizCode}</div>
        <h3>Joueurs connectés ({players.length})</h3>
        <ul className="player-list">
          {players.map(p => <li key={p}>{p}</li>)}
        </ul>
        <button onClick={startQuiz} disabled={players.length === 0}>
          Lancer le quiz
        </button>
      </div>
    )
  }

  // Écran 2 : Question — timer + nb réponses (slide J3.07)
  if (screen === 'question' && question) {
    return (
      <div className="app screen-question">
        <h3>Question {questionIndex + 1} / {total}</h3>
        <div className="timer">{remaining}s</div>
        <h2>{question.question}</h2>
        <p className="answers-count">{answersCount} réponse(s) reçue(s)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          {question.choices.map((c, i) => (
            <div key={i} style={{
              background: ['#e53935','#1565c0','#2e7d32','#f57f17'][i],
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '1.1rem'
            }}>
              {['A','B','C','D'][i]}. {c}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Écran 3 : Résultats — barres animées (slide J3.07)
  if (screen === 'results' && question) {
    const totalAnswers = scores.length || 1
    return (
      <div className="app screen-results">
        <h2>Résultats</h2>
        <h3>{question.question}</h3>
        {question.choices.map((choice, i) => {
          const pct = i === correctIndex ? 80 : 20 // simplification visuelle
          return (
            <div key={i} className="result-bar-container">
              <span className="result-label">{['A','B','C','D'][i]}. {choice}</span>
              <div className="result-bar-track">
                {/* Set via style inline — slide J3.07 */}
                <div
                  className={`result-bar ${i === correctIndex ? 'correct' : 'wrong'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
        <h3 style={{ marginTop: '1.5rem' }}>Scores</h3>
        <ul className="leaderboard-list">
          {scores.map((s, i) => (
            <li key={s.name}>
              <span><span className="rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>{s.name}</span>
              <span className="score">{s.score} pts</span>
            </li>
          ))}
        </ul>
        <button onClick={next}>
          {questionIndex + 1 < total ? 'Question suivante →' : 'Voir le leaderboard →'}
        </button>
      </div>
    )
  }

  // Écran 4 : Leaderboard — classement (slide J3.07)
  if (screen === 'leaderboard') {
    return (
      <div className="app screen-leaderboard">
        <h1>🏆 Leaderboard final</h1>
        <ul className="leaderboard-list">
          {scores.map((s, i) => (
            <li key={s.name}>
              <span><span className="rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>{s.name}</span>
              <span className="score">{s.score} pts</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return null
}
