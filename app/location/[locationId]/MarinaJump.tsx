"use client";

import { useRouter } from 'next/navigation';
import type { LocationId } from '../../../lib/locations';

export default function MarinaJump({ value }: { value: LocationId }) {
  const router = useRouter();

  return (
    <select
      id="marinaJump"
      defaultValue={value}
      className="seg segActive"
      style={{ minWidth: 190, paddingRight: 28 }}
      onChange={(e) => {
        const next = e.currentTarget.value;
        if (next) router.push(`/location/${next}`);
      }}
    >
      <option value="port-moody">Port Moody</option>
      <option value="west-vancouver">West Vancouver</option>
      <option value="north-saanich">North Saanich</option>
    </select>
  );
}
