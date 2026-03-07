/**
 * Quiz engine – runs entirely in the browser.
 * Manages quiz state, answer checking, scoring (incl. speed bonus),
 * multiple-choice generation, and history via localStorage.
 */
import { GENRES } from './genres'
import {
  fetchTracksForGenre,
  fetchTracksForPlaylist,
  fetchRandomTracks,
} from './spotify-api'

/* ═══════════════════════════════════════════════════════════
   Answer Checking
   ═══════════════════════════════════════════════════════════ */
function normalize(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function checkAnswer(userAnswer, correctAnswer) {
  const userNorm = normalize(userAnswer)
  const correctNorm = normalize(correctAnswer)

  if (!userNorm) return false
  if (userNorm === correctNorm) return true
  if (userNorm.includes(correctNorm) || correctNorm.includes(userNorm)) return true

  const userWords = new Set(userNorm.split(' ').filter((w) => w.length > 2))
  const correctWords = new Set(correctNorm.split(' ').filter((w) => w.length > 2))

  if (userWords.size > 0 && correctWords.size > 0) {
    let overlap = 0
    for (const w of userWords) {
      if (correctWords.has(w)) overlap++
    }
    if (overlap / Math.max(correctWords.size, 1) >= 0.6) return true
  }

  return false
}

export function checkYear(userYear, correctYear) {
  if (correctYear == null) return false
  const parsed = parseInt(String(userYear).trim(), 10)
  if (Number.isNaN(parsed)) return false
  return parsed === correctYear
}

/* ═══════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════ */
export const GUESS_FIELDS = {
  artist: { label: 'Interpret', icon: 'mic' },
  title: { label: 'Titel', icon: 'music' },
  year: { label: 'Jahr', icon: 'calendar' },
}

export const DEFAULT_GUESS_FIELDS = ['artist', 'title', 'year']

/* ── Speed Bonus Tiers ────────────────────────────────────── */
const SPEED_TIERS = [
  { maxSeconds: 5, multiplier: 2.0, label: 'Blitzschnell!' },
  { maxSeconds: 10, multiplier: 1.5, label: 'Schnell!' },
  { maxSeconds: 20, multiplier: 1.2, label: 'Gut!' },
  { maxSeconds: Infinity, multiplier: 1.0, label: '' },
]

export function getSpeedTier(elapsedSeconds) {
  for (const tier of SPEED_TIERS) {
    if (elapsedSeconds <= tier.maxSeconds) return tier
  }
  return SPEED_TIERS[SPEED_TIERS.length - 1]
}

/* ═══════════════════════════════════════════════════════════
   Multiple-Choice Generation
   ═══════════════════════════════════════════════════════════ */
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickDistractors(pool, correct, count = 3) {
  const normCorrect = normalize(correct)
  const candidates = pool.filter((v) => normalize(v) !== normCorrect && v.trim().length > 0)
  const unique = [...new Set(candidates)]
  return shuffleArray(unique).slice(0, count)
}

function generateYearDistractors(correctYear) {
  if (correctYear == null) return ['2000', '2010', '2020']
  const offsets = shuffleArray([-5, -3, -2, -1, 1, 2, 3, 5, 7, 10, -10])
  const distractors = []
  const seen = new Set([correctYear])
  for (const o of offsets) {
    const y = correctYear + o
    if (y >= 1950 && y <= new Date().getFullYear() && !seen.has(y)) {
      distractors.push(String(y))
      seen.add(y)
      if (distractors.length >= 3) break
    }
  }
  while (distractors.length < 3) {
    const y = 1980 + Math.floor(Math.random() * 40)
    if (!seen.has(y)) {
      distractors.push(String(y))
      seen.add(y)
    }
  }
  return distractors
}

/**
 * Generate 4 multiple-choice options per guess field for a given track.
 * Returns { artist: [...], title: [...], year: [...] } – each array has 4 shuffled strings.
 */
export function generateChoices(track, allTracks, guessFields) {
  const choices = {}

  for (const field of guessFields) {
    let correct
    let distractors

    if (field === 'artist') {
      correct = track.artist
      const pool = allTracks.map((t) => t.artist)
      distractors = pickDistractors(pool, correct, 3)
    } else if (field === 'title') {
      correct = track.title
      const pool = allTracks.map((t) => t.title)
      distractors = pickDistractors(pool, correct, 3)
    } else if (field === 'year') {
      correct = String(track.year ?? '')
      distractors = generateYearDistractors(track.year)
    } else {
      continue
    }

    /* Ensure we have exactly 3 distractors – pad with generic if needed */
    while (distractors.length < 3) {
      distractors.push(field === 'year' ? '2015' : '???')
    }

    choices[field] = shuffleArray([correct, ...distractors])
  }

  return choices
}

/* ═══════════════════════════════════════════════════════════
   Quiz Lifecycle
   ═══════════════════════════════════════════════════════════ */
export async function createQuiz({
  mode,
  genre,
  playlistId,
  count = 10,
  guessFields,
  yearRange = null,
  inputMode = 'freetext',
  speedBonus = false,
  revealCover = false,
}) {
  const fields =
    Array.isArray(guessFields) && guessFields.length > 0
      ? guessFields
      : DEFAULT_GUESS_FIELDS
  const targetCount = Math.min(count, 1000)
  let tracks

  if (mode === 'playlist' && playlistId) {
    tracks = await fetchTracksForPlaylist(playlistId, targetCount * 3)
  } else if (mode === 'random' || genre === 'random') {
    tracks = await fetchRandomTracks(targetCount * 3, yearRange)
  } else {
    const genreInfo = GENRES[genre] ?? { search: genre }
    tracks = await fetchTracksForGenre(genreInfo.search, targetCount * 3, yearRange)
  }

  let selected = tracks
  if (fields.includes('year')) {
    const withYear = tracks.filter((t) => t.year != null)
    const withoutYear = tracks.filter((t) => t.year == null)
    selected = [...withYear, ...withoutYear]
  }
  selected = selected.slice(0, targetCount)

  if (selected.length === 0) {
    throw new Error('Keine Tracks für diese Auswahl gefunden.')
  }

  const pointsPerField = Math.round(100 / fields.length)

  /* Pre-generate choices for every track when in choice mode */
  const allChoices =
    inputMode === 'choice'
      ? selected.map((t) => generateChoices(t, tracks, fields))
      : null

  return {
    id: crypto.randomUUID(),
    genre: genre ?? null,
    mode,
    playlistId: playlistId ?? null,
    guessFields: fields,
    pointsPerField,
    inputMode,
    speedBonus,
    revealCover,
    tracks: selected,
    allChoices,
    currentIndex: 0,
    answers: [],
    score: 0,
    totalQuestions: selected.length,
  }
}

/* ═══════════════════════════════════════════════════════════
   Submit Answer
   ═══════════════════════════════════════════════════════════ */
export function submitQuizAnswer(quiz, userAnswers = {}, elapsedSeconds = null) {
  const track = quiz.tracks[quiz.currentIndex]
  if (!track) throw new Error('Quiz bereits beendet')

  const fields = quiz.guessFields ?? DEFAULT_GUESS_FIELDS
  const ppf = quiz.pointsPerField ?? Math.round(100 / fields.length)

  const fieldResults = {}
  let rawPoints = 0

  for (const field of fields) {
    const userVal = userAnswers[field] ?? ''
    let correct = false

    if (field === 'artist') {
      correct = checkAnswer(userVal, track.artist) || checkAnswer(userVal, track.all_artists)
    } else if (field === 'title') {
      correct = checkAnswer(userVal, track.title)
    } else if (field === 'year') {
      correct = checkYear(userVal, track.year)
    }

    fieldResults[field] = { correct, userValue: userVal }
    if (correct) rawPoints += ppf
  }

  /* Speed bonus */
  let speedMultiplier = 1.0
  let speedLabel = ''
  if (quiz.speedBonus && elapsedSeconds != null && rawPoints > 0) {
    const tier = getSpeedTier(elapsedSeconds)
    speedMultiplier = tier.multiplier
    speedLabel = tier.label
  }

  const points = Math.round(rawPoints * speedMultiplier)

  const answer = {
    track,
    fieldResults,
    points,
    rawPoints,
    speedMultiplier,
    user_artist: userAnswers.artist ?? '',
    user_title: userAnswers.title ?? '',
    user_year: userAnswers.year ?? '',
    artist_correct: fieldResults.artist?.correct ?? false,
    title_correct: fieldResults.title?.correct ?? false,
    year_correct: fieldResults.year?.correct ?? false,
  }

  const updatedQuiz = {
    ...quiz,
    score: quiz.score + points,
    currentIndex: quiz.currentIndex + 1,
    answers: [...quiz.answers, answer],
  }

  const finished = updatedQuiz.currentIndex >= updatedQuiz.totalQuestions

  const response = {
    fieldResults,
    points,
    rawPoints,
    speedMultiplier,
    speedLabel,
    total_score: updatedQuiz.score,
    correct_artist: track.artist,
    correct_title: track.title,
    correct_year: track.year,
    artist_correct: fieldResults.artist?.correct ?? false,
    title_correct: fieldResults.title?.correct ?? false,
    year_correct: fieldResults.year?.correct ?? false,
    finished,
  }

  if (!finished) {
    const nextTrack = updatedQuiz.tracks[updatedQuiz.currentIndex]
    response.next_question = {
      index: updatedQuiz.currentIndex,
      trackId: nextTrack.id,
      preview_url: nextTrack.preview_url,
      image: nextTrack.image,
      question_number: updatedQuiz.currentIndex + 1,
    }
    if (updatedQuiz.allChoices) {
      response.next_question.choices = updatedQuiz.allChoices[updatedQuiz.currentIndex]
    }
  } else {
    response.results = {
      quiz_id: updatedQuiz.id,
      genre: updatedQuiz.genre,
      mode: updatedQuiz.mode,
      guessFields: updatedQuiz.guessFields,
      score: updatedQuiz.score,
      total_questions: updatedQuiz.totalQuestions,
      max_score: updatedQuiz.totalQuestions * Math.round(100 * (quiz.speedBonus ? 2.0 : 1.0)),
      answers: updatedQuiz.answers,
    }
    saveQuizToHistory(updatedQuiz)
  }

  return { quiz: updatedQuiz, response }
}

/* ═══════════════════════════════════════════════════════════
   History (localStorage)
   ═══════════════════════════════════════════════════════════ */
const HISTORY_KEY = 'musicchef_history'
const MAX_HISTORY = 50

export function getQuizHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQuizToHistory(quiz) {
  const history = getQuizHistory()
  history.push({
    quiz_id: quiz.id,
    genre: quiz.genre,
    mode: quiz.mode,
    guessFields: quiz.guessFields,
    score: quiz.score,
    total_questions: quiz.totalQuestions,
    max_score: quiz.totalQuestions * Math.round(100 * (quiz.speedBonus ? 2.0 : 1.0)),
    answers: quiz.answers,
    played_at: new Date().toISOString(),
  })

  const trimmed = history.slice(-MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
}

export function clearQuizHistory() {
  localStorage.removeItem(HISTORY_KEY)
}
