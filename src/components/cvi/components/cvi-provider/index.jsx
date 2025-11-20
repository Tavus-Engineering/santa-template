import { DailyProvider } from '@daily-co/daily-react';

export const CVIProvider = ({ children }) => {
	return <DailyProvider>{children}</DailyProvider>;
};
