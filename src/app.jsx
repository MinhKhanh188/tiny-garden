import { useEffect, useRef, useState } from 'preact/hooks'
import {
  GRID_W,
  GRID_H,
  TILE_COUNT,
  PLANTS,
  MYSTERY,
  STARTING_DISCOVERED,
  STARTING_SEEDS,
  getPlant,
  plantDef,
  tileStage,
  isMature,
  growthRate,
  phaseOf,
} from './data/plants.js'
import Garden from './components/Garden.jsx'
import SeedBar from './components/SeedBar.jsx'
import Weather from './components/Weather.jsx'
import './app.css'

const STORAGE_KEY = 'tiny-garden-save-v1'
const RAIN_DROPS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: (i * 37) % 100,
  delay: ((i * 13) % 24) / 10,
  dur: 0.7 + ((i * 7) % 10) / 12,
}))
const FIREFLIES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: 6 + ((i * 41) % 88),
  top: 18 + ((i * 29) % 62),
  delay: (i * 1.3) % 6,
  dur: 5 + (i % 4),
}))

let uid = 1

function freshSave() {
  return {
    version: 1,
    garden: Array(TILE_COUNT).fill(null),
    discovered: [...STARTING_DISCOVERED],
    seeds: { ...STARTING_SEEDS },
    weather: { state: 'clear', until: Date.now() + 20_000, strange: false },
    critters: [],
    nextEventAt: Date.now() + 60_000,
    lastSavedAt: Date.now(),
  }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshSave()
    const s = JSON.parse(raw)
    if (!s || s.version !== 1 || !Array.isArray(s.garden)) return freshSave()
    return s
  } catch {
    return freshSave()
  }
}

function mysteryOutcome(save) {
  const locked = PLANTS.filter((p) => !save.discovered.includes(p.id))
  const pool = locked.length && Math.random() < 0.7 ? locked : PLANTS
  return pool[Math.floor(Math.random() * pool.length)].id
}

function newTile(species) {
  return { id: uid++, species, plantedAt: Date.now(), progress: 0, watered: [], revealed: null }
}

const CRITTER_DEFS = {
  snail: { emoji: '🐌', moveMs: 3000, lifeMs: 45_000 },
  butterfly: { emoji: '🦋', moveMs: 2200, lifeMs: 30_000 },
  frog: { emoji: '🐸', moveMs: 4000, lifeMs: 75_000 },
}

export function App() {
  const saveRef = useRef(null)
  if (!saveRef.current) saveRef.current = loadSave()
  const s0 = saveRef.current

  const [garden, setGarden] = useState(s0.garden)
  const [selectedSeed, setSelectedSeed] = useState('sunflower')
  const [weather, setWeather] = useState(s0.weather)
  const [time, setTime] = useState(phaseOf(Date.now()))
  const [discoveredSeeds, setDiscoveredSeeds] = useState(s0.discovered)
  const [seeds, setSeeds] = useState(s0.seeds)
  const [critters, setCritters] = useState(s0.critters)
  const [toast, setToast] = useState(null)

  const sync = () => {
    const s = saveRef.current
    setGarden([...s.garden])
    setWeather(s.weather)
    setDiscoveredSeeds([...s.discovered])
    setSeeds({ ...s.seeds })
    setCritters([...s.critters])
  }

  const save = () => {
    const s = saveRef.current
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...s, garden: s.garden.map((t) => (t ? { ...t } : null)) })
      )
    } catch {
      /* storage full or unavailable */
    }
  }

  const announce = (text) => setToast({ text, id: Date.now() + Math.random() })

  const spawnCritter = (s, type) => {
    const def = CRITTER_DEFS[type]
    s.critters.push({
      id: uid++,
      type,
      emoji: def.emoji,
      x: Math.floor(Math.random() * GRID_W),
      y: Math.floor(Math.random() * GRID_H),
      nextMove: Date.now() + 1000,
      until: Date.now() + def.lifeMs,
      moveMs: def.moveMs,
    })
  }

  const runEvent = (s, now) => {
    const options = []
    const emptyIndexes = s.garden.map((t, i) => (t ? -1 : i)).filter((i) => i >= 0)
    const sunflowers = s.garden.map((t, i) => (t && t.species === 'sunflower' ? i : -1)).filter((i) => i >= 0)
    const locked = PLANTS.filter((p) => !s.discovered.includes(p.id))

    if (s.weather.state === 'clear') options.push('strangeRain')
    if (!s.critters.some((c) => c.type === 'frog')) options.push('frog')
    if (sunflowers.length && emptyIndexes.length) options.push('mushroomUnder')
    if (phaseOf(now) === 'night') options.push('starfall')
    if (locked.length) options.push('lostSeed')

    if (!options.length) return
    const ev = options[Math.floor(Math.random() * options.length)]

    if (ev === 'strangeRain') {
      s.weather = { state: 'rain', until: now + 35_000, strange: true }
      announce('🌧️ A strange rain begins... something feels different.')
    } else if (ev === 'frog') {
      spawnCritter(s, 'frog')
      announce('🐸 A frog has moved into your garden!')
    } else if (ev === 'mushroomUnder') {
      const under = sunflowers[Math.floor(Math.random() * sunflowers.length)]
      const ux = under % GRID_W
      const uy = Math.floor(under / GRID_W)
      const neighbors = emptyIndexes.filter(
        (i) => Math.abs((i % GRID_W) - ux) <= 1 && Math.abs(Math.floor(i / GRID_W) - uy) <= 1
      )
      const spot = neighbors.length
        ? neighbors[Math.floor(Math.random() * neighbors.length)]
        : emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)]
      s.garden[spot] = newTile('mushroom')
      announce('🍄 Something is growing underneath the sunflower...')
    } else if (ev === 'starfall') {
      s.garden.forEach((tile) => {
        if (!tile) return
        const def = plantDef(tile.species)
        if (def && tile.progress < def.growth) tile.progress = Math.min(def.growth, tile.progress + 10_000)
      })
      announce('✨ A shooting star passes — the garden drinks the light!')
    } else if (ev === 'lostSeed') {
      const pick = locked[Math.floor(Math.random() * locked.length)]
      s.seeds[pick.id] = (s.seeds[pick.id] || 0) + 1
      if (!s.discovered.includes(pick.id)) s.discovered.push(pick.id)
      announce(`🎁 A lost seed tumbles in — you discovered ${pick.name} ${pick.stages.at(-1)}!`)
    }
  }

  const tick = () => {
    const s = saveRef.current
    const now = Date.now()

    let w = s.weather
    if (now >= w.until) {
      if (w.state === 'rain') {
        const wasStrange = w.strange
        w = { state: 'clear', until: now + 25_000 + Math.random() * 30_000, strange: false }
        if (!wasStrange) {
          const empties = s.garden.map((t, i) => (t ? -1 : i)).filter((i) => i >= 0)
          if (empties.length && Math.random() < 0.6) {
            const spot = empties[Math.floor(Math.random() * empties.length)]
            s.garden[spot] = newTile('mushroom')
            announce('🍄 After the rain, mushrooms pop up...')
          }
        }
      } else if (Math.random() < 0.5) {
        w = { state: 'rain', until: now + 15_000 + Math.random() * 20_000, strange: false }
        announce('🌧️ Rain begins to fall...')
      } else {
        w = { state: 'clear', until: now + 25_000 + Math.random() * 30_000, strange: false }
      }
      s.weather = w
    }

    s.garden.forEach((tile) => {
      if (!tile) return
      const def = plantDef(tile.species)
      if (!def) return
      if (tile.progress >= def.growth) {
        if (tile.species === MYSTERY.id && !tile.revealed) tile.revealed = mysteryOutcome(s)
        return
      }
      tile.progress = Math.min(def.growth, tile.progress + 1000 * growthRate(def, w))
      if (tile.progress >= def.growth) {
        tile.progress = def.growth
        if (tile.species === MYSTERY.id) {
          tile.revealed = mysteryOutcome(s)
          announce(`✨ The mystery sprout was a ${getPlant(tile.revealed).name}!`)
        } else {
          announce(`${def.stages.at(-1)} A ${def.name} is ready to harvest!`)
        }
      }
    })

    s.critters = s.critters.filter((c) => c.until > now)
    s.critters.forEach((c) => {
      if (now < c.nextMove) return
      c.nextMove = now + c.moveMs
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)]
      c.x = Math.max(0, Math.min(GRID_W - 1, c.x + dx))
      c.y = Math.max(0, Math.min(GRID_H - 1, c.y + dy))
      if (c.type === 'frog') {
        const tile = s.garden[c.y * GRID_W + c.x]
        if (tile) {
          const def = plantDef(tile.species)
          if (def && !def.noWater && tile.progress < def.growth) {
            tile.progress = Math.min(def.growth, tile.progress + 8000)
            tile.waterFx = now
          }
        }
      }
    })
    if (Math.random() < 0.03 && !s.critters.some((c) => c.type === 'snail')) spawnCritter(s, 'snail')
    if (w.state !== 'rain' && phaseOf(now) === 'day' && Math.random() < 0.015 && !s.critters.some((c) => c.type === 'butterfly')) {
      spawnCritter(s, 'butterfly')
    }

    if (now >= s.nextEventAt) {
      s.nextEventAt = now + 50_000 + Math.random() * 50_000
      runEvent(s, now)
    }

    setTime(phaseOf(now))

    if (now - (s.lastSavedAt || 0) > 5000) {
      s.lastSavedAt = now
      save()
    }

    sync()
  }

  useEffect(() => {
    const s = saveRef.current
    const elapsed = Date.now() - (s.lastSavedAt || Date.now())
    if (elapsed > 1500) {
      const dt = Math.min(elapsed, 8 * 3600 * 1000)
      s.garden.forEach((tile) => {
        if (!tile) return
        const def = plantDef(tile.species)
        if (def && tile.progress < def.growth) {
          tile.progress = Math.min(def.growth, tile.progress + dt)
          if (tile.progress >= def.growth && tile.species === MYSTERY.id && !tile.revealed) {
            tile.revealed = mysteryOutcome(s)
          }
        }
      })
      s.weather = { state: 'clear', until: Date.now() + 15_000, strange: false }
      s.critters = s.critters.filter((c) => c.until > Date.now())
      sync()
    }

    const interval = setInterval(tick, 1000)
    const onHide = () => save()
    window.addEventListener('beforeunload', onHide)
    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', onHide)
      save()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

  const plantAt = (index) => {
    const s = saveRef.current
    if (s.garden[index]) return
    const isMysterySeed = selectedSeed === MYSTERY.id
    const def = plantDef(selectedSeed)
    if (!isMysterySeed && !s.discovered.includes(selectedSeed)) return
    if (def.rainOnly && s.weather.state !== 'rain') {
      announce('🍄 Mushrooms only appear while it rains...')
      return
    }
    if ((s.seeds[selectedSeed] || 0) < 1) {
      announce(`No ${def.name} seeds left!`)
      return
    }
    s.seeds[selectedSeed] -= 1
    s.garden[index] = newTile(selectedSeed)
    announce(`🌱 Planted a ${def.name}!`)
    sync()
    save()
  }

  const waterAt = (index) => {
    const s = saveRef.current
    const tile = s.garden[index]
    if (!tile) return
    const def = plantDef(tile.species)
    if (!def || isMature(tile, def)) return
    if (def.noWater) {
      announce('🌵 This one prefers the desert.')
      return
    }
    const stage = tileStage(tile, def)
    if (tile.watered.includes(stage)) {
      announce('💧 Already watered this stage.')
      return
    }
    tile.watered.push(stage)
    tile.progress = Math.min(def.growth, tile.progress + def.growth * 0.25)
    tile.waterFx = Date.now()
    sync()
    save()
  }

  const harvestAt = (index) => {
    const s = saveRef.current
    const tile = s.garden[index]
    if (!tile) return
    const def = plantDef(tile.species)
    if (!def || !isMature(tile, def)) return
    const isMysterySeed = tile.species === MYSTERY.id
    const species = isMysterySeed ? tile.revealed : tile.species
    s.garden[index] = null
    s.seeds[species] = (s.seeds[species] || 0) + 1
    if (species && !s.discovered.includes(species)) {
      s.discovered.push(species)
      const sp = getPlant(species)
      announce(`🔓 New seed discovered: ${sp.name} ${sp.stages.at(-1)}!`)
    } else if (species) {
      const sp = getPlant(species)
      announce(`${sp.stages.at(-1)} +1 ${sp.name} seed!`)
    }
    sync()
    save()
  }

  const onTile = (tile, i) => {
    if (!tile) {
      plantAt(i)
      return
    }
    const def = plantDef(tile.species)
    if (!def) return
    if (isMature(tile, def)) harvestAt(i)
    else waterAt(i)
  }

  const raining = weather.state === 'rain'

  return (
    <div
      class={`app phase-${time}${raining ? ' raining' : ''}${weather.strange ? ' strange' : ''}`}
    >
      <header class="topbar">
        <h1>🌱 Tiny Garden</h1>
        <Weather weather={weather} phase={time} />
      </header>
      <main class="stage">
        <Garden garden={garden} critters={critters} selectedSeed={selectedSeed} onTile={onTile} />
      </main>
      <SeedBar
        discovered={discoveredSeeds}
        seeds={seeds}
        selected={selectedSeed}
        onSelect={setSelectedSeed}
      />
      {toast && (
        <div class="toast" key={toast.id}>
          {toast.text}
        </div>
      )}
      {raining && (
        <div class="rain-layer" aria-hidden="true">
          {RAIN_DROPS.map((d) => (
            <i key={d.id} style={{ left: `${d.left}%`, animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s` }} />
          ))}
        </div>
      )}
      {time === 'night' && (
        <div class="fireflies" aria-hidden="true">
          {FIREFLIES.map((f) => (
            <i key={f.id} style={{ left: `${f.left}%`, top: `${f.top}%`, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s` }} />
          ))}
        </div>
      )}
    </div>
  )
}
