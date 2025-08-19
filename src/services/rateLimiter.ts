type Key = string; // userId:roomId

export class SlidingWindowLimiter {
  private limits: Map<Key, number[]> = new Map();
  constructor(private max: number, private windowMs: number) {}

  allow(userId: number, roomId: number, now = Date.now()): boolean {
    const key = `${userId}:${roomId}`;
    const arr = this.limits.get(key) || [];
    const cutoff = now - this.windowMs;
    const filtered = arr.filter((t) => t > cutoff);
    if (filtered.length >= this.max) {
      this.limits.set(key, filtered);
      return false;
    }
    filtered.push(now);
    this.limits.set(key, filtered);
    return true;
  }
}

