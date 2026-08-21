export const GRID_W = 8
export const GRID_H = 6
export const TILE_COUNT = GRID_W * GRID_H

export const DAY_MS = 120_000

export const PLANTS = [
  { id: 'sunflower', name: 'Sunflower', stages: ['🌰', '🌱', '🌿', '🌻'], growth: 45_000, blurb: 'Grows quickly' },
  { id: 'tulip', name: 'Tulip', stages: ['🌰', '🌱', '🌷'], growth: 90_000, blurb: 'Slow & pretty' },
  { id: 'mushroom', name: 'Mushroom', stages: ['🟤', '🍄', '🍄'], growth: 70_000, rainOnly: true, blurb: 'Appears after rain' },
  { id: 'daisy', name: 'Daisy', stages: ['🌰', '🌱', '🌼'], growth: 30_000, blurb: 'Sunny & quick' },
  { id: 'clover', name: 'Clover', stages: ['🌰', '🌱', '🍀'], growth: 35_000, blurb: 'A little lucky' },
  { id: 'fern', name: 'Fern', stages: ['🌰', '🌿', '🌿'], growth: 60_000, rainBoost: true, blurb: 'Loves the rain' },
  { id: 'strawberry', name: 'Strawberry', stages: ['🌰', '🌱', '🍓'], growth: 75_000, blurb: 'Sweet harvest' },
  { id: 'cactus', name: 'Cactus', stages: ['🌰', '🌵', '🌵'], growth: 100_000, noWater: true, blurb: 'Never thirsty' },
  { id: 'rose', name: 'Rose', stages: ['🌰', '🌱', '🌹'], growth: 120_000, blurb: 'Worth the wait' },
  { id: 'starflower', name: 'Starflower', stages: ['🌰', '🌱', '🌟'], growth: 130_000, blurb: 'Shines at night' },
  { id: 'pumpkin', name: 'Pumpkin', stages: ['🌰', '🌱', '🎃'], growth: 150_000, blurb: 'Grows big' },
  { id: 'lotus', name: 'Lotus', stages: ['🌰', '🌱', '🪷'], growth: 140_000, rainBoost: true, blurb: 'Blooms in rain' },
]

export const MYSTERY = {
  id: 'mystery',
  name: 'Mystery Sprout',
  stages: ['🌫️', '🌱', '🌿'],
  growth: 55_000,
}

export const STARTING_DISCOVERED = ['sunflower', 'tulip', 'mushroom']
export const STARTING_SEEDS = { sunflower: 5, tulip: 3, mushroom: 2, mystery: 3 }

export function getPlant(id) {
  return PLANTS.find((p) => p.id === id)
}

export function plantDef(species) {
  return species === MYSTERY.id ? MYSTERY : getPlant(species)
}

export function tileStage(tile, def) {
  if (!def) return 0
  const t = Math.min(1, (tile.progress || 0) / def.growth)
  return Math.min(def.stages.length - 1, Math.floor(t * def.stages.length))
}

export function isMature(tile, def) {
  return def ? (tile.progress || 0) >= def.growth : false
}

export function tileEmoji(tile) {
  const def = plantDef(tile.species)
  if (!def) return '❔'
  const mature = isMature(tile, def)
  if (tile.species === MYSTERY.id && mature) {
    if (tile.revealed) {
      const revealed = getPlant(tile.revealed)
      return revealed ? revealed.stages[revealed.stages.length - 1] : '✨'
    }
    return '✨'
  }
  return def.stages[tileStage(tile, def)]
}

export function growthRate(def, weather) {
  let rate = 1
  if (def.rainOnly) {
    rate = weather.state === 'rain' ? 2 : 0.4
  } else if (weather.state === 'rain') {
    rate = def.rainBoost ? 2.2 : 1.6
  }
  if (weather.strange) rate *= 1.5
  return rate
}

export function phaseOf(now) {
  const t = ((now % DAY_MS) + DAY_MS) % DAY_MS / DAY_MS
  if (t < 0.55) return 'day'
  if (t < 0.68) return 'dusk'
  return 'night'
}
