import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createUser, loginUser, hasAnyUser, saveSession, loadSession, clearSession } from '../lib/db';

/**
 * AuthGate.jsx — Create Password / Login screen
 * First visit: "Create your voice profile" (username + password)
 * Return visits: login form
 * On success: renders children with user prop injected
 */
export default function AuthGate({ children }) {
  const [phase, setPhase]     = useState('loading'); // loading | create | login | authed
  const [user, setUser]       = useState(null);
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');

  // On mount — check for existing session or any user
  useEffect(() => {
    (async () => {
      const session = loadSession();
      if (session) {
        setUser(session);
        setPhase('authed');
        return;
      }
      const exists = await hasAnyUser();
      setPhase(exists ? 'login' : 'create');
    })();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    if (!displayName.trim()) return setError('Enter your name');
    if (!username.trim())    return setError('Choose a username');
    if (password.length < 6) return setError('Password must be 6+ characters');
    if (password !== confirm) return setError('Passwords don\'t match');

    setBusy(true);
    try {
      const u = await createUser({ username, displayName, password });
      saveSession(u);
      setUser(u);
      setPhase('authed');
    } catch (err) {
      setError(err.message === 'ConstraintError' || err.message.includes('unique')
        ? 'Username already taken'
        : err.message);
    } finally { setBusy(false); }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) return setError('Fill in all fields');

    setBusy(true);
    try {
      const u = await loginUser({ username, password });
      saveSession(u);
      setUser(u);
      setPhase('authed');
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  function handleSignOut() {
    clearSession();
    setUser(null);
    setPhase('login');
    setPassword('');
    setConfirm('');
  }

  if (phase === 'loading') return null;

  if (phase === 'authed') {
    return children({ user, onSignOut: handleSignOut });
  }

  const isCreate = phase === 'create';

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)' }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          {/* Header */}
          <div className="text-center mb-8">
            {/* Orb icon placeholder */}
            <div className="mx-auto mb-4 w-16 h-16 rounded-full border border-cyan-400/30 flex items-center justify-center"
              style={{ boxShadow: '0 0 24px rgba(0,212,255,0.2)' }}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 opacity-80" />
            </div>

            <h1 className="text-2xl font-light tracking-wide text-white">
              {isCreate ? 'Create your voice profile' : 'Welcome back'}
            </h1>
            <p className="text-sm text-white/40 mt-1">
              {isCreate
                ? 'Everything stays on your device'
                : 'Your voice data lives locally'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={isCreate ? handleCreate : handleLogin} className="space-y-4">

            {isCreate && (
              <div>
                <label className="text-xs text-white/40 font-mono tracking-wider uppercase">
                  Your name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Drew"
                  autoComplete="name"
                  className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-white/40 font-mono tracking-wider uppercase">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your_handle"
                autoComplete="username"
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-white/40 font-mono tracking-wider uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isCreate ? 'new-password' : 'current-password'}
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
              />
            </div>

            {isCreate && (
              <div>
                <label className="text-xs text-white/40 font-mono tracking-wider uppercase">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
              </div>
            )}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-400 text-xs text-center"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all"
              style={{
                background: busy
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(107,99,255,0.2))',
                border: '1px solid rgba(0,212,255,0.3)',
                color: busy ? 'rgba(255,255,255,0.3)' : 'white',
              }}
            >
              {busy
                ? (isCreate ? 'Creating...' : 'Signing in...')
                : (isCreate ? 'Create voice profile' : 'Sign in')}
            </button>
          </form>

          {/* Toggle link */}
          <div className="text-center mt-6">
            <button
              onClick={() => { setPhase(isCreate ? 'login' : 'create'); setError(''); }}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              {isCreate ? 'Already have a profile? Sign in' : 'New here? Create a profile'}
            </button>
          </div>

          {/* Storage note */}
          {isCreate && (
            <p className="text-center text-[10px] text-white/20 mt-4 leading-relaxed">
              Voice data, transcripts & biometrics stored locally in your browser.
              Nothing leaves your device.
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
