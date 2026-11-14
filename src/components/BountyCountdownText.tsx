import React, { useEffect, useState } from 'react';
import { formatResetCountdown, getSecondsUntilDailyReset } from '../data/dailyBounties';

export const BountyCountdownText: React.FC = React.memo(() => {
  const [countdown, setCountdown] = useState<string>(() =>
    formatResetCountdown(getSecondsUntilDailyReset())
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(formatResetCountdown(getSecondsUntilDailyReset()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <>{countdown}</>;
});
