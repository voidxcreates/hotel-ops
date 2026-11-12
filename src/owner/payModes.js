// How money was paid. Used by the payment form, the new-reservation advance, and the reports.
export const MODES = [['CASH', 'Cash'], ['UPI', 'UPI'], ['CARD', 'Card'], ['BANK', 'Bank transfer']];
export const MODE_LABEL = Object.fromEntries(MODES);
