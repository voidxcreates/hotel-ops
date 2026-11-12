// Turns what the owner types, like "101-104, 107, G1", into a list of room numbers.
export function parseRooms(text) {
  const out = [];
  const tokens = String(text).split(/[,;\s]+/).filter(Boolean);
  if (tokens.length === 0) return { rooms: [], error: 'Type the room numbers first.' };
  for (const t of tokens) {
    const range = t.match(/^(\d{1,6})[-\u2013\u2014](\d{1,6})$/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (a > b) return { rooms: [], error: `"${t}" is not a valid range. Type the smaller number first, like 101-104.` };
      if (b - a + 1 > 100) return { rooms: [], error: 'A range can have at most 100 rooms.' };
      for (let n = a; n <= b; n++) out.push(String(n));
    } else if (/^[A-Za-z0-9]{1,8}$/.test(t)) {
      out.push(t.toUpperCase());
    } else {
      return { rooms: [], error: `"${t}" is not a room number. Use letters and digits only, like 101 or G1.` };
    }
  }
  return { rooms: [...new Set(out)], error: '' };
}
