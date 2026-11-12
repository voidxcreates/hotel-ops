// Small line icons (no icon package needed). They take their colour from the text around them.
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const make = (children) => function Icon(props) { return <svg {...base} {...props}>{children}</svg>; };

export const Power = make(<><path d="M12 3v9" /><path d="M6.4 6.6a8 8 0 1 0 11.2 0" /></>);
export const Bed = make(<><path d="M3 18V7" /><path d="M3 14h18v4" /><path d="M21 14v-2a3 3 0 0 0-3-3h-7v5" /><circle cx="7" cy="11" r="1.6" /></>);
export const Check = make(<><circle cx="12" cy="12" r="9" /><path d="m8 12.4 2.8 2.8L16.2 9.6" /></>);
export const Door = make(<><path d="M6 21V4.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 4.5V21" /><path d="M4 21h16" /><circle cx="14.5" cy="12.5" r=".6" /></>);
export const CalendarIcon = make(<><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>);
export const ArrowIn = make(<><path d="M4 12h12" /><path d="m12 7.5 4.5 4.5-4.5 4.5" /><path d="M20 4v16" /></>);
export const ArrowOut = make(<><path d="M20 12H8" /><path d="m12 7.5-4.5 4.5 4.5 4.5" /><path d="M4 4v16" /></>);
export const Bolt = make(<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z" />);
export const Plus = make(<path d="M12 5v14M5 12h14" />);
export const KeyIcon = make(<><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M16 7l3 3" /></>);
export const ListIcon = make(<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />);