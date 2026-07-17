import type { ProcessCandidate } from '../lib/types';

interface DiscoverDialogProps {
  processes: ProcessCandidate[];
  discovering: boolean;
  sharingPort: number | null;
  onClose: () => void;
  onRefresh: () => void;
  onShare: (process: ProcessCandidate) => void;
  onShareLocal: (process: ProcessCandidate) => void;
}

export function DiscoverDialog({
  processes,
  discovering,
  sharingPort,
  onClose,
  onRefresh,
  onShare,
  onShareLocal,
}: DiscoverDialogProps) {
  return (
    <div className="dialog-backdrop">
      <section className="discover-dialog">
        <header>
          <div>
            <h2>Discover processes</h2>
            <p>Find and share running local development servers.</p>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="scan-toolbar">
          <button className="scan-chip active">Localhost</button>
          <button className="scan-chip" onClick={onRefresh} disabled={discovering}>
            {discovering ? 'Scanning...' : 'Full scan'}
          </button>
        </div>
        <div className="discovery-list">
          {processes.map((process) => (
            <article key={process.id} className="discovery-row">
              <div>
                <strong>{process.name}</strong>
                <span>
                  Port {process.port} | {process.framework ?? 'HTTP service'}
                </span>
                <small>{process.command ?? 'local process'}</small>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="primary-command small"
                  style={{ background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid rgba(59,130,246,0.3)', padding: '6px 12px' }}
                  disabled={sharingPort === process.port}
                  onClick={() => {
                    onShareLocal(process);
                    onClose();
                  }}
                >
                  Local
                </button>
                <button
                  className="primary-command small"
                  disabled={sharingPort === process.port}
                  onClick={() => {
                    onShare(process);
                    onClose();
                  }}
                >
                  Public
                </button>
              </div>
            </article>
          ))}
          {processes.length === 0 && <div className="traffic-empty">No processes found.</div>}
        </div>
      </section>
    </div>
  );
}
