import React from 'react'
import * as Icons from '../lib/icons'

/**
 * Maps icon string IDs from genres.js / quiz-engine.js to SVG components.
 * Usage: <GenreIcon icon="guitar" size={20} />
 */
const ICON_MAP = {
  'drum':          Icons.Drum,
  'music':         Icons.Music,
  'piano':         Icons.Piano,
  'sun':           Icons.Sun,
  'sparkles':      Icons.Sparkles,
  'waves':         Icons.Waves,
  'guitar':        Icons.Guitar,
  'star':          Icons.Star,
  'film':          Icons.Film,
  'mic':           Icons.Mic,
  'mountain':      Icons.Mountain,
  'headphones':    Icons.Headphones,
  'disc':          Icons.Disc,
  'heart':         Icons.Heart,
  'flame':         Icons.Flame,
  'leaf':          Icons.Leaf,
  'coffee':        Icons.Coffee,
  'moon':          Icons.Moon,
  'snowflake':     Icons.Snowflake,
  'globe':         Icons.Globe,
  'globe-europe':  Icons.GlobeEurope,
  'globe-americas': Icons.GlobeAmericas,
  'globe-asia':    Icons.GlobeAsia,
  'globe-africa':  Icons.GlobeAfrica,
  'gamepad':       Icons.Gamepad2,
  'calendar':      Icons.Calendar,
  'trophy':        Icons.Trophy,
  'target':        Icons.Target,
  'radio':         Icons.Radio,
  'zap':           Icons.Zap,
}

export default function GenreIcon({ icon, size = 20, className = '', style = {} }) {
  const Component = ICON_MAP[icon] || Icons.Music
  return <Component size={size} className={className} style={style} />
}
