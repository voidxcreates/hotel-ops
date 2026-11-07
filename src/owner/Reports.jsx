import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { inr } from '../util';
import { addDays, dayFull, parseYmd, toYmd, todayYmd } from './dates';
import { MODES } from './payModes';
import { MAX_HISTORY_DAYS, MAX_SPAN_DAYS, dayRows, downloadReport, presetRange, rangeError, totalsOf } from './reportTools';
import './reports.css';

const PRESETS = [['1', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['custom', 'Custom dates']];

// "This month" and "Last month" shortcuts for custom dates (last month always fits in 31 days).
function monthRange(offset) {
  const t = parseYmd(todayYmd());
  const first = new Date(t.getFullYear(), t.getMonth() + offset, 1);
  const last = offset === 0 ? t : new Date(t.getFullYear(), t.getMonth() + offset + 1, 0);
  return { from: toYmd(first), to: toYmd(last) };
}

export default function Reports() {
  const { user } = useAuth();
  const [preset, setPreset] = useState('7');
  const [custom, setCustom] = useState(() => presetRange(7));
  const [data, setData] = useState(null); // { key, report }
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const range = preset === 'custom' ? custom : presetRange(Number(preset));
  const problem = rangeError(range);
  const key = `${range.from}|${range.to}`;
  const today = todayYmd();
  const earliest = addDays(today, -(MAX_HISTORY_DAYS - 1));

  // Ask the server for the chosen dates whenever they change.
  useEffect(() => {
    if (problem) return undefined;
    let alive = true;
    setError('');
    api.ownerReport(range.from, range.to)
      .then((report) => { if (alive) setData({ key, report }); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [key, problem]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = !problem && data && data.key === key;
  const rows = useMemo(() => (ready ? dayRows(data.report) : []), [ready, data]);
  const tot = useMemo(() => totalsOf(rows), [rows]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  function download() {
    downloadReport({ hotelName: user?.hotelName || 'Hotel', report: data.report });
    setNotice('Report downloaded.');
  }

  const setDate = (k) => (e) => { setPreset('custom'); setCustom({ ...range, [k]: e.target.value }); };

  return (
    <>
      <h1 className="ow-h1">Reports</h1>
      <p className="ow-sub">Records go back {MAX_HISTORY_DAYS} days, and one report covers at most {MAX_SPAN_DAYS} days.</p>

      <div className="ow-panel rp-controls">
        <label>Period
          <select value={preset} onChange={(e) => { if (e.target.value === 'custom') setCustom(range); setPreset(e.target.value); }}>
            {PRESETS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </label>
        <label>From<input type="date" value={range.from} min={earliest} max={today} onChange={setDate('from')} disabled={preset !== 'custom'} /></label>
        <label>To<input type="date" value={range.to} min={earliest} max={today} onChange={setDate('to')} disabled={preset !== 'custom'} /></label>
        <button className="btn" onClick={download} disabled={!ready}>Download report (ZIP)</button>
        {preset === 'custom' && (
          <div className="rp-quick">
            <button className="btn alt sm" onClick={() => setCustom(monthRange(0))}>This month</button>
            <button className="btn alt sm" onClick={() => setCustom(monthRange(-1))}>Last month</button>
          </div>
        )}
      </div>

      <div aria-live="polite">
        {problem && <p className="error" role="alert">{problem}</p>}
        {error && !problem && <p className="error" role="alert">{error}</p>}
        {notice && <p className="notice">{notice}</p>}
      </div>

      {!problem && !ready && !error && <p className="ow-empty">Loading...</p>}

      {ready && (
        <>
          <div className="rp-stats">
            <div className="ow-stat"><div className="k">Check-ins</div><div className="v">{tot.checkIns}</div></div>
            <div className="ow-stat"><div className="k">Check-outs</div><div className="v">{tot.checkOuts}</div></div>
            <div className="ow-stat"><div className="k">Collected</div><div className="v">{inr(tot.collected)}</div></div>
          </div>
          <p className="rp-modes">
            {MODES.map(([k, v]) => <span key={k} className="ow-chip">{v} <b>{inr(tot.byMode[k])}</b></span>)}
          </p>
          <div className="tablewrap ow-panel rp-table">
            <table>
              <thead><tr><th>Date</th><th>Check-ins</th><th>Check-outs</th><th>Collected</th></tr></thead>
              <tbody>
                {rows.map((r) => <tr key={r.date}><td>{dayFull(r.date)}</td><td>{r.checkIns}</td><td>{r.checkOuts}</td><td>{inr(r.collected)}</td></tr>)}
              </tbody>
              <tfoot><tr><td>Total</td><td>{tot.checkIns}</td><td>{tot.checkOuts}</td><td>{inr(tot.collected)}</td></tr></tfoot>
            </table>
          </div>
        </>
      )}
    </>
  );
}
