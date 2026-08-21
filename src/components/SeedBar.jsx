import { PLANTS, MYSTERY } from '../data/plants.js'

export default function SeedBar({ discovered, seeds, selected, onSelect }) {
  return (
    <div class="seedbar">
      <div class="seedbar-head">
        <span class="count">
          Seeds discovered: <b>{discovered.length}</b> / {PLANTS.length}
        </span>
        <span class="hint">tap soil to plant · tap sprouts to water · tap grown plants to harvest</span>
      </div>
      <div class="seed-slots">
        {PLANTS.map((p) => {
          const has = discovered.includes(p.id)
          const count = seeds[p.id] || 0
          return (
            <button
              key={p.id}
              class={`seed-slot${has ? '' : ' locked'}${selected === p.id ? ' active' : ''}`}
              disabled={!has}
              onClick={() => onSelect(p.id)}
              title={has ? `${p.name} — ${p.blurb} (${count} seeds)` : `${p.name} — locked`}
            >
              <span class="seed-emoji">{has ? p.stages.at(-1) : '🔒'}</span>
              {has && <span class="seed-count">{count}</span>}
              {!has && <span class="lock-name">?</span>}
            </button>
          )
        })}
        <button
          class={`seed-slot mystery${selected === MYSTERY.id ? ' active' : ''}`}
          onClick={() => onSelect(MYSTERY.id)}
          title="Mystery Sprout — grows into something unexpected"
        >
          <span class="seed-emoji">🌱</span>
          <span class="seed-count">{seeds[MYSTERY.id] || 0}</span>
        </button>
      </div>
    </div>
  )
}
