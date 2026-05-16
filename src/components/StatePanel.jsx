import StateCard from './StateCard';
import { STATES, STATE_COLORS, STATE_LABELS, STATE_CARD_ORDER } from '../lib/stateMachine';

/**
 * StatePanel.jsx — bottom row of state cards
 * Receives state prop (matches App.jsx usage)
 */
export default function StatePanel({ state, smoothed, rms }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-[1100px]">
      <div className="grid grid-cols-5 gap-3">
        {STATE_CARD_ORDER.map((s) => (
          <StateCard
            key={s}
            label={STATE_LABELS[s]}
            color={STATE_COLORS[s]}
            isActive={state === s}
            state={s}
          />
        ))}
      </div>
    </div>
  );
}
