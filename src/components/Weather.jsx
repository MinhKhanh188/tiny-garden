export default function Weather({ weather, phase }) {
  const phaseIcon = phase === 'night' ? '🌙' : phase === 'dusk' ? '🌇' : '☀️'
  const phaseLabel = phase === 'night' ? 'Night' : phase === 'dusk' ? 'Dusk' : 'Day'
  return (
    <div class="weather">
      <span class="phase" title={phaseLabel}>
        {phaseIcon} {phaseLabel}
      </span>
      {weather.state === 'rain' && (
        <span class={`rain-chip${weather.strange ? ' strange' : ''}`}>
          {weather.strange ? '🌌 Strange rain' : '🌧️ Raining'}
        </span>
      )}
    </div>
  )
}
