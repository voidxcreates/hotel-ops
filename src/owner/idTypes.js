// ID document rules shared by the form, the Guests screen and the sample data.
// photos:false for Aadhaar on purpose: only the type and the last 4 digits are kept, never the card photo
// or the full number (see GUESTS-EDITS.md). Flip it only after checking the current rules.
export const ID_TYPES = {
  AADHAAR: { label: 'Aadhaar card', hint: '12 digits. Only the last 4 are kept.', test: (v) => /^\d{12}$/.test(v), photos: false },
  VOTER: { label: 'Voter ID', hint: '3 letters and 7 digits, like ABC1234567.', test: (v) => /^[A-Za-z]{3}\d{7}$/.test(v), photos: true },
  DL: { label: 'Driving licence', hint: '15 or 16 letters and digits.', test: (v) => /^[A-Za-z0-9]{15,16}$/.test(v), photos: true },
  PASSPORT: { label: 'Passport', hint: '1 letter and 7 digits, like A1234567.', test: (v) => /^[A-Za-z]\d{7}$/.test(v), photos: true },
};
export const PURPOSES = ['Tourism', 'Business', 'Family visit', 'Medical', 'Pilgrimage', 'Other'];
export const cleanId = (v) => String(v).replace(/[\s-]/g, '');
export const idText = (identity) => (identity ? `${ID_TYPES[identity.type].label} ${identity.last4}` : null);
export const maskedId = (identity) => (identity.type === 'AADHAAR' ? `XXXX XXXX ${identity.last4}` : `XXXX ${identity.last4}`);
