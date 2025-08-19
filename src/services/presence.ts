const counts = new Map<number, number>();

export function connect(userId: number): boolean {
  const prev = counts.get(userId) || 0;
  counts.set(userId, prev + 1);
  return prev === 0;
}

export function disconnect(userId: number): boolean {
  const prev = counts.get(userId) || 0;
  const next = prev - 1;
  if (next <= 0) {
    counts.delete(userId);
    return true; // went offline
  } else {
    counts.set(userId, next);
    return false;
  }
}

export function isOnline(userId: number): boolean {
  return (counts.get(userId) || 0) > 0;
}

