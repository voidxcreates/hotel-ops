// Small date helpers. All dates are plain "YYYY-MM-DD" strings in the hotel's own time zone.
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const toYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayYmd = () => toYmd(new Date());
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return toYmd(d); };
export const diffDays = (a, b) => Math.round((parseYmd(a) - parseYmd(b)) / 864e5);
export const dayShort = (s) => WEEK[parseYmd(s).getDay()];
export const dayNum = (s) => parseYmd(s).getDate();
export const isWeekend = (s) => [0, 6].includes(parseYmd(s).getDay());
export const dayFull = (s) => { const d = parseYmd(s); return `${WEEK[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const monthYear = (s) => { const d = parseYmd(s); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
