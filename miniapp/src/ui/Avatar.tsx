const GRADIENTS = [
  ["#5AB0FF", "#1F6BFF"],
  ["#B37DFF", "#6A1BFF"],
  ["#FF8FB1", "#FF3B7F"],
  ["#FFC86B", "#FF8A34"],
  ["#6FE3C1", "#15B38A"],
  ["#7FE7F7", "#1FA9D6"],
];

const hash = (value: string) => [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

interface AvatarProps {
  name: string;
  size?: number;
}

/** Круглая аватарка с инициалами и градиентом, который зависит от имени. */
export const Avatar = ({ name, size = 44 }: AvatarProps) => {
  const [from, to] = GRADIENTS[hash(name) % GRADIENTS.length];
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
};
