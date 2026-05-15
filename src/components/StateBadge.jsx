import { STATES } from '../lib/stateMachine';

/**
 * StateBadge.jsx
 * Top-left pill showing current state with colored dot
 */
export default function StateBadge({ state }) {
  const isActive = state !== STATES.IDLE && state !== STATES.ERROR;

  const dotColor = {
    [STATES.LISTENING]: '#10B981',
    [STATES.SPEAKING]: '#4F8BFF',
    [STATES.THINKING]: '#9B7BFF',
    [STATES.RESPONDING]: '#E91E8C',
    [STATES.INTERRUPTED]: '#FF6B9D',
    [STATES.ERROR]: '#EF4444',
  }[state] || '#888';

  return (
    <div className="absolute top-6 left-6 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono tracking-[1px]">
      <div 
        className="w-[7px] h-[7px] rounded-full" 
        style={{ backgroundColor: dotColor, boxShadow: isActive ? `0 0 6px ${dotColor}` : 'none' }} 
      />
      <span className="text-white/90">{state}</span>
    </div>
  );
}