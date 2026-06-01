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
  groups
}: {
  value?: LocationId | '';
  groups: MarinaJumpGroup[];
}) {
  const currentPath = value ? `/location/${value}` : '';
  const currentLabel =
    groups.flatMap((group) => group.options).find((option) => option.path === currentPath)?.label ?? 'Select marina';

  return (
    <details className="marinaJumpMenu">
      <summary aria-label="Open marina menu">
        <span className="marinaJumpSummaryText">
          <span>Marina</span>
          <strong>{currentLabel}</strong>
        </span>
        <span className="marinaJumpBars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </summary>
      <div className="marinaJumpPanel" aria-label="Marina pages">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="marinaJumpDivider">{group.label}</div>
            {group.options.map((option) => (
              <a
                key={option.path}
                className={option.path === currentPath ? 'active' : undefined}
                href={option.path}
              >
                {option.label}
              </a>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}
