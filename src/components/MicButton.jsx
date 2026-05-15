import { motion } from 'framer-motion';

/**
 * MicButton.jsx
 * Central microphone toggle button
 */
export default function MicButton({ isActive, onToggle, state }) {
  const isListening = state === 'LISTENING';

  return (
    <button
      onClick={onToggle}
      className="absolute bottom-[22%] left-1/2 -translate-x-1/2 z-40 w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-[0.92]"
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <motion.div
        animate={{ scale: isListening ? [1, 1.08, 1] : 1 }}
        transition={{ duration: 1.6, repeat: Infinity }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-4H5" />
        </svg>
      </motion.div>
    </button>
  );
}