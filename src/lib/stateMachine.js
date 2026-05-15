// ─── State constants ───────────────────────────────────────────────────────
export const STATES = {
  IDLE:        'IDLE',
  LISTENING:   'LISTENING',
  SPEAKING:    'SPEAKING',
  THINKING:    'THINKING',
  RESPONDING:  'RESPONDING',
  INTERRUPTED: 'INTERRUPTED',
  ERROR:       'ERROR',
};

export const TRANSITIONS = {
  [STATES.IDLE]:        [STATES.LISTENING],
  [STATES.LISTENING]:   [STATES.SPEAKING, STATES.IDLE, STATES.ERROR],
  [STATES.SPEAKING]:    [STATES.THINKING, STATES.LISTENING, STATES.IDLE],
  [STATES.THINKING]:    [STATES.RESPONDING, STATES.ERROR, STATES.IDLE],
  [STATES.RESPONDING]:  [STATES.LISTENING, STATES.INTERRUPTED, STATES.IDLE],
  [STATES.INTERRUPTED]: [STATES.SPEAKING, STATES.LISTENING],
  [STATES.ERROR]:       [STATES.IDLE],
};

export function canTransition(from, to) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export const STATE_COLORS = {
  IDLE:        '#555555',
  LISTENING:   '#00D4FF',
  SPEAKING:    '#4F8BFF',
  THINKING:    '#9B7BFF',
  RESPONDING:  '#E91E8C',
  INTERRUPTED: '#FF6B9D',
  ERROR:       '#EF4444',
};

export const STATE_DOT_COLORS = {
  IDLE:        '#555555',
  LISTENING:   '#10B981',
  SPEAKING:    '#4F8BFF',
  THINKING:    '#9B7BFF',
  RESPONDING:  '#E91E8C',
  INTERRUPTED: '#FF6B9D',
  ERROR:       '#EF4444',
};

export const STATE_LABELS = {
  IDLE:        'Idle',
  LISTENING:   'Listening',
  SPEAKING:    'You Speaking',
  THINKING:    'Thinking',
  RESPONDING:  'AI Responding',
  INTERRUPTED: 'Interrupted',
  ERROR:       'Error',
};

export const STATE_ORB_TEXT = {
  IDLE:        { line1: 'Tap mic to start',     line2: '' },
  LISTENING:   { line1: "I'm listening",         line2: 'Speak naturally' },
  SPEAKING:    { line1: '',                      line2: '' },
  THINKING:    { line1: '',                      line2: '' },
  RESPONDING:  { line1: '',                      line2: '' },
  INTERRUPTED: { line1: 'Hold on...',            line2: '' },
  ERROR:       { line1: 'Something went wrong',  line2: 'Tap to retry' },
};

export const THINKING_LABELS = [
  'Searching...',
  'Processing...',
  'Formulating...',
  'Cross-referencing...',
  'Almost there...',
];

export const STATE_PHASE_SPEED = {
  IDLE: 0.006, LISTENING: 0.014, SPEAKING: 0.016,
  THINKING: 0.007, RESPONDING: 0.022, INTERRUPTED: 0.010, ERROR: 0.004,
};

export const STATE_AMP_MULT = {
  IDLE: 0.12, LISTENING: 0.55, SPEAKING: 1.00,
  THINKING: 0.18, RESPONDING: 0.70, INTERRUPTED: 0.00, ERROR: 0.08,
};

export const STATE_GLOW = {
  IDLE: 4, LISTENING: 8, SPEAKING: 13,
  THINKING: 6, RESPONDING: 16, INTERRUPTED: 22, ERROR: 5,
};

export const STATE_CARD_ORDER = [
  STATES.LISTENING, STATES.SPEAKING, STATES.THINKING,
  STATES.RESPONDING, STATES.INTERRUPTED,
];
