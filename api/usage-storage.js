// Usage storage with Vercel KV for persistence
// Falls back to in-memory storage if KV is not configured

let kv = null;
let kvInitialized = false;

async function initKV() {
  if (kvInitialized) return kv;
  kvInitialized = true;
  
  try {
    const kvModule = await import('@vercel/kv');
    kv = kvModule.kv;
    console.log('[usage-storage] Vercel KV initialized');
  } catch (error) {
    console.warn('[usage-storage] Vercel KV not available, using in-memory storage (data will not persist):', error.message);
    kv = null;
  }
  
  return kv;
}

// In-memory fallback for local dev or if KV is not configured
let memoryStore = new Map();

export const MAX_DAILY_SECONDS = 180; // 3 minutes

function getTodayKey(identifier) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${identifier}:${today}`;
}

async function getUsageFromKV(key) {
  if (!kv) return null;
  try {
    const data = await kv.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('[usage-storage] Failed to get from KV:', error.message);
    return null;
  }
}

async function setUsageInKV(key, value) {
  if (!kv) return false;
  try {
    await kv.set(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('[usage-storage] Failed to set in KV:', error.message);
    return false;
  }
}

export async function getUsage(identifier) {
  await initKV(); // Initialize KV if not already done
  const key = getTodayKey(identifier);
  
  let usage;
  if (kv) {
    // Use Vercel KV
    usage = await getUsageFromKV(key);
    if (!usage) {
      usage = { usedSeconds: 0, sessions: [] };
    }
  } else {
    // Fallback to in-memory
    usage = memoryStore.get(key) || { usedSeconds: 0, sessions: [] };
  }
  
  const result = {
    usedSeconds: usage.usedSeconds,
    remainingSeconds: Math.max(0, MAX_DAILY_SECONDS - usage.usedSeconds),
    sessions: usage.sessions || []
  };
  
  const storeType = kv ? 'KV' : 'memory';
  console.log('[usage-storage] getUsage - Key:', key, 'Store:', storeType, 'Usage:', result);
  return result;
}

export async function canStartSession(identifier) {
  const usage = await getUsage(identifier);
  return usage.remainingSeconds > 0;
}

export async function getRemainingTime(identifier) {
  const usage = await getUsage(identifier);
  return usage.remainingSeconds;
}

export async function recordSession(identifier, durationSeconds) {
  await initKV(); // Initialize KV if not already done
  const key = getTodayKey(identifier);
  
  // Get existing usage
  let usage;
  if (kv) {
    usage = await getUsageFromKV(key);
  } else {
    usage = memoryStore.get(key);
  }
  
  if (!usage) {
    usage = { usedSeconds: 0, sessions: [] };
  }
  
  const storeType = kv ? 'KV' : 'memory';
  console.log('[usage-storage] recordSession - Key:', key, 'Before - Used:', usage.usedSeconds, 'Store:', storeType);
  
  // Calculate remaining seconds from used seconds
  const remainingSeconds = Math.max(0, MAX_DAILY_SECONDS - usage.usedSeconds);
  const actualDuration = Math.min(durationSeconds, remainingSeconds);
  
  usage.usedSeconds += actualDuration;
  usage.sessions.push({
    duration: actualDuration,
    timestamp: new Date().toISOString()
  });
  
  // Save updated usage
  if (kv) {
    await setUsageInKV(key, usage);
  } else {
    memoryStore.set(key, usage);
  }
  
  const result = {
    usedSeconds: usage.usedSeconds,
    remainingSeconds: Math.max(0, MAX_DAILY_SECONDS - usage.usedSeconds)
  };
  
  console.log('[usage-storage] recordSession - After - Used:', result.usedSeconds, 'Remaining:', result.remainingSeconds, 'Store:', storeType);
  
  return result;
}

export async function reserveTime(identifier, requestedSeconds) {
  const usage = await getUsage(identifier);
  const remaining = Math.max(0, MAX_DAILY_SECONDS - usage.usedSeconds);
  const reserved = Math.min(requestedSeconds, remaining);
  
  return {
    reservedSeconds: reserved,
    remainingSeconds: remaining - reserved
  };
}

