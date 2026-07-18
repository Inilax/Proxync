import type { PanelView } from '../lib/types';

interface CompanionPanelProps {
  panel: Exclude<PanelView, null>;
  onClose: () => void;
}

export function CompanionPanel({
  panel,
  onClose,
}: CompanionPanelProps) {
  return (
    <aside className="companion-panel">
      <header>
        <strong>{panel === 'chat' ? 'General chat' : 'Voice room'}</strong>
        <button onClick={onClose}>Close</button>
      </header>
      {panel === 'chat' ? (
        <div className="companion-empty">
          Workspace chat will attach to the selected project profile in the next
          collaboration pass.
        </div>
      ) : (
        <div className="voice-box">
          <button>Mute</button>
          <button>Deafen</button>
          <p>No participants yet.</p>
        </div>
      )}
    </aside>
  );
}
