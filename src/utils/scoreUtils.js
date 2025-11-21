/**
 * Score System Utilities
 * Handles tag extraction, score storage, and score updates
 */

const MIN_SCORE = -10;
const MAX_SCORE = 10;
const MAX_SESSION_SCORE = 4;

/**
 * Extracts score tags from text and calculates the score change
 * @param {string} text - Text to scan for tags
 * @returns {number} - Score change (positive for <+>, negative for <->)
 */
export function extractScoreTags(text) {
	if (!text || typeof text !== 'string') return 0;

	const plusMatches = text.match(/<\+>/g);
	const minusMatches = text.match(/<->/g);

	const plusCount = plusMatches ? plusMatches.length : 0;
	const minusCount = minusMatches ? minusMatches.length : 0;
	const scoreChange = plusCount - minusCount;

	if (scoreChange !== 0) {
		console.log('[ScoreUtils] extractScoreTags - Found tags:', {
			text: text.substring(0, 100),
			plusCount,
			minusCount,
			scoreChange,
		});
	}

	return scoreChange;
}

/**
 * Removes score tags from text for display
 * @param {string} text - Text to clean
 * @returns {string} - Text without score tags
 */
export function stripScoreTags(text) {
	if (!text || typeof text !== 'string') return text;
	return text.replace(/<\+>/g, '').replace(/<->/g, '');
}

/**
 * Gets the stored score from localStorage
 * @param {string} userId - User identifier
 * @param {string} contextId - Context identifier (e.g., 'santa-call')
 * @returns {number} - Current score (0 if not found)
 */
export function getStoredScore(userId, contextId) {
	if (typeof window === 'undefined') return 0;

	try {
		const key = `score_${userId}_${contextId.toLowerCase()}`;
		const stored = localStorage.getItem(key);
		if (stored === null) {
			console.log('[ScoreUtils] getStoredScore - No stored score found, returning 0 (middle/default)');
			return 0;
		}

		const score = parseInt(stored, 10);
		const clampedScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
		console.log('[ScoreUtils] getStoredScore - Retrieved score:', {
			key,
			raw: stored,
			parsed: score,
			clamped: clampedScore,
		});
		return clampedScore;
	} catch (error) {
		console.error('[ScoreUtils] getStoredScore - Error reading score:', error);
		return 0;
	}
}

/**
 * Stores the score to localStorage
 * @param {string} userId - User identifier
 * @param {string} contextId - Context identifier
 * @param {number} score - Score to store
 */
export function storeScore(userId, contextId, score) {
	if (typeof window === 'undefined') return;

	try {
		const key = `score_${userId}_${contextId.toLowerCase()}`;
		const clampedScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
		localStorage.setItem(key, clampedScore.toString());
		console.log('[ScoreUtils] storeScore - Stored score:', {
			key,
			score,
			clampedScore,
		});
	} catch (error) {
		console.error('[ScoreUtils] storeScore - Error storing score:', error);
	}
}

/**
 * Updates the score while enforcing session limits and bounds
 * @param {string} userId - User identifier
 * @param {string} contextId - Context identifier
 * @param {number} scoreChange - Change in score (can be positive or negative)
 * @param {number} sessionStartScore - Score at the start of the session
 * @returns {{totalScore: number, sessionScore: number, sessionScoreChange: number}}
 */
export function updateScore(userId, contextId, scoreChange, sessionStartScore) {
	console.log('[ScoreUtils] updateScore - Starting update:', {
		userId,
		contextId,
		scoreChange,
		sessionStartScore,
	});

	const currentTotal = getStoredScore(userId, contextId);
	const currentSessionScore = currentTotal - sessionStartScore;

	console.log('[ScoreUtils] updateScore - Current state:', {
		currentTotal,
		currentSessionScore,
	});

	// Calculate new session score
	const newSessionScore = currentSessionScore + scoreChange;

	// Enforce max session score (4 points)
	const cappedSessionScore = Math.min(newSessionScore, MAX_SESSION_SCORE);
	const actualSessionScoreChange = cappedSessionScore - currentSessionScore;

	// Calculate new total score
	const newTotalScore = sessionStartScore + cappedSessionScore;

	// Clamp to valid range
	const clampedTotalScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, newTotalScore));

	console.log('[ScoreUtils] updateScore - Score calculation:', {
		newSessionScore,
		cappedSessionScore,
		wasCapped: newSessionScore > MAX_SESSION_SCORE,
		newTotalScore,
		clampedTotalScore,
		actualSessionScoreChange,
	});

	// Store the new score
	storeScore(userId, contextId, clampedTotalScore);

	return {
		totalScore: clampedTotalScore,
		sessionScore: cappedSessionScore,
		sessionScoreChange: actualSessionScoreChange,
	};
}

/**
 * Converts a score (-10 to +10) to a percentage for the naughty/nice bar
 * @param {number} score - Score value (-10 to +10)
 * @returns {number} - Percentage of nice segments (0-100)
 */
export function scoreToNicePercentage(score) {
	// Convert score from -10 to +10 range to 0-100% range
	// Score -10 = 0% nice, Score 0 = 50% nice, Score +10 = 100% nice
	const percentage = ((score + 10) / 20) * 100;
	console.log('[ScoreUtils] scoreToNicePercentage - Converted:', { score, percentage });
	return percentage;
}

/**
 * Gets the current score context string for system messages
 * @param {string} userId - User identifier
 * @param {string} contextId - Context identifier
 * @returns {string} - Formatted score context like "<current_score>+3</current_score>"
 */
export function getCurrentScoreContext(userId, contextId) {
	const score = getStoredScore(userId, contextId);
	const scoreString = score >= 0 ? `+${score}` : `${score}`;
	const context = `<current_score>${scoreString}</current_score>`;
	console.log('[ScoreUtils] getCurrentScoreContext - Generated:', { userId, contextId, score, context });
	return context;
}

