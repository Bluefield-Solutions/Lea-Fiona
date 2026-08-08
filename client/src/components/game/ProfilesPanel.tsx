import { useState } from 'react';
import { MAX_PROFILES, type Profile } from '../../game/storage';
import { smallBtn } from './ui-helpers';
import { ModalOverlay } from './ModalOverlay';

export function ProfilesPanel({
  profiles, activeId, onSwitch, onCreate, onDelete, onRename,
}: {
  profiles: Profile[];
  activeId: string;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => boolean;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  // Native window.confirm steals focus away from our modal stack and
  // looks completely out of place. Track the "pending delete" id and
  // render a styled in-game confirmation overlay instead.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const submitCreate = () => {
    const name = newName.trim();
    if (!name) return;
    if (onCreate(name)) setNewName('');
  };
  const submitRename = () => {
    if (!editId) return;
    const name = editName.trim();
    if (!name) return;
    onRename(editId, name);
    setEditId(null);
    setEditName('');
  };

  return (
    <div data-testid="profiles-panel" style={{ textAlign: 'left', marginBottom: 12 }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
        {profiles.map(p => {
          const isActive = p.id === activeId;
          const isEditing = editId === p.id;
          return (
            <li
              key={p.id}
              data-testid={`profile-row-${p.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 6px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {isEditing ? (
                <input
                  data-testid={`input-rename-${p.id}`}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); }}
                  autoFocus
                  maxLength={20}
                  style={{
                    flex: 1, padding: '4px 8px', borderRadius: 4,
                    border: '1px solid #888', background: '#222', color: '#fff',
                    fontFamily: 'monospace', fontSize: 13,
                  }}
                  aria-label="Profilname"
                />
              ) : (
                <span style={{ flex: 1, fontSize: 14, fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#ffd54a' : '#fff' }}>
                  {isActive ? '👤 ' : ''}{p.name}
                </span>
              )}
              {isEditing ? (
                <button
                  type="button"
                  data-testid={`button-rename-save-${p.id}`}
                  onClick={submitRename}
                  style={smallBtn('#3ab54a')}
                  aria-label="Namen speichern"
                >
                  ✓
                </button>
              ) : (
                <>
                  {!isActive && (
                    <button
                      type="button"
                      data-testid={`button-switch-${p.id}`}
                      onClick={() => onSwitch(p.id)}
                      style={smallBtn('#FFD700')}
                      aria-label={`Zu Profil ${p.name} wechseln`}
                    >
                      Wählen
                    </button>
                  )}
                  <button
                    type="button"
                    data-testid={`button-rename-${p.id}`}
                    onClick={() => { setEditId(p.id); setEditName(p.name); }}
                    style={smallBtn('#88ccff')}
                    aria-label={`Profil ${p.name} umbenennen`}
                  >
                    ✎
                  </button>
                  {profiles.length > 1 && (
                    <button
                      type="button"
                      data-testid={`button-delete-${p.id}`}
                      onClick={() => setConfirmDeleteId(p.id)}
                      style={smallBtn('#ff6666')}
                      aria-label={`Profil ${p.name} löschen`}
                    >
                      🗑
                    </button>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
      {profiles.length < MAX_PROFILES && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            data-testid="input-new-profile"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitCreate(); }}
            placeholder="Neuer Profilname"
            maxLength={20}
            style={{
              flex: 1, padding: '6px 8px', borderRadius: 4,
              border: '1px solid #888', background: '#222', color: '#fff',
              fontFamily: 'monospace', fontSize: 13,
            }}
            aria-label="Neuer Profilname"
          />
          <button
            type="button"
            data-testid="button-create-profile"
            onClick={submitCreate}
            disabled={newName.trim().length === 0}
            style={smallBtn(newName.trim() ? '#3ab54a' : '#555')}
          >
            + Anlegen
          </button>
        </div>
      )}
      {confirmDeleteId && (() => {
        const target = profiles.find(pp => pp.id === confirmDeleteId);
        if (!target) return null;
        return (
          <ModalOverlay
            testId="confirm-delete-overlay"
            title="Profil löschen?"
            onClose={() => setConfirmDeleteId(null)}
          >
            <p style={{ margin: '0 0 16px', fontSize: 14 }}>
              Profil <strong style={{ color: '#ffd54a' }}>{target.name}</strong> wirklich löschen?
              Sticker, Achievements und Highscores gehen verloren.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                type="button"
                data-testid="button-confirm-delete"
                onClick={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }}
                style={smallBtn('#ff6666')}
              >
                Ja, löschen
              </button>
              <button
                type="button"
                data-testid="button-cancel-delete"
                onClick={() => setConfirmDeleteId(null)}
                style={smallBtn('#666')}
              >
                Abbrechen
              </button>
            </div>
          </ModalOverlay>
        );
      })()}
    </div>
  );
}
