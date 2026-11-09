import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import SettingsHotel from './SettingsHotel';
import SettingsRooms from './SettingsRooms';
import SettingsSubscription from './SettingsSubscription';
import './settings.css';

const TABS = [['hotel', 'Hotel'], ['rooms', 'Rooms and rates'], ['sub', 'Subscription']];

export default function Settings() {
  const [tab, setTab] = useState('hotel');
  const [hotel, setHotel] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setHotel(await api.ownerHotel()); setError(''); }
    catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <h1 className="ow-h1">Settings</h1>
      <div className="st-tabs" role="tablist" aria-label="Settings">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`panel-${k}`} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {error && <p className="error" role="alert">{error} <button className="link" onClick={load}>Try again</button></p>}
      {!hotel && !error && <p className="ow-empty">Loading...</p>}
      {hotel && (
        <>
          {/* All three stay mounted, so a half-typed change is not lost when you look at another tab. */}
          <div role="tabpanel" id="panel-hotel" aria-labelledby="tab-hotel" hidden={tab !== 'hotel'}><SettingsHotel hotel={hotel} onSaved={load} /></div>
          <div role="tabpanel" id="panel-rooms" aria-labelledby="tab-rooms" hidden={tab !== 'rooms'}><SettingsRooms /></div>
          <div role="tabpanel" id="panel-sub" aria-labelledby="tab-sub" hidden={tab !== 'sub'}><SettingsSubscription hotel={hotel} /></div>
        </>
      )}
    </>
  );
}
