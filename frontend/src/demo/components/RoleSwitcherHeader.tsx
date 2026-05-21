// demo/components/RoleSwitcherHeader.tsx — persistent operating-role switcher (D-07/D-08).
// Bound to the shared store's currentRole via SET_ROLE — NOT local component state. Showing the
// active role's op set keeps the SoD legible on screen.
import { ROLES, type RoleId } from "../lib/model";
import { useWorld, useWorldDispatch } from "../store/world-state";
import { Field, Pill, Select } from "./ui";

export function RoleSwitcherHeader() {
  const { currentRole } = useWorld();
  const dispatch = useWorldDispatch();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-5xl gap-3 px-6 py-4 sm:grid-cols-2 sm:items-end">
        <Field label="Operating as role">
          <Select<RoleId>
            value={currentRole}
            onChange={(role) => dispatch({ type: "SET_ROLE", role })}
            options={(Object.keys(ROLES) as RoleId[]).map((r) => ({
              value: r,
              label: ROLES[r].label,
            }))}
          />
        </Field>
        <div className="flex flex-wrap gap-1">
          {ROLES[currentRole].ops.map((o) => (
            <Pill key={o}>{o}</Pill>
          ))}
        </div>
      </div>
    </header>
  );
}
