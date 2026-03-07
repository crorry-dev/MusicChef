/**
 * Genre definitions for the music quiz.
 * Each genre has a display name, Spotify search query, icon ID, and region tag(s).
 * Icons reference SVG component names from ../lib/icons.jsx
 */

export const REGIONS = {
  all:          { name: 'Alle',           icon: 'globe' },
  europe:       { name: 'Europa',         icon: 'globe-europe' },
  northamerica: { name: 'Nordamerika',    icon: 'globe-americas' },
  latinamerica: { name: 'Lateinamerika',  icon: 'globe-americas' },
  africa:       { name: 'Afrika',         icon: 'globe-africa' },
  asia:         { name: 'Asien',          icon: 'globe-asia' },
  global:       { name: 'International',  icon: 'globe' },
}

export const GENRES = {
  /* ── Afrika ──────────────────────────────────────────────── */
  afrobeats:     { name: 'Afrobeats',       search: 'afrobeats',                icon: 'drum',     regions: ['africa'] },
  afropop:       { name: 'Afro-Pop',        search: 'afro pop',                 icon: 'music',    regions: ['africa'] },
  amapiano:      { name: 'Amapiano',        search: 'amapiano',                 icon: 'piano',    regions: ['africa'] },
  highlife:      { name: 'Highlife',        search: 'highlife music',            icon: 'sun',      regions: ['africa'] },
  afrofusion:    { name: 'Afro-Fusion',     search: 'afro fusion',              icon: 'sparkles', regions: ['africa'] },
  bongo:         { name: 'Bongo Flava',     search: 'bongo flava',              icon: 'drum',     regions: ['africa'] },
  afrohouse:     { name: 'Afro House',      search: 'afro house',               icon: 'waves',    regions: ['africa'] },
  soukous:       { name: 'Soukous',         search: 'soukous',                  icon: 'guitar',   regions: ['africa'] },

  /* ── Asien ───────────────────────────────────────────────── */
  jpop:          { name: 'J-Pop',           search: 'jpop',                     icon: 'sparkles', regions: ['asia'] },
  kpop:          { name: 'K-Pop',           search: 'kpop',                     icon: 'star',     regions: ['asia'] },
  cpop:          { name: 'C-Pop',           search: 'cpop mandopop',            icon: 'music',    regions: ['asia'] },
  bollywood:     { name: 'Bollywood',       search: 'bollywood hits',           icon: 'film',     regions: ['asia'] },
  anime:         { name: 'Anime',           search: 'anime opening songs',      icon: 'sparkles', regions: ['asia'] },
  citypop:       { name: 'City Pop',        search: 'japanese city pop',        icon: 'sun',      regions: ['asia'] },
  cantopop:      { name: 'Cantopop',        search: 'cantopop',                 icon: 'mic',      regions: ['asia'] },
  tpop:          { name: 'T-Pop',           search: 'thai pop',                 icon: 'music',    regions: ['asia'] },

  /* ── Europa ──────────────────────────────────────────────── */
  apresski:      { name: 'Après Ski',       search: 'apres ski party hits',     icon: 'mountain', regions: ['europe'] },
  deutschrap:    { name: 'Deutschrap',      search: 'deutschrap',               icon: 'mic',      regions: ['europe'] },
  deutschrock:   { name: 'Deutsch-Rock',    search: 'deutsch rock',             icon: 'guitar',   regions: ['europe'] },
  deutschpop:    { name: 'Deutsch-Pop',     search: 'deutsch pop hits',         icon: 'music',    regions: ['europe'] },
  drumandbass:   { name: 'Drum & Bass',     search: 'drum and bass',            icon: 'drum',     regions: ['europe'] },
  frenchrap:     { name: 'French Rap',      search: 'rap français',             icon: 'mic',      regions: ['europe'] },
  frenchpop:     { name: 'French Pop',      search: 'chanson française pop',    icon: 'music',    regions: ['europe'] },
  house:         { name: 'House',           search: 'house music',              icon: 'headphones', regions: ['europe'] },
  italodisco:    { name: 'Italo Disco',     search: 'italo disco',              icon: 'disc',     regions: ['europe'] },
  klassik:       { name: 'Klassik',         search: 'classical music',          icon: 'piano',    regions: ['europe'] },
  ndw:           { name: 'Neue Dt. Welle',  search: 'neue deutsche welle',      icon: 'waves',    regions: ['europe'] },
  schlager:      { name: 'Schlager',        search: 'schlager deutsch',          icon: 'heart',    regions: ['europe'] },
  synthpop:      { name: 'Synthpop',        search: 'synthpop',                 icon: 'piano',    regions: ['europe'] },
  techno:        { name: 'Techno',          search: 'techno',                   icon: 'headphones', regions: ['europe'] },
  trance:        { name: 'Trance',          search: 'trance music',             icon: 'waves',    regions: ['europe'] },
  ukrap:         { name: 'UK Rap',          search: 'uk grime rap',             icon: 'mic',      regions: ['europe'] },
  ukgarage:      { name: 'UK Garage',       search: 'uk garage 2step',          icon: 'headphones', regions: ['europe'] },
  volkstümlich:  { name: 'Volksmusik',      search: 'volksmusik',               icon: 'mountain', regions: ['europe'] },
  spanishpop:    { name: 'Spanish Pop',     search: 'pop español',              icon: 'sun',      regions: ['europe'] },
  balkanbeats:   { name: 'Balkan Beats',    search: 'balkan beats',             icon: 'drum',     regions: ['europe'] },
  scandipop:     { name: 'Scandi-Pop',      search: 'scandinavian pop',         icon: 'snowflake', regions: ['europe'] },
  britpop:       { name: 'Britpop',         search: 'britpop',                  icon: 'guitar',   regions: ['europe'] },

  /* ── Nordamerika ─────────────────────────────────────────── */
  blues:         { name: 'Blues',           search: 'blues',                    icon: 'guitar',   regions: ['northamerica'] },
  country:       { name: 'Country',         search: 'country',                  icon: 'sun',      regions: ['northamerica'] },
  countryrock:   { name: 'Country Rock',    search: 'country rock',             icon: 'guitar',   regions: ['northamerica'] },
  funk:          { name: 'Funk',            search: 'funk',                     icon: 'disc',     regions: ['northamerica'] },
  gospel:        { name: 'Gospel',          search: 'gospel',                   icon: 'heart',    regions: ['northamerica'] },
  grunge:        { name: 'Grunge',          search: 'grunge',                   icon: 'flame',    regions: ['northamerica'] },
  motown:        { name: 'Motown',          search: 'motown classics',          icon: 'disc',     regions: ['northamerica'] },
  neosoul:       { name: 'Neo-Soul',        search: 'neo soul',                 icon: 'heart',    regions: ['northamerica'] },
  rnb:           { name: 'R&B',             search: 'rnb soul',                 icon: 'mic',      regions: ['northamerica'] },
  trapmusic:     { name: 'Trap',            search: 'trap music',               icon: 'flame',    regions: ['northamerica'] },
  usrap:         { name: 'US Rap',          search: 'american rap',             icon: 'mic',      regions: ['northamerica'] },
  southernrap:   { name: 'Southern Rap',    search: 'southern hip hop',         icon: 'mic',      regions: ['northamerica'] },
  oldschoolhh:   { name: 'Old School HH',  search: 'old school hip hop',       icon: 'disc',     regions: ['northamerica'] },
  westcoast:     { name: 'Westcoast',       search: 'west coast hip hop',       icon: 'sun',      regions: ['northamerica'] },
  eastcoast:     { name: 'Eastcoast',       search: 'east coast hip hop',       icon: 'mic',      regions: ['northamerica'] },
  newwave:       { name: 'New Wave',        search: 'new wave 80s',             icon: 'waves',    regions: ['northamerica'] },
  surf:          { name: 'Surf Rock',       search: 'surf rock',               icon: 'waves',    regions: ['northamerica'] },

  /* ── Lateinamerika ───────────────────────────────────────── */
  bachata:       { name: 'Bachata',         search: 'bachata',                  icon: 'heart',    regions: ['latinamerica'] },
  bossanova:     { name: 'Bossa Nova',      search: 'bossa nova',              icon: 'coffee',   regions: ['latinamerica'] },
  cumbia:        { name: 'Cumbia',          search: 'cumbia',                   icon: 'drum',     regions: ['latinamerica'] },
  dancehall:     { name: 'Dancehall',       search: 'dancehall',               icon: 'flame',    regions: ['latinamerica'] },
  latin:         { name: 'Latin',           search: 'latin hits',              icon: 'sun',      regions: ['latinamerica'] },
  latinpop:      { name: 'Latin Pop',       search: 'latin pop',               icon: 'music',    regions: ['latinamerica'] },
  merengue:      { name: 'Merengue',        search: 'merengue',                icon: 'drum',     regions: ['latinamerica'] },
  reggae:        { name: 'Reggae',          search: 'reggae',                  icon: 'leaf',     regions: ['latinamerica'] },
  reggaeton:     { name: 'Reggaeton',       search: 'reggaeton',               icon: 'flame',    regions: ['latinamerica'] },
  salsa:         { name: 'Salsa',           search: 'salsa',                   icon: 'flame',    regions: ['latinamerica'] },
  samba:         { name: 'Samba',           search: 'samba brasileiro',        icon: 'drum',     regions: ['latinamerica'] },
  tango:         { name: 'Tango',           search: 'tango argentino',         icon: 'heart',    regions: ['latinamerica'] },
  dembow:        { name: 'Dembow',          search: 'dembow',                  icon: 'drum',     regions: ['latinamerica'] },
  tropicalia:    { name: 'Tropicália',      search: 'tropicalia brasileira',   icon: 'sun',      regions: ['latinamerica'] },
  mpb:           { name: 'MPB',             search: 'mpb musica popular brasileira', icon: 'guitar', regions: ['latinamerica'] },
  vallenato:     { name: 'Vallenato',       search: 'vallenato',               icon: 'guitar',   regions: ['latinamerica'] },

  /* ── Global / genreübergreifend ──────────────────────────── */
  acoustic:      { name: 'Acoustic',        search: 'acoustic hits',           icon: 'guitar',   regions: ['global'] },
  ambient:       { name: 'Ambient',         search: 'ambient music',           icon: 'moon',     regions: ['global'] },
  chillout:      { name: 'Chillout',        search: 'chillout lounge',         icon: 'coffee',   regions: ['global'] },
  dance:         { name: 'Dance',           search: 'dance hits',              icon: 'disc',     regions: ['global'] },
  disco:         { name: 'Disco',           search: 'disco',                   icon: 'disc',     regions: ['global'] },
  dubstep:       { name: 'Dubstep',         search: 'dubstep',                 icon: 'waves',    regions: ['global'] },
  edm:           { name: 'EDM',             search: 'edm festival',            icon: 'headphones', regions: ['global'] },
  electronic:    { name: 'Electronic',      search: 'electronic dance',        icon: 'headphones', regions: ['global'] },
  emo:           { name: 'Emo',             search: 'emo rock',                icon: 'flame',    regions: ['global'] },
  folk:          { name: 'Folk',            search: 'folk music',              icon: 'leaf',     regions: ['global'] },
  garage:        { name: 'Garage Rock',     search: 'garage rock',             icon: 'guitar',   regions: ['global'] },
  hardrock:      { name: 'Hard Rock',       search: 'hard rock',               icon: 'guitar',   regions: ['global'] },
  hiphop:        { name: 'Hip-Hop',         search: 'hip-hop',                 icon: 'mic',      regions: ['global'] },
  indie:         { name: 'Indie',           search: 'indie rock alternative',  icon: 'leaf',     regions: ['global'] },
  indiepop:      { name: 'Indie-Pop',       search: 'indie pop',               icon: 'sparkles', regions: ['global'] },
  jazz:          { name: 'Jazz',            search: 'jazz classics',           icon: 'music',    regions: ['global'] },
  lofi:          { name: 'Lo-Fi',           search: 'lofi beats',              icon: 'coffee',   regions: ['global'] },
  metal:         { name: 'Metal',           search: 'heavy metal',             icon: 'flame',    regions: ['global'] },
  newmetal:      { name: 'Nu Metal',        search: 'nu metal',                icon: 'flame',    regions: ['global'] },
  pop:           { name: 'Pop',             search: 'pop hits',                icon: 'music',    regions: ['global'] },
  poppunk:       { name: 'Pop-Punk',        search: 'pop punk',                icon: 'guitar',   regions: ['global'] },
  poprock:       { name: 'Pop-Rock',        search: 'pop rock hits',           icon: 'guitar',   regions: ['global'] },
  postpunk:      { name: 'Post-Punk',       search: 'post punk',               icon: 'waves',    regions: ['global'] },
  progressive:   { name: 'Progressive',     search: 'progressive rock',        icon: 'waves',    regions: ['global'] },
  psychedelic:   { name: 'Psychedelic',     search: 'psychedelic rock',        icon: 'sparkles', regions: ['global'] },
  punk:          { name: 'Punk',            search: 'punk rock',               icon: 'flame',    regions: ['northamerica', 'europe'] },
  rock:          { name: 'Rock',            search: 'rock classics',           icon: 'guitar',   regions: ['global'] },
  shoegaze:      { name: 'Shoegaze',        search: 'shoegaze',                icon: 'waves',    regions: ['global'] },
  singer:        { name: 'Singer-Songwriter', search: 'singer songwriter',     icon: 'mic',      regions: ['global'] },
  ska:           { name: 'Ska',             search: 'ska punk',                icon: 'drum',     regions: ['global'] },
  soul:          { name: 'Soul',            search: 'soul classic',            icon: 'heart',    regions: ['northamerica'] },
  soundtrack:    { name: 'Soundtrack',      search: 'movie soundtrack',        icon: 'film',     regions: ['global'] },
  videogame:     { name: 'Videospiel',      search: 'video game music',        icon: 'gamepad',  regions: ['global'] },
  world:         { name: 'Weltmusik',       search: 'world music',             icon: 'globe',    regions: ['global'] },
  worship:       { name: 'Worship',         search: 'worship praise',          icon: 'heart',    regions: ['global'] },
  nineties:      { name: '90er Hits',       search: '90s hits',                icon: 'disc',     regions: ['global'] },
  eighties:      { name: '80er Hits',       search: '80s hits',                icon: 'disc',     regions: ['global'] },
  seventies:     { name: '70er Hits',       search: '70s hits',                icon: 'disc',     regions: ['global'] },
  twothousands:  { name: '2000er Hits',     search: '2000s hits',              icon: 'disc',     regions: ['global'] },
}

export function getGenresList(regionFilter = 'all') {
  return Object.entries(GENRES)
    .filter(([, g]) => regionFilter === 'all' || g.regions.includes(regionFilter))
    .map(([id, g]) => ({
      id,
      name: g.name,
      icon: g.icon,
    }))
}

export function getRegionsList() {
  return Object.entries(REGIONS).map(([id, r]) => ({
    id,
    name: r.name,
    icon: r.icon,
  }))
}
