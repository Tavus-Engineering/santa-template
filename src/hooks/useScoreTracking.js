import { useState, useEffect, useRef } from 'react';
import {
	extractScoreTags,
	getStoredScore,
	updateScore,
	scoreToNicePercentage,
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

	// Initialize score when component mounts
	useEffect(() => {
		console.log('[useScoreTracking] Initializing score tracking:', { userId, contextId });
		const storedScore = getStoredScore(userId, contextId);
		sessionStartScoreRef.current = storedScore;
		const initialPercentage = scoreToNicePercentage(storedScore);
		console.log('[useScoreTracking] Initial score state:', {
			storedScore,
			nicePercentage: initialPercentage,
			sessionStartScore: sessionStartScoreRef.current,
		});
		setCurrentScore(storedScore);
		setNicePercentage(initialPercentage);
	}, [userId, contextId]);

	/**
	 * Processes a message and updates the score if tags are found
	 * @param {string} messageText - Message text that may contain score tags
	 * @returns {string} - Message text with tags removed (for display)
	 */
	const processMessage = (messageText) => {
		if (!messageText || typeof messageText !== 'string') {
			console.log('[useScoreTracking] processMessage - Invalid message text:', messageText);
			return messageText;
		}

		console.log('[useScoreTracking] processMessage - Processing message:', {
			messageLength: messageText.length,
			preview: messageText.substring(0, 100),
		});

		// Extract score tags
		const scoreChange = extractScoreTags(messageText);

		console.log('[useScoreTracking] processMessage - Score change extracted:', {
			scoreChange,
			hasTags: scoreChange !== 0,
		});

		// If tags were found, update the score
		if (scoreChange !== 0) {
			console.log('[useScoreTracking] processMessage - Updating score...');
			const result = updateScore(
				userId,
				contextId,
				scoreChange,
				sessionStartScoreRef.current
			);
			console.log('[useScoreTracking] processMessage - Score updated:', {
				previousScore: currentScore,
				newTotalScore: result.totalScore,
				sessionScore: result.sessionScore,
				sessionScoreChange: result.sessionScoreChange,
			});
			setCurrentScore(result.totalScore);
			const newPercentage = scoreToNicePercentage(result.totalScore);
			console.log('[useScoreTracking] processMessage - UI updating:', {
				previousPercentage: nicePercentage,
				newPercentage,
			});
			setNicePercentage(newPercentage);
		} else {
			console.log('[useScoreTracking] processMessage - No score change, skipping update');
		}

		// Return message with tags removed for display
		const cleanText = messageText.replace(/<\+>/g, '').replace(/<->/g, '');
		if (cleanText !== messageText) {
			console.log('[useScoreTracking] processMessage - Tags removed from display text');
		}
		return cleanText;
	};

	return {
		currentScore,
		nicePercentage,
		processMessage,
	};
}

