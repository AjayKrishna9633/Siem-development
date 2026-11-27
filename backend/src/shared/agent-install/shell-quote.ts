// Single-quoted literals: nothing inside is expanded by the shell. Values are still validated
// before they get here; quoting is the second line of defence, not the first.
export const quotePowerShell = (value: string): string => `'${value.replaceAll("'", "''")}'`;

export const quoteBash = (value: string): string => `'${value.replaceAll("'", `'\\''`)}'`;
