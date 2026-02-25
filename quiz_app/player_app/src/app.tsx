import { useState, useRef } from 'react'
import { ServerMessage, QuizQuestion } from 'shared_types'

// ─── Écrans du Joueur (slide J3.08) ──────────────────────────────────────────
// 1. Join — code + pseudo
// 2. Lobby — "En attente..."
// 3. Question — 4 boutons couleur
// 4. Feedback — correct / incorrect
// 5. Score — classement perso

type Screen = 'join' | 'lobby' | 'question' | 'feedback' | 'score' | 'leaderboard'

export default function App() {
  const ws = useRef<WebSocket | null>(null)
  const [screen, setScreen] = useState<Screen>('join')
  const [quizCode, setQuizCode] = useState('')
  const [name, setName] = useState('')
  const [question, setQuestion] = useState<QuizQuestion | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [total, setTotal] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [lastCorrect, setLastCorrect] = useState(false)
  const [myScore, setMyScore] = useState(0)
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number }[]>([])

  // Écran 1 : Join — code + pseudo (slide J3.08)
  function join() {
    if (!quizCode.trim() || !name.trim()) return

    const socket = new WebSocket('ws://localhost:8080')
    ws.current = socket

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        quizCode: quizCode.trim().toUpperCase(),
        name: name.trim()
      }))
    }

    socket.onmessage = (e) => {
      const msg: ServerMessage = JSON.parse(e.data)

      switch (msg.type) {

        // Écran 2 : Lobby — "En attente..." (slide J3.08)
        case 'lobby':
          setScreen('lobby')
          break

        // Écran 3 : Question — 4 boutons couleur (slide J3.08)
        case 'question':
          setQuestion(msg.question)
          setQuestionIndex(msg.questionIndex)
          setTotal(msg.total)
          setRemaining(msg.question.duration)
          setAnswered(false)
          setScreen('question')
          break

        case 'tick':
          setRemaining(msg.remaining)
          break

        // Écran 4 : Feedback — correct / incorrect (slide J3.08)
        case 'answer-ack':
          setLastCorrect(msg.correct)
          setMyScore(msg.score)
          setScreen('feedback')
          break

        // Résultats → Score perso (slide J3.08)
        case 'results':
          setScreen('score')
          break

        // Écran 5 : Leaderboard
        case 'leaderboard':
          setLeaderboard(msg.scores)
          setScreen('leaderboard')
          break

        case 'error':
          alert(msg.message)
          break
      }
    }

    socket.onclose = () => {
      setScreen('join')
    }
  }

  // Répondre à une question
  function answer(choiceIndex: number) {
    if (answered) return  // Désactiver après réponse — slide J3.08
    setAnswered(true)
    ws.current?.send(JSON.stringify({
      type: 'answer',
      questionId: question!.id,
      choiceIndex
    }))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // Écran 1 : Join
  if (screen === 'join') {
    return (
      <div className="app">
        <h1>🎮 Rejoindre le quiz</h1>
        <input
          placeholder="CODE DU QUIZ"
          value={quizCode}
          onChange={e => setQuizCode(e.target.value.toUpperCase())}
          maxLength={8}
        />
        <input
          placeholder="Ton pseudo"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
        />
        <button className="primary" onClick={join}>Rejoindre</button>
      </div>
    )
  }

  // Écran 2 : Lobby
  if (screen === 'lobby') {
    return (
      <div className="app">
        <h1>✅ Connecté !</h1>
        <h2>Bienvenue, {name}</h2>
        <p className="waiting">En attente du lancement...</p>
      </div>
    )
  }

  // Écran 3 : Question — 4 boutons A B C D (slide J3.08)
  if (screen === 'question' && question) {
    const labels = ['A', 'B', 'C', 'D'] as const
    return (
      <div className="app">
        <h3>Question {questionIndex + 1} / {total}</h3>
        <div className="timer">{remaining}s</div>
        <h2>{question.question}</h2>
        {/* Désactiver les boutons après la réponse — slide J3.08 */}
        <div className="choices">
          {question.choices.map((choice, i) => (
            <button
              key={i}
              className={`choice-btn ${labels[i]}`}
              onClick={() => answer(i)}
              disabled={answered}
            >
              {labels[i]}. {choice}
            </button>
          ))}
        </div>
        {answered && <p style={{ marginTop: '1rem', color: '#aaa' }}>Réponse envoyée...</p>}
      </div>
    )
  }

  // Écran 4 : Feedback — correct / incorrect (slide J3.08)
  if (screen === 'feedback') {
    return (
      <div className="app">
        <h2>Question {questionIndex + 1} / {total}</h2>
        <div className={`feedback ${lastCorrect ? 'correct' : 'wrong'}`}>
          {lastCorrect ? '✅ Correct !' : '❌ Raté !'}
        </div>
        <div className="my-score">{myScore} pts</div>
        <p className="waiting">En attente des résultats...</p>
      </div>
    )
  }

  // Écran 5 : Score perso (slide J3.08)
  if (screen === 'score') {
    return (
      <div className="app">
        <h1>📊 Résultats</h1>
        <div className="my-score">{myScore} pts</div>
        <p className="waiting">En attente de la prochaine question...</p>
      </div>
    )
  }

  // Leaderboard final
  if (screen === 'leaderboard') {
    const myRank = leaderboard.findIndex(s => s.name === name) + 1
    return (
      <div className="app">
        <h1>🏆 Leaderboard final</h1>
        <p>Ton classement : <strong>#{myRank}</strong></p>
        <div className="my-score">{myScore} pts</div>
        <ul style={{ listStyle: 'none', marginTop: '1rem', width: '100%' }}>
          {leaderboard.map((s, i) => (
            <li key={s.name} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              background: s.name === name ? '#2e7d32' : '#16213e',
              borderRadius: '8px',
              marginBottom: '0.5rem'
            }}>
              <span>{i + 1}. {s.name}</span>
              <span style={{ color: '#f5c518', fontWeight: 'bold' }}>{s.score} pts</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return null
}
