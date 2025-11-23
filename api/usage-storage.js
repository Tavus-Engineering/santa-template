// Usage storage with Vercel KV for persistence
// Falls back to in-memory storage if KV is not configured

let kv = null;
let kvInitialized = false;

async function initKV() {
  if (kvInitialized) return kv;
  kvInitialized = true;
  
  try {
    // Check if KV environment variables are set
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      // Try @vercel/kv first (recommended for Vercel)
      try {
        const kvModule = await import('@vercel/kv');
        // @vercel/kv exports kv directly and auto-uses env vars
        kv = kvModule.kv || kvModule.default;
        if (kv) {
          console.log('[usage-storage] Vercel KV initialized via @vercel/kv');
          return kv;
        }
      } catch (vercelKvError) {
        console.warn('[usage-storage] @vercel/kv failed, trying @upstash/redis:', vercelKvError.message);
      }
      
      // Fallback to @upstash/redis directly
      const redisModule = await import('@upstash/redis');
      kv = redisModule.Redis.fromEnv();
      console.log('[usage-storage] Vercel KV initialized via @upstash/redis');
    } else {
      console.warn('[usage-storage] KV environment variables not found, using in-memory storage (data will not persist)');
      kv = null;
    }
  } catch (error) {
    console.warn('[usage-storage] Vercel KV not available, using in-memory storage (data will not persist):', error.message);
    kv = null;
  }
  
  return kv;
}

// In-memory fallback for local dev or if KV is not configured
let memoryStore = new Map();

export const MAX_DAILY_SECONDS = 180; // 3 minutes
const MIN_USABLE_SECONDS = 7; // If less than 5 seconds remaining, treat as 0

// Normalize remaining seconds: if less than MIN_USABLE_SECONDS, return 0
function normalizeRemainingSeconds(remainingSeconds) {
  return remainingSeconds < MIN_USABLE_SECONDS ? 0 : remainingSeconds;
}

function getTodayKey(identifier) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${identifier}:${today}`;
}

async function getUsageFromKV(key) {
  if (!kv) return null;
  try {
    const data = await kv.get(key);
    if (!data) return null;
    
    // KV might return an object directly or a JSON string
    if (typeof data === 'string') {
      return JSON.parse(data);
    } else if (typeof data === 'object') {
      // Already parsed, return as-is
      return data;
    }
    return null;
  } catch (error) {
    console.warn('[usage-storage] Failed to get from KV:', error.message);
    return null;
  }
}

async function setUsageInKV(key, value) {
  if (!kv) return false;
  try {
    // KV can store objects directly, but stringify to be safe
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
  
  const rawRemaining = Math.max(0, MAX_DAILY_SECONDS - usage.usedSeconds);
  const normalizedRemaining = normalizeRemainingSeconds(rawRemaining);
  
  const result = {
    usedSeconds: usage.usedSeconds,
    remainingSeconds: normalizedRemaining,
    sessions: usage.sessions || []
  };
  
  const storeType = kv ? 'KV' : 'memory';
  console.log('[usage-storage] getUsage - Key:', key, 'Store:', storeType, 'Usage:', result);
  return result;
}

export async function canStartSession(identifier) {
  const usage = await getUsage(identifier);
  return usage.remainingSeconds >= MIN_USABLE_SECONDS;
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
  
  const rawRemaining = Math.max(0, MAX_DAILY_SECONDS - usage.usedSeconds);
  const normalizedRemaining = normalizeRemainingSeconds(rawRemaining);
  
  const result = {
    usedSeconds: usage.usedSeconds,
    remainingSeconds: normalizedRemaining
  };
  
  console.log('[usage-storage] recordSession - After - Used:', result.usedSeconds, 'Remaining:', result.remainingSeconds, 'Store:', storeType);
  
  return result;
}

export async function reserveTime(identifier, requestedSeconds) {
  const usage = await getUsage(identifier);
  const remaining = usage.remainingSeconds; // Already normalized by getUsage
  const reserved = Math.min(requestedSeconds, remaining);
  const remainingAfterReserve = normalizeRemainingSeconds(remaining - reserved);
  
  return {
    reservedSeconds: reserved,
    remainingSeconds: remainingAfterReserve
  };
}

