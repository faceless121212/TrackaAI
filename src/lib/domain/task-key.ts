const TASK_KEY_PATTERN = /^([A-Z][A-Z0-9]{1,4})-([1-9]\d*)$/;

export function formatTaskKey(prefix: string, number: number): string {
  if (!Number.isInteger(number) || number < 1) {
    throw new RangeError(`Task number must be a positive integer, got ${number}`);
  }
  return `${prefix}-${number}`;
}

export function parseTaskKey(key: string): { prefix: string; number: number } | null {
  const match = TASK_KEY_PATTERN.exec(key.trim().toUpperCase());
  if (!match) return null;
  return { prefix: match[1], number: Number(match[2]) };
}
