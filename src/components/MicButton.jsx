import { motion } from 'framer-motion';
import { STATES } from '../lib/stateMachine';

/**
 * MicButton.jsx — mic toggle, bottom center
 * Props: state, onClick, isActive
 */
export default function MicButton({ state, onClick, isActive }) {
  const isListening  = state === STATES.LISTENING || state === STATES.SPEAKING;
  const isProcessing = state === STATES.THINKING || state === STATES.RESPONDING;

  return (
    <button
      onClick={onClick}
      disabled={isProcessing}
      className="absolute bottom-[22%] left-1/2 -translate-x-1/2 z-40 w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-[0.92] disabled:opacity-50"
      style={{
        background: isListening
          ? 'rgba(0,212,255,0.15)'
          : 'rgba(255,255,255,0.07)',
        border: isListening
          ? '1px solid rgba(0,212,255,0.4)'
          : '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <motion.div
        animate={{ scale: isListening ? [1, 1.12, 1] : 1 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {isListening ? (
          // Stop icon when listening
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          // Mic icon when idle
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
          </svg>
        )}
      </motion.div>
    </button>
  );
}
