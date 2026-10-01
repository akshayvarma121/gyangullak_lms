export function canonicalize(obj: unknown): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'number') return obj.toString();
  if (typeof obj === 'boolean') return obj.toString();
  if (typeof obj === 'string') return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    const parts = obj.map(canonicalize);
    return `[${parts.join(',')}]`;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    const parts = keys
      .map((k) => {
        const v = (obj as Record<string, unknown>)[k];
        if (v === undefined) return null; // match JSON.stringify behavior
        return `${JSON.stringify(k)}:${canonicalize(v)}`;
      })
      .filter((p) => p !== null);
    return `{${parts.join(',')}}`;
  }

  throw new Error(`Cannot canonicalize type ${typeof obj}`);
}
