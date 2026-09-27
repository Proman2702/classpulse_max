import { ROLE_LABELS } from "../../lib/labels";
import type { User } from "../../types";
import { Avatar, Cell, Icon } from "../../ui";

interface PersonPickerProps {
  people: User[];
  value: string;
  onChange: (id: string) => void;
}

/** Выбор человека из списка — ячейки с аватаром и галочкой. */
export const PersonPicker = ({ people, value, onChange }: PersonPickerProps) => (
  <div className="section__card" role="radiogroup">
    {people.map((person) => (
      <Cell
        key={person.id}
        before={<Avatar name={person.nickname} size={40} />}
        subtitle={ROLE_LABELS[person.role]}
        after={person.id === value ? <Icon name="check" className="text-accent" /> : null}
        onClick={() => onChange(person.id)}
      >
        {person.nickname}
      </Cell>
    ))}
  </div>
);
