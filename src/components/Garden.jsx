import { GRID_W, GRID_H, getPlant, MYSTERY, plantDef, isMature } from '../data/plants.js'
import Plant from './Plant.jsx'

export default function Garden({ garden, critters, selectedSeed, onTile }) {
  const ghost = selectedSeed === MYSTERY.id ? '❔' : (getPlant(selectedSeed)?.stages.at(-1) ?? '🌱')
  return (
    <div class="garden-wrap">
      <div class="garden" style={{ '--w': GRID_W, '--h': GRID_H }}>
        {garden.map((tile, i) => {
          const ready = tile ? isMature(tile, plantDef(tile.species)) : false
          return (
            <button
              key={i}
              class={`tile${tile ? ' planted' : ''}${ready ? ' ready' : ''}`}
              onClick={() => onTile(tile, i)}
              aria-label={tile ? 'planted tile' : 'empty soil'}
            >
              {tile ? <Plant tile={tile} /> : <span class="ghost">{ghost}</span>}
            </button>
          )
        })}
      </div>
      {critters.map((c) => (
        <span
          key={c.id}
          class={`critter critter-${c.type}`}
          style={{
            left: `${((c.x + 0.5) / GRID_W) * 100}%`,
            top: `${((c.y + 0.5) / GRID_H) * 100}%`,
            transition: `left ${c.moveMs}ms linear, top ${c.moveMs}ms linear`,
          }}
        >
          {c.emoji}
        </span>
      ))}
    </div>
  )
}
