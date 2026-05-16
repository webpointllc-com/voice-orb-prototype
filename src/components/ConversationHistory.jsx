import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getConversations } from '../lib/db';

/**
 * ConversationHistory.jsx — slide-up panel showing past sessions from IndexedDB
 * Trigger: clock icon bottom-left. Reads from local IDB, zero network.
 */

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffH = (now - d) / 3600000;
  if (diffH < 1)   return `${Math.round(diffH * 60)}m ago`;
  if (diffH < 24)  return `${Math.round(diffH)}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n).trimEnd() + '…' : str;
}

export default function ConversationHistory({ userId }) {
  const [open, setOpen]         = useState(false);
  const [convos, setConvos]     = useState([]);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getConversations(userId, 20);
      setConvos(data);
    } catch (e) {
      console.error('[History]', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (!userId) return null;

  return (
    <>
      {/* Trigger button — bottom left */}
      <button
        onClick={() => setOpen(v => !v)}
        className="absolute bottom-6 left-6 z-40 w-10 h-10 rounded-full flex items-center justify-center transition-all"
        style={{
          background: open ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(0,212,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
        }}
        title="Conversation history"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke={open ? '#00D4FF' : 'rgba(255,255,255,0.4)'} strokeWidth="1.2"/>
          <path d="M8 4.5V8L10.5 10" stroke={open ? '#00D4FF' : 'rgba(255,255,255,0.4)'} strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Slide-up panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 38 }}
            className="absolute bottom-0 left-0 right-0 z-40 rounded-t-3xl overflow-hidden"
            style={{
              background: 'rgba(10,10,18,0.94)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderBottom: 'none',
              maxHeight: '44vh',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-[11px] font-mono tracking-[2px] uppercase text-white/30">
                Voice History
              </span>
              {convos.length > 0 && (
                <span className="text-[10px] font-mono text-white/20">
                  {convos.length} session{convos.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-4 pb-6" style={{ maxHeight: 'calc(44vh - 80px)' }}>
              {loading && (
                <div className="flex justify-center py-8">
                  <div className="text-[11px] font-mono text-white/20 animate-pulse">loading...</div>
                </div>
              )}

              {!loading && convos.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[12px] text-white/20 font-mono">No conversations yet</p>
                  <p className="text-[10px] text-white/10 mt-1">Tap the mic to start</p>
                </div>
              )}

              {!loading && convos.map((c, i) => (
                <motion.div
                  key={c.id ?? i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="mb-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="text-[9px] font-mono text-white/20 mb-2 tracking-wider">
                    {formatTime(c.timestamp)}
                  </div>

                  {c.transcript && (
                    <p className="text-[11px] text-cyan-300/60 mb-1 leading-relaxed">
                      <span className="text-white/20 mr-1">you</span>
                      {truncate(c.transcript, 80)}
                    </p>
                  )}

                  {c.response && (
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      <span className="text-white/20 mr-1">ai</span>
                      {truncate(c.response, 100)}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop tap to close */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
