import { useState, useEffect, useRef, useCallback } from 'react';
import {
	extractScoreTags,
	getStoredScore,
	updateScore,
	scoreToNicePercentage,
	stripScoreTags,
} from '../utils/scoreUtils';

const DEFAULT_USER_ID = 'user';
const DEFAULT_CONTEXT_ID = 'santa-call';

/**
 * Custom hook for tracking and managing user behavior scores
 * @param {string} userId - User identifier (defaults to 'user')
 * @param {string} contextId - Context identifier (defaults to 'santa-call')
 * @returns {{currentScore: number, nicePercentage: number, processMessage: function}}
 */
export function useScoreTracking(userId = DEFAULT_USER_ID, contextId = DEFAULT_CONTEXT_ID) {
	const [currentScore, setCurrentScore] = useState(0);
	const [nicePercentage, setNicePercentage] = useState(50);
	const sessionStartScoreRef = useRef(0);

	// Initialize score when component mounts - always start at 0
	useEffect(() => {
		sessionStartScoreRef.current = 0;
		const initialPercentage = scoreToNicePercentage(0);
		setCurrentScore(0);
		setNicePercentage(initialPercentage);
	}, [userId, contextId]);

	/**
	 * Processes a message and updates the score if tags are found
	 * @param {string} messageText - Message text that may contain score tags
	 * @returns {string} - Message text with tags removed (for display)
	 */
	const processMessage = useCallback((messageText) => {
		if (!messageText || typeof messageText !== 'string') {
			return messageText;
		}

		// Extract score tags
		const scoreChange = extractScoreTags(messageText);

		// If tags were found, update the score
		if (scoreChange !== 0) {
			// Use functional update to get current score and update atomically
			setCurrentScore((prevScore) => {
				const result = updateScore(
					userId,
					contextId,
					scoreChange,
					sessionStartScoreRef.current,
					prevScore
				);
				const newPercentage = scoreToNicePercentage(result.totalScore);
				setNicePercentage(newPercentage);
				return result.totalScore;
			});
		}

		// Return message with tags removed for display
		return stripScoreTags(messageText);
	}, [userId, contextId]);

	return {
		currentScore,
		nicePercentage,
		processMessage,
	};
}

