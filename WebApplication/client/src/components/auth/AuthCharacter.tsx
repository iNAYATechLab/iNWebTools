/**
 * The guide character on the authentication pages.
 *
 * Hand-built SVG rather than Lottie: the whole thing is about 6 kB of markup
 * that animates with CSS transforms, where Lottie would add ~250 kB of runtime
 * plus a JSON payload to render one small figure. It also means the character
 * can react to arbitrary state instantly, with no animation to seek through.
 *
 * Everything is driven by a single `mood` prop so the pages never poke at
 * internals — they describe what the user is doing and the character decides
 * how to look.
 */

export type CharacterMood =
  /** Resting: gentle blink, eyes forward. */
  | 'idle'
  /** Looking down-left at the identifier field, arm pointing. */
  | 'watching'
  /** Hands over the eyes while a password is typed. */
  | 'hiding'
  /** Peeking between the fingers — password revealed by the user. */
  | 'peeking'
  /** Arms up, celebrating a success. */
  | 'cheering'
  /** Slumped, for an error. */
  | 'sad'
  /** Head tilted, for the forgot-password page. */
  | 'thinking';

type Props = {
  mood: CharacterMood;
  /** Extra classes for sizing; the SVG scales to its container. */
  className?: string;
};

/**
 * Where the pupils sit for each mood, in local SVG units.
 * Small numbers: the eyes are only ~7 units wide.
 */
const PUPILS: Record<CharacterMood, { x: number; y: number }> = {
  idle: { x: 0, y: 0 },
  watching: { x: 2.2, y: 2.2 },
  hiding: { x: 0, y: 0 },
  peeking: { x: 0, y: 1.8 },
  cheering: { x: 0, y: -1 },
  sad: { x: 0, y: 2 },
  thinking: { x: 2, y: -1.4 },
};

/**
 * Hand offsets from their resting points, in local SVG units.
 * Left hand rests at (66,150), right at (134,150); the eyes sit at y 86.
 */
const HANDS: Record<
  CharacterMood,
  { left: { x: number; y: number }; right: { x: number; y: number } }
> = {
  idle: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
  // Points across at the form, which sits to the right of this panel.
  watching: { left: { x: 2, y: 6 }, right: { x: 24, y: -12 } },
  // Both hands squarely over the eyes.
  hiding: { left: { x: 18, y: -62 }, right: { x: -18, y: -62 } },
  // Left stays put, right drops away so one eye shows.
  peeking: { left: { x: 18, y: -62 }, right: { x: -10, y: -30 } },
  cheering: { left: { x: -14, y: -52 }, right: { x: 14, y: -52 } },
  sad: { left: { x: 4, y: 12 }, right: { x: -4, y: 12 } },
  // Hand to the chin.
  thinking: { left: { x: 0, y: 4 }, right: { x: -18, y: -46 } },
};

export function AuthCharacter({ mood, className = '' }: Props) {
  const pupil = PUPILS[mood];
  const hands = HANDS[mood];
  const eyesCovered = mood === 'hiding';
  const eyesOpen = !eyesCovered;
  // Slightly bigger while covering, so no sliver of eye shows at the edges.
  const handRadius = eyesCovered || mood === 'peeking' ? 11 : 9.5;

  return (
    <div className={`relative select-none ${className}`} aria-hidden="true">
      {/* prefers-reduced-motion is honoured for every keyframe below. */}
      <style>{`
        @keyframes a2t-float  { 0%,100% { transform: translateY(0) }    50% { transform: translateY(-6px) } }
        @keyframes a2t-blink  { 0%,92%,100% { transform: scaleY(1) }    96% { transform: scaleY(0.1) } }
        @keyframes a2t-bounce { 0%,100% { transform: translateY(0) }    50% { transform: translateY(-10px) } }
        @keyframes a2t-pulse  { 0%,100% { opacity: .25; transform: scale(1) } 50% { opacity: .5; transform: scale(1.08) } }
        @keyframes a2t-think  { 0%,100% { opacity: .3; transform: translateY(2px) } 50% { opacity: 1; transform: translateY(-2px) } }

        .a2t-body   { animation: a2t-float 4s ease-in-out infinite; transform-origin: center; }
        .a2t-eye    { animation: a2t-blink 5s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        .a2t-pupil  { transition: transform .3s cubic-bezier(.22,1,.36,1); }
        .a2t-hand   { transition: transform .35s cubic-bezier(.34,1.56,.64,1), opacity .2s; transform-origin: center; transform-box: fill-box; }
        .a2t-glow   { animation: a2t-pulse 3s ease-in-out infinite; transform-origin: center; }
        .a2t-cheer  { animation: a2t-bounce .6s ease-in-out infinite; }
        .a2t-dot    { animation: a2t-think 1.4s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .a2t-body, .a2t-eye, .a2t-glow, .a2t-cheer, .a2t-dot { animation: none !important; }
          .a2t-pupil, .a2t-hand { transition: none !important; }
        }
      `}</style>

      <svg viewBox="0 0 200 200" className="h-full w-full" role="img">
        <defs>
          <linearGradient id="a2t-shell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#337dff" />
            <stop offset="100%" stopColor="#1d5df5" />
          </linearGradient>
          <linearGradient id="a2t-face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d1a33" />
            <stop offset="100%" stopColor="#081120" />
          </linearGradient>
        </defs>

        {/* Halo */}
        <circle className="a2t-glow" cx="100" cy="100" r="72" fill="#337dff" opacity="0.25" />

        <g className={`a2t-body ${mood === 'cheering' ? 'a2t-cheer' : ''}`}>
          {/* Antenna */}
          <line
            x1="100"
            y1="46"
            x2="100"
            y2="30"
            stroke="#59a1ff"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="26" r="6" fill={mood === 'cheering' ? '#22d3ee' : '#8ec3ff'}>
            {mood === 'cheering' && (
              <animate attributeName="r" values="6;8;6" dur="0.6s" repeatCount="indefinite" />
            )}
          </circle>

          {/* Head */}
          <rect x="52" y="46" width="96" height="80" rx="26" fill="url(#a2t-shell)" />
          <rect x="62" y="58" width="76" height="56" rx="20" fill="url(#a2t-face)" />

          {/* Eyes — hidden while the hands are up, so nothing shows through. */}
          {eyesOpen && (
            <g className="a2t-eye">
              <ellipse cx="84" cy="86" rx="9" ry={mood === 'sad' ? 6 : 10} fill="#eef6ff" />
              <ellipse cx="116" cy="86" rx="9" ry={mood === 'sad' ? 6 : 10} fill="#eef6ff" />
              <g
                className="a2t-pupil"
                style={{ transform: `translate(${pupil.x}px, ${pupil.y}px)` }}
              >
                <circle cx="84" cy="86" r="4.5" fill="#0d1a33" />
                <circle cx="116" cy="86" r="4.5" fill="#0d1a33" />
                <circle cx="85.8" cy="84.2" r="1.6" fill="#fff" opacity="0.9" />
                <circle cx="117.8" cy="84.2" r="1.6" fill="#fff" opacity="0.9" />
              </g>
            </g>
          )}

          {/* Peeking: one eye open between the fingers. */}
          {mood === 'peeking' && (
            <g>
              <ellipse cx="116" cy="86" rx="7" ry="8" fill="#eef6ff" />
              <circle cx="116" cy="88" r="3.6" fill="#0d1a33" />
            </g>
          )}

          {/* Mouth */}
          {mood === 'cheering' ? (
            <path d="M88 102 Q100 114 112 102 Q100 108 88 102 Z" fill="#22d3ee" />
          ) : mood === 'sad' ? (
            <path
              d="M90 108 Q100 100 110 108"
              stroke="#fca5a5"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M91 103 Q100 110 109 103"
              stroke="#bcdaff"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* Body */}
          <rect
            x="70"
            y="130"
            width="60"
            height="42"
            rx="18"
            fill="url(#a2t-shell)"
            opacity="0.9"
          />
          <rect x="86" y="142" width="28" height="6" rx="3" fill="#bcdaff" opacity="0.6" />

          {/*
            Hands float rather than hanging off jointed arms. Rotating a limb
            around a shoulder put the hands near the chin instead of the eyes,
            and every mood needed its own correction angle. Placing each hand
            at an absolute point is exact, and one translate transition covers
            every transition between moods.
          */}
          <g
            className="a2t-hand"
            style={{ transform: `translate(${hands.left.x}px, ${hands.left.y}px)` }}
          >
            <circle cx="66" cy="150" r={handRadius} fill="#bcdaff" />
          </g>
          <g
            className="a2t-hand"
            style={{ transform: `translate(${hands.right.x}px, ${hands.right.y}px)` }}
          >
            <circle cx="134" cy="150" r={handRadius} fill="#bcdaff" />
          </g>
        </g>

        {/* Thought bubbles for the forgot-password page. */}
        {mood === 'thinking' && (
          <g>
            <circle
              className="a2t-dot"
              cx="150"
              cy="62"
              r="4"
              fill="#8ec3ff"
              style={{ animationDelay: '0s' }}
            />
            <circle
              className="a2t-dot"
              cx="162"
              cy="50"
              r="5.5"
              fill="#8ec3ff"
              style={{ animationDelay: '.2s' }}
            />
            <circle
              className="a2t-dot"
              cx="176"
              cy="36"
              r="7"
              fill="#8ec3ff"
              style={{ animationDelay: '.4s' }}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
