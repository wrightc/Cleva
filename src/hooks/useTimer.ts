import { useState, useEffect, useRef } from 'react';


interface TimerState {
  elapsedAtPause: number; // ms elapsed before current session
  startEpoch: number;     // epoch ms when current run started
}

/** Format milliseconds as MM:SS */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

interface UseTimerOptions {
  date: string | null;
  running: boolean;
  initialElapsedMs?: number;
  keyPrefix?: string;
}

interface UseTimerReturn {
  elapsedMs: number;
  formattedTime: string;
  resetTimer: () => void;
}

export function useTimer({ date, running, initialElapsedMs = 0, keyPrefix = 'sw_timer_' }: UseTimerOptions): UseTimerReturn {
  const [elapsedMs, setElapsedMs] = useState<number>(initialElapsedMs);
  const frameRef = useRef<number | null>(null);
  const timerStateRef = useRef<TimerState>({
    elapsedAtPause: initialElapsedMs,
    startEpoch: Date.now(),
  });

  // Load persisted timer state from sessionStorage on mount
  useEffect(() => {
    if (!date) return;

    const key = `${keyPrefix}${date}`;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      try {
        const parsed: TimerState = JSON.parse(stored);
        const resumedElapsed = parsed.elapsedAtPause + (Date.now() - parsed.startEpoch);
        timerStateRef.current = { elapsedAtPause: resumedElapsed, startEpoch: Date.now() };
        setElapsedMs(resumedElapsed);
      } catch {
        // ignore malformed stored state
      }
    } else {
      timerStateRef.current = { elapsedAtPause: 0, startEpoch: Date.now() };
      setElapsedMs(0);
    }
  }, [date]);

  // Persist timer state to sessionStorage whenever elapsed changes and timer is running
  useEffect(() => {
    if (!date || !running) return;

    const key = `${keyPrefix}${date}`;
    sessionStorage.setItem(
      key,
      JSON.stringify({
        elapsedAtPause: elapsedMs,
        startEpoch: Date.now(),
      })
    );
  }, [date, running, elapsedMs]);

  // Animation frame loop for live timer
  useEffect(() => {
    if (!running) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      return;
    }

    const tick = () => {
      const { elapsedAtPause, startEpoch } = timerStateRef.current;
      const now = Date.now();
      setElapsedMs(elapsedAtPause + (now - startEpoch));
      frameRef.current = requestAnimationFrame(tick);
    };

    timerStateRef.current = {
      elapsedAtPause: elapsedMs,
      startEpoch: Date.now(),
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetTimer = () => {
    timerStateRef.current = { elapsedAtPause: 0, startEpoch: Date.now() };
    setElapsedMs(0);
    if (date) {
      sessionStorage.removeItem(`${keyPrefix}${date}`);
    }
  };

  return { elapsedMs, formattedTime: formatTime(elapsedMs), resetTimer };
}
