// Simple in-memory storage for daily usage tracking
// In production, replace with Vercel KV, Redis, or a database

const usageStore = new Map();

export const MAX_DAILY_SECONDS = 180; // 3 minutes

function getTodayKey(identifier) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${identifier}:${today}`;
}

export function getUsage(identifier) {
  const key = getTodayKey(identifier);
  const usage = usageStore.get(key) || { usedSeconds: 0, sessions: [] };
  return {
    usedSeconds: usage.usedSeconds,
    remainingSeconds: Math.max(0, MAX_DAILY_SECONDS - usage.usedSeconds),
    sessions: usage.sessions || []
  };
}

export function canStartSession(identifier) {
  const usage = getUsage(identifier);
  return usage.remainingSeconds > 0;
}

export function getRemainingTime(identifier) {
  const usage = getUsage(identifier);
  return usage.remainingSeconds;
}

export function recordSession(identifier, durationSeconds) {
  const key = getTodayKey(identifier);
  const usage = usageStore.get(key) || { usedSeconds: 0, sessions: [] };
  
  const actualDuration = Math.min(durationSeconds, usage.remainingSeconds);
  usage.usedSeconds += actualDuration;
  usage.sessions.push({
    duration: actualDuration,
    timestamp: new Date().toISOString()
  });
  
  usageStore.set(key, usage);
  
  return {
    usedSeconds: usage.usedSeconds,
    remainingSeconds: Math.max(0, MAX_DAILY_SECONDS - usage.usedSeconds)
  };
}

export function reserveTime(identifier, requestedSeconds) {
  const key = getTodayKey(identifier);
  const usage = usageStore.get(key) || { usedSeconds: 0, sessions: [] };
  const remaining = Math.max(0, MAX_DAILY_SECONDS - usage.usedSeconds);
  const reserved = Math.min(requestedSeconds, remaining);
  
  return {
    reservedSeconds: reserved,
    remainingSeconds: remaining - reserved
  };
}

// Export usageStore for test bypass
export { usageStore };

// Clean up old entries (older than 2 days) to prevent memory leaks
function cleanup() {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const cutoffDate = twoDaysAgo.toISOString().split('T')[0];
  
  for (const [key] of usageStore) {
    const date = key.split(':')[1];
    if (date < cutoffDate) {
      usageStore.delete(key);
    }
  }
}

// Run cleanup every hour
setInterval(cleanup, 60 * 60 * 1000);

