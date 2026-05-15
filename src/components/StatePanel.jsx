import StateCard from './StateCard';
import { STATES } from '../lib/stateMachine';

/**
 * StatePanel.jsx
 * Bottom row of 5 state cards
 */
export default function StatePanel({ currentState }) {
  const states = [
    { key: STATES.LISTENING, label: 'LISTENING', color: '#00D4FF' },
    { key: STATES.THINKING, label: 'THINKING', color: '#9B7BFF' },
    { key: STATES.RESPONDING, label: 'RESPONDING', color: '#E91E8C' },
    { key: STATES.SPEAKING, label: 'SPEAKING', color: '#4F8BFF' },
    { key: STATES.IDLE, label: 'IDLE', color: '#888888' },
  ];

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-[1100px]">
      <div className="grid grid-cols-5 gap-3">
        {states.map(({ key, label, color }) => (
          <StateCard 
            key={key} 
            label={label} 
            color={color} 
            isActive={currentState === key} 
          />
        ))}
      </div>
    </div>
  );
}