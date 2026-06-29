import { useEffect, useState } from 'react';

function format(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour12: false });
}

export function LiveTime({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <time className={className} dateTime={now.toISOString()}>
      {format(now)}
    </time>
  );
}
