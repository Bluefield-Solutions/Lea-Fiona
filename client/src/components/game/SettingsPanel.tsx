import type { Settings } from '../../game/storage';

export function SettingsPanel({
  settings, onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  return (
    <div data-testid="settings-panel" style={{ textAlign: 'left', marginBottom: 12 }}>
      <SliderRow
        testId="slider-music-volume"
        label="Musik"
        value={settings.musicVolume}
        onChange={(v) => onChange({ musicVolume: v })}
      />
      <SliderRow
        testId="slider-sfx-volume"
        label="Effekte"
        value={settings.sfxVolume}
        onChange={(v) => onChange({ sfxVolume: v })}
      />
      <ToggleRow
        testId="toggle-screen-shake"
        label="Bildschirm-Wackeln"
        checked={settings.screenShake}
        onChange={(v) => onChange({ screenShake: v })}
      />
      <ToggleRow
        testId="toggle-stadt-gewitter"
        label="Stadt: Blitze & Donner"
        checked={settings.stadtGewitter}
        onChange={(v) => onChange({ stadtGewitter: v })}
      />
      <SliderRow
        testId="slider-regen-dichte"
        label="Stadt: Regen-Stärke"
        value={settings.regenDichte}
        onChange={(v) => onChange({ regenDichte: v })}
      />
      <SliderRow
        testId="slider-stadt-effekte"
        label="Stadt: Effekt-Stärke"
        value={settings.stadtEffekte}
        onChange={(v) => onChange({ stadtEffekte: v })}
      />
      <ToggleRow
        testId="toggle-vibration"
        label="Vibration (Mobile)"
        checked={settings.vibration}
        onChange={(v) => onChange({ vibration: v })}
      />
      <SegmentRow
        label="Grafik"
        value={settings.quality}
        options={[['auto', 'Auto'], ['low', 'Niedrig'], ['mid', 'Mittel'], ['high', 'Hoch']]}
        onChange={(v) => onChange({ quality: v as Settings['quality'] })}
      />
      <SegmentRow
        label="Steuerung"
        value={settings.touchControl}
        options={[['stick', 'Joystick'], ['buttons', 'Tasten']]}
        onChange={(v) => onChange({ touchControl: v as Settings['touchControl'] })}
      />
      <ToggleRow
        testId="toggle-webgl-post"
        label="✨ Leucht-Effekt (Bloom)"
        checked={settings.webglPost}
        onChange={(v) => onChange({ webglPost: v })}
      />
      <ToggleRow
        testId="toggle-dynamic-light"
        label="Dynamisches Licht (experimentell)"
        checked={settings.dynamicLight}
        onChange={(v) => onChange({ dynamicLight: v })}
      />
      {/* Paket 3 · Fairness: Assist-/Hilfe-Optionen für kleine Kinder klar
          gruppiert und sichtbar, damit Eltern sie schnell finden. */}
      <SectionHeader icon="🧸" title="Hilfe für kleine Kinder" />
      <ToggleRow
        testId="toggle-assist-invincible"
        label="🛡️ Unverwundbar (kein Schaden)"
        checked={settings.assistInvincible}
        onChange={(v) => onChange({ assistInvincible: v })}
      />
      <SegmentRow
        label="🐢 Spieltempo"
        value={String(settings.assistGameSpeed)}
        options={[['0.5', 'Langsam'], ['0.75', 'Ruhig'], ['1', 'Normal']]}
        onChange={(v) => onChange({ assistGameSpeed: parseFloat(v) })}
      />
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: '2px 2px 8px', lineHeight: 1.4 }}>
        Tipp: „Unverwundbar" verhindert Schaden durch Gegner und Fallen — ideal
        für die Kleinsten. Bei einem Sturz geht es sanft am Checkpoint weiter.
      </div>
      {/* Fix B-12: Der Test-/Dev-Schalter „Alle Welten freischalten" ist im
          ausgelieferten Spiel ausgeblendet (kein „(Test)"-Schalter im Player-
          UI). In der Entwicklungs-Umgebung oder mit URL-Anker #dev bleibt er
          erreichbar, damit späte Welten weiter getestet werden können. */}
      {DEV_UNLOCK_VISIBLE && (
        <ToggleRow
          testId="toggle-unlock-all-worlds"
          label="Alle Welten freischalten (Dev)"
          checked={settings.unlockAllWorlds}
          onChange={(v) => onChange({ unlockAllWorlds: v })}
        />
      )}
    </div>
  );
}

// Nur in Dev-Builds oder mit #dev im URL-Anker sichtbar (Release-UI bleibt sauber).
const DEV_UNLOCK_VISIBLE: boolean =
  (typeof import.meta !== 'undefined' && !!(import.meta as { env?: { DEV?: boolean } }).env?.DEV)
  || (typeof window !== 'undefined' && window.location.hash.toLowerCase().includes('dev'));

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      margin: '14px 0 4px', paddingBottom: 4,
      borderBottom: '1px solid rgba(255,213,74,0.35)',
      fontSize: 13, fontWeight: 'bold', color: '#ffd54a',
    }}>
      <span aria-hidden style={{ fontSize: 16 }}>{icon}</span>
      <span>{title}</span>
    </div>
  );
}

function SegmentRow({ label, value, options, onChange }: {
  label: string; value: string; options: [string, string][]; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <span style={{ flex: '0 0 130px', fontSize: 13 }}>{label}</span>
      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        {options.map(([val, lbl]) => {
          const active = value === val;
          return (
            <button
              key={val}
              type="button"
              data-testid={`quality-${val}`}
              onClick={() => onChange(val)}
              aria-pressed={active}
              style={{
                flex: 1, padding: '6px 2px', fontSize: 11, borderRadius: 6,
                cursor: 'pointer', fontWeight: active ? 'bold' : 'normal',
                whiteSpace: 'nowrap',
                border: active ? '2px solid #ffd54a' : '1px solid rgba(255,255,255,0.25)',
                background: active ? 'rgba(255,213,74,0.18)' : 'rgba(255,255,255,0.06)',
                color: active ? '#ffd54a' : '#fff',
              }}
            >
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SliderRow({ testId, label, value, onChange }: {
  testId: string; label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <span style={{ flex: '0 0 130px', fontSize: 13 }}>{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        data-testid={testId}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={`${label} Lautstärke`}
        style={{ flex: 1 }}
      />
      <span style={{ flex: '0 0 36px', textAlign: 'right', fontSize: 12, color: '#ffd54a' }}>
        {Math.round(value * 100)}%
      </span>
    </label>
  );
}

function ToggleRow({ testId, label, checked, onChange }: {
  testId: string; label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        data-testid={testId}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        style={{ width: 18, height: 18 }}
      />
    </label>
  );
}
