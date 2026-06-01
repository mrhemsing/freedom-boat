"use client";

import { useRouter } from 'next/navigation';
import type { LocationId } from '../../../lib/locations';

export type MarinaJumpGroup = {
  label: string;
  options: Array<{
    label: string;
    path: string;
  }>;
};

export default function MarinaJump({
  value,
  placeholder,
  groups
}: {
  value?: LocationId | '';
  placeholder?: string;
  groups: MarinaJumpGroup[];
}) {
  const router = useRouter();
  const currentPath = value ? `/location/${value}` : '';

  return (
    <select
      id="marinaJump"
      defaultValue={currentPath}
      className="seg segActive"
      style={{ minWidth: 190, paddingRight: 28 }}
      onChange={(e) => {
        const next = e.currentTarget.value;
        if (next) router.push(next);
      }}
    >
      {placeholder ? <option value="" disabled>{placeholder}</option> : null}
      {groups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((option) => (
            <option key={option.path} value={option.path}>
              {option.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
