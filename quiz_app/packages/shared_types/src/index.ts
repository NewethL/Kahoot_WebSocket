// shared/types.ts — le contrat client ↔ serveur

export type QuizPhase =
  | 'lobby'
  | 'question'
  | 'results'
  | 'leaderboard'
  | 'ended'

export type ClientMessage =
  | { type: 'join'; quizCode: string; name: string }
  | { type: 'answer'; questionId: number; choiceIndex: number }
  | { type: 'host:start' }
  | { type: 'host:next' }

export type QuizQuestion = {
  id: number
  question: string
  choices: string[]
  correctIndex: number
  duration: number
}

export type ServerMessage =
  | { type: 'phase'; phase: QuizPhase }
  | { type: 'lobby'; players: string[]; quizCode: string }
  | { type: 'question'; question: QuizQuestion; questionIndex: number; total: number }
  | { type: 'tick'; remaining: number }
  | { type: 'results'; correctIndex: number; scores: { name: string; score: number }[] }
  | { type: 'leaderboard'; scores: { name: string; score: number }[] }
  | { type: 'answer-ack'; correct: boolean; score: number }
  | { type: 'error'; message: string }
