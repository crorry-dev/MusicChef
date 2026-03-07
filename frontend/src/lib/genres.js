/**
 * Genre definitions for the music quiz.
 * Each genre has a display name, Spotify search query, emoji, and region tag(s).
 */

export const REGIONS = {
  all: { name: 'Alle', emoji: '🌍' },
  europe: { name: 'Europa', emoji: '🇪🇺' },
  northamerica: { name: 'Nordamerika', emoji: '🇺🇸' },
  latinamerica: { name: 'Lateinamerika', emoji: '🌎' },
  africa: { name: 'Afrika', emoji: '🌍' },
  asia: { name: 'Asien', emoji: '🌏' },
  global: { name: 'International', emoji: '🌐' },
}

export const GENRES = {
  afrobeats:   { name: 'Afrobeats',    search: 'afrobeats',              emoji: '🪘', regions: ['africa'] },
  apresski:    { name: 'Après Ski',     search: 'apres ski party hits',   emoji: '⛷️', regions: ['europe'] },
  bachata:     { name: 'Bachata',       search: 'bachata',                emoji: '🩰', regions: ['latinamerica'] },
  blues:       { name: 'Blues',         search: 'blues',                  emoji: '🎺', regions: ['northamerica'] },
  bossanova:   { name: 'Bossa Nova',   search: 'bossa nova',             emoji: '🇧🇷', regions: ['latinamerica'] },
  country:     { name: 'Country',       search: 'country',               emoji: '🤠', regions: ['northamerica'] },
  dancehall:   { name: 'Dancehall',     search: 'dancehall',             emoji: '🇯🇲', regions: ['latinamerica'] },
  deutschrap:  { name: 'Deutschrap',    search: 'deutschrap',            emoji: '🇩🇪', regions: ['europe'] },
  deutschrock: { name: 'Deutsch-Rock',  search: 'deutsch rock',          emoji: '🇩🇪', regions: ['europe'] },
  disco:       { name: 'Disco',         search: 'disco',                 emoji: '🪩', regions: ['global'] },
  drumandbass: { name: 'Drum & Bass',   search: 'drum and bass',         emoji: '🥁', regions: ['europe'] },
  edm:         { name: 'EDM',           search: 'edm festival',          emoji: '🎆', regions: ['global'] },
  electronic:  { name: 'Electronic',    search: 'electronic dance',      emoji: '🎧', regions: ['global'] },
  folk:        { name: 'Folk',          search: 'folk music',             emoji: '🪕', regions: ['global'] },
  frenchrap:   { name: 'French Rap',    search: 'rap français',          emoji: '🇫🇷', regions: ['europe'] },
  funk:        { name: 'Funk',          search: 'funk',                  emoji: '🕺', regions: ['northamerica'] },
  gospel:      { name: 'Gospel',        search: 'gospel',                emoji: '🙏', regions: ['northamerica'] },
  grunge:      { name: 'Grunge',        search: 'grunge',                emoji: '🖤', regions: ['northamerica'] },
  hardrock:    { name: 'Hard Rock',     search: 'hard rock',             emoji: '🔊', regions: ['global'] },
  hiphop:      { name: 'Hip-Hop',       search: 'hip-hop',               emoji: '🎤', regions: ['global'] },
  house:       { name: 'House',         search: 'house music',           emoji: '🏠', regions: ['europe'] },
  indie:       { name: 'Indie',         search: 'indie rock alternative', emoji: '🌿', regions: ['global'] },
  jazz:        { name: 'Jazz',          search: 'jazz classics',         emoji: '🎷', regions: ['global'] },
  jpop:        { name: 'J-Pop',         search: 'jpop',                  emoji: '🇯🇵', regions: ['asia'] },
  klassik:     { name: 'Klassik',       search: 'classical music',       emoji: '🎻', regions: ['europe'] },
  kpop:        { name: 'K-Pop',         search: 'kpop',                  emoji: '🇰🇷', regions: ['asia'] },
  latin:       { name: 'Latin',         search: 'latin hits',            emoji: '💃', regions: ['latinamerica'] },
  lofi:        { name: 'Lo-Fi',         search: 'lofi beats',            emoji: '☕', regions: ['global'] },
  metal:       { name: 'Metal',         search: 'heavy metal',           emoji: '🤘', regions: ['global'] },
  neosoul:     { name: 'Neo-Soul',      search: 'neo soul',              emoji: '💜', regions: ['northamerica'] },
  pop:         { name: 'Pop',           search: 'pop hits',              emoji: '🎵', regions: ['global'] },
  punk:        { name: 'Punk',          search: 'punk rock',             emoji: '⚡', regions: ['northamerica', 'europe'] },
  reggae:      { name: 'Reggae',        search: 'reggae',                emoji: '🟢', regions: ['latinamerica'] },
  reggaeton:   { name: 'Reggaeton',     search: 'reggaeton',             emoji: '🌴', regions: ['latinamerica'] },
  rnb:         { name: 'R&B',           search: 'rnb soul',              emoji: '🎶', regions: ['northamerica'] },
  rock:        { name: 'Rock',          search: 'rock classics',         emoji: '🎸', regions: ['global'] },
  salsa:       { name: 'Salsa',         search: 'salsa',                 emoji: '🌶️', regions: ['latinamerica'] },
  schlager:    { name: 'Schlager',       search: 'schlager deutsch',      emoji: '🌸', regions: ['europe'] },
  soul:        { name: 'Soul',          search: 'soul classic',          emoji: '✨', regions: ['northamerica'] },
  soundtrack:  { name: 'Soundtrack',     search: 'movie soundtrack',     emoji: '🎬', regions: ['global'] },
  synthpop:    { name: 'Synthpop',       search: 'synthpop',             emoji: '🎹', regions: ['europe'] },
  techno:      { name: 'Techno',         search: 'techno',               emoji: '🔈', regions: ['europe'] },
  trance:      { name: 'Trance',         search: 'trance music',         emoji: '🌀', regions: ['europe'] },
  trapmusic:   { name: 'Trap',           search: 'trap music',           emoji: '🔥', regions: ['northamerica'] },
  ukrap:       { name: 'UK Rap',         search: 'uk grime rap',         emoji: '🇬🇧', regions: ['europe'] },
  usrap:       { name: 'US Rap',         search: 'american rap',         emoji: '🇺🇸', regions: ['northamerica'] },
  volkstümlich: { name: 'Volksmusik',   search: 'volksmusik',            emoji: '🏔️', regions: ['europe'] },
}

export function getGenresList(regionFilter = 'all') {
  return Object.entries(GENRES)
    .filter(([, g]) => regionFilter === 'all' || g.regions.includes(regionFilter))
    .map(([id, g]) => ({
      id,
      name: g.name,
      emoji: g.emoji,
    }))
}

export function getRegionsList() {
  return Object.entries(REGIONS).map(([id, r]) => ({
    id,
    name: r.name,
    emoji: r.emoji,
  }))
}
