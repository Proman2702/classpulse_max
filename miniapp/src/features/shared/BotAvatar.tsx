/** Логотип ClassPulse: пузырь сообщения с «пульсом» в цветах MAX. */
export const BotAvatar = ({ size = 40 }: { size?: number }) => (
  <span className="bot-avatar" style={{ width: size, height: size }} aria-hidden="true">
    <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12.5h4l2.2-5 3.6 10 2.4-5H21" />
    </svg>
  </span>
);
