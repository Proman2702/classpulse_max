const paths = {
  chat: "M4 12a8 8 0 1 1 3.3 6.5L4 19.5l1-3.2A7.9 7.9 0 0 1 4 12Z",
  class: "M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M17.5 14.7c2.2.6 3.6 2.6 4 5.3",
  inbox: "M4 13.5 6.3 5.6A2 2 0 0 1 8.2 4h7.6a2 2 0 0 1 1.9 1.6L20 13.5M4 13.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4.5M4 13.5h4.5l1 2h5l1-2H20",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c.8-3.7 3.9-6 7.5-6s6.7 2.3 7.5 6",
  heart: "M12 20s-7.5-4.4-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.6-7.5 10-7.5 10Z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4",
  plus: "M12 5v14M5 12h14",
  star: "m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8L12 3.8Z",
  send: "M4.5 12 20 4.5 16.5 20l-4.2-6.3L4.5 12Zm7.8 1.7L20 4.5",
  chevron: "m9.5 6 6 6-6 6",
  close: "M6 6l12 12M18 6 6 18",
  calendar: "M5 6.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1ZM4 10.5h16M8.5 4v4M15.5 4v4",
  shield: "M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6l7-2.5ZM12 8.5v4M12 15.8v.2",
  sparkle: "M12 3.5c.6 4.3 2.2 5.9 6.5 6.5-4.3.6-5.9 2.2-6.5 6.5-.6-4.3-2.2-5.9-6.5-6.5 4.3-.6 5.9-2.2 6.5-6.5ZM18.5 15.5c.3 1.9 1 2.7 2.8 3-1.9.3-2.5 1-2.8 2.8-.3-1.9-1-2.5-2.8-2.8 1.9-.3 2.5-1.1 2.8-3Z",
  logout: "M14.5 4.5H18a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3.5M10 16.5 5.5 12 10 7.5M5.5 12H15",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  trash: "M5 7h14M10 11v5M14 11v5M6.5 7l.8 11.2A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8L17.5 7M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2",
  check: "m5 12.5 4.5 4.5L19 7.5",
  note: "M6 4h9l4 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM8.5 12h7M8.5 15.5h5",
  refresh: "M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4",
} as const;

export type IconName = keyof typeof paths;

interface IconProps {
  name: IconName;
  size?: number;
  filled?: boolean;
  className?: string;
}

export const Icon = ({ name, size = 24, filled = false, className }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={paths[name]} />
  </svg>
);
