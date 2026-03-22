import { formatYear } from '../../utils/formatYear'

interface Props {
  minYear: number
  maxYear: number
  value: number
  onChange: (year: number) => void
  playing: boolean
  onPlayToggle: () => void
}

export function TimeSlider({ minYear, maxYear, value, onChange, playing, onPlayToggle }: Props) {
  return (
    <div className="time-slider" role="group" aria-label="Timeline controls">
      <button
        className="btn btn--sm"
        onClick={onPlayToggle}
        aria-label={playing ? 'Pause timeline' : 'Play timeline'}
      >
        {playing ? 'PAUSE' : 'PLAY'}
      </button>
      <span className="time-slider__bounds">{formatYear(minYear) ?? ''}</span>
      <input
        type="range"
        className="time-slider__range"
        min={minYear}
        max={maxYear}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={`Timeline year: ${formatYear(value) ?? ''}`}
      />
      <span className="time-slider__bounds">{formatYear(maxYear) ?? ''}</span>
      <span className="time-slider__year">{formatYear(value) ?? ''}</span>
    </div>
  )
}
