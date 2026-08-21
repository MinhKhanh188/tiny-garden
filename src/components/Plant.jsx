import { plantDef, isMature, tileStage, tileEmoji } from '../data/plants.js'

export default function Plant({ tile }) {
  const def = plantDef(tile.species)
  if (!def) return null
  const stage = tileStage(tile, def)
  const mature = isMature(tile, def)
  const emoji = tileEmoji(tile)
  const mysteryWaiting = tile.species === 'mystery' && mature && !tile.revealed
  const waterFresh = tile.waterFx && Date.now() - tile.waterFx < 1500
  return (
    <span
      class={`plant stage-${stage}${mature ? ' mature' : ''}${mysteryWaiting ? ' mystery-glow' : ''}`}
      style={{
        '--sway-dur': `${2.2 + (tile.id % 5) * 0.45}s`,
        '--sway-delay': `${(tile.id % 7) * 0.35}s`,
      }}
    >
      {emoji}
      {waterFresh && <span class="splash">💦</span>}
      {mature && <span class="sparkle">✨</span>}
    </span>
  )
}
