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
 * @returns {number} - Score change (positive for <score:+> or <scoring:+> through 7 signs, negative for <score:-> or <scoring:-> through 7 signs)
 */
export function extractScoreTags(text) {
	if (!text || typeof text !== 'string') return 0;

	let plusPoints = 0;
	let minusPoints = 0;
	let workingText = text;

	// Match in order from most to least specific (7 down to 1) to avoid double counting
	// Support both <score:-> and <scoring:-> patterns
	// Process positive signs (7 down to 1)
	for (let i = 7; i >= 1; i--) {
		const signs = '+'.repeat(i);
		// Match both <score:+++> and <scoring:+++>
		const pattern1 = `<score:${signs}>`;
		const pattern2 = `<scoring:${signs}>`;
		const regex1 = new RegExp(pattern1.replace(/\+/g, '\\+'), 'g');
		const regex2 = new RegExp(pattern2.replace(/\+/g, '\\+'), 'g');
		
		const matches1 = workingText.match(regex1);
		const matches2 = workingText.match(regex2);
		
		if (matches1) {
			plusPoints += matches1.length * i;
			workingText = workingText.replace(regex1, '');
		}
		if (matches2) {
			plusPoints += matches2.length * i;
			workingText = workingText.replace(regex2, '');
		}
	}

	// Reset working text for negative signs
	workingText = text;

	// Process negative signs (7 down to 1)
	for (let i = 7; i >= 1; i--) {
		const signs = '-'.repeat(i);
		// Match both <score:--> and <scoring:-->
		const pattern1 = `<score:${signs}>`;
		const pattern2 = `<scoring:${signs}>`;
		const regex1 = new RegExp(pattern1.replace(/-/g, '\\-'), 'g');
		const regex2 = new RegExp(pattern2.replace(/-/g, '\\-'), 'g');
		
		const matches1 = workingText.match(regex1);
		const matches2 = workingText.match(regex2);
		
		if (matches1) {
			minusPoints += matches1.length * i;
			workingText = workingText.replace(regex1, '');
		}
		if (matches2) {
			minusPoints += matches2.length * i;
			workingText = workingText.replace(regex2, '');
		}
	}

	const scoreChange = plusPoints - minusPoints;

	return scoreChange;
}

/**
 * Removes score tags from text for display
 * @param {string} text - Text to clean
 * @returns {string} - Text without score tags
 */
export function stripScoreTags(text) {
	if (!text || typeof text !== 'string') return text;
	
	// Remove in order from most to least specific (7 down to 1) to avoid partial matches
	// Support both <score:-> and <scoring:-> patterns
	let cleanedText = text;
	
	// Remove positive signs (7 down to 1)
	for (let i = 7; i >= 1; i--) {
		const signs = '+'.repeat(i);
		const pattern1 = `<score:${signs}>`;
		const pattern2 = `<scoring:${signs}>`;
		const regex1 = new RegExp(pattern1.replace(/\+/g, '\\+'), 'g');
		const regex2 = new RegExp(pattern2.replace(/\+/g, '\\+'), 'g');
		cleanedText = cleanedText.replace(regex1, '').replace(regex2, '');
	}
	
	// Remove negative signs (7 down to 1)
	for (let i = 7; i >= 1; i--) {
		const signs = '-'.repeat(i);
		const pattern1 = `<score:${signs}>`;
		const pattern2 = `<scoring:${signs}>`;
		const regex1 = new RegExp(pattern1.replace(/-/g, '\\-'), 'g');
		const regex2 = new RegExp(pattern2.replace(/-/g, '\\-'), 'g');
		cleanedText = cleanedText.replace(regex1, '').replace(regex2, '');
	}
	
	return cleanedText;
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
			return 0;
		}

		const score = parseInt(stored, 10);
		const clampedScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
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
 * @param {number} currentTotal - Current total score (from state, not localStorage)
 * @returns {{totalScore: number, sessionScore: number, sessionScoreChange: number}}
 */
export function updateScore(userId, contextId, scoreChange, sessionStartScore, currentTotal = 0) {
	const currentSessionScore = currentTotal - sessionStartScore;

	// Calculate new session score
	const newSessionScore = currentSessionScore + scoreChange;

	// Enforce max session score (4 points)
	const cappedSessionScore = Math.min(newSessionScore, MAX_SESSION_SCORE);
	const actualSessionScoreChange = cappedSessionScore - currentSessionScore;

	// Calculate new total score
	const newTotalScore = sessionStartScore + cappedSessionScore;

	// Clamp to valid range
	const clampedTotalScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, newTotalScore));

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
	return percentage;
}

// /**
//  * Gets the current score context string for system messages
//  * @param {string} userId - User identifier (deprecated, kept for compatibility)
//  * @param {string} contextId - Context identifier (deprecated, kept for compatibility)
//  * @param {number} currentScore - Current score from state (defaults to 0)
//  * @returns {string} - Formatted score context like "<current_score>+3</current_score>"
//  */
// export function getCurrentScoreContext(userId, contextId, currentScore = 0) {
// 	const scoreString = currentScore >= 0 ? `+${currentScore}` : `${currentScore}`;
// 	const context = `<current_score>${scoreString}</current_score>`;
// 	return context;
// }

