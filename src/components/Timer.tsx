interface TimerProps {
  formattedTime: string;
}

export function Timer({ formattedTime }: TimerProps) {
  return (
    <div className="timer" aria-label={`Time elapsed: ${formattedTime}`} aria-live="off">
      {formattedTime}
    </div>
  );
}
