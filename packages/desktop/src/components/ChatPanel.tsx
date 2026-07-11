import { useState, useEffect, useRef, useCallback } from 'react';
import { api, getToken } from '../lib/api';
import { showToast } from '../lib/toast';

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000') as string;
const WS_URL = API_BASE.replace(/^http/, 'ws') + '/relay';

interface ChatPanelProps {
  workspace: any;
}

interface Message {
  id: string;
  text: string;
  kind: 'CHAT' | 'FEEDBACK';
  resolved: boolean;
  screenshotUrl?: string | null;
  createdAt: string;
  user: { id: string; name: string };
}

interface PresenceMember {
  userId: string;
  name: string;
}

export function ChatPanel({ workspace }: ChatPanelProps) {
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [kind, setKind] = useState<'CHAT' | 'FEEDBACK'>('CHAT');
  const [presence, setPresence] = useState<PresenceMember[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load channels on mount
  useEffect(() => {
    api.channels.list(workspace.id)
      .then(data => {
        setChannels(data);
        if (data.length > 0) setActiveChannel(data[0]);
      })
      .catch(() => showToast('Could not load channels', 'error'));
  }, [workspace.id]);

  // Load message history when channel changes
  useEffect(() => {
    if (!activeChannel) return;
    api.messages.list(activeChannel.id)
      .then(data => setMessages([...data].reverse()))
      .catch(() => {});
  }, [activeChannel]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Connect to WebSocket and join workspace room
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        event: 'workspace:join',
        data: { token, workspaceId: workspace.id },
      }));
      // Send presence ping every 30s to keep alive
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'presence:ping', data: {} }));
        }
      }, 30_000);
    };

    ws.onmessage = (event) => {
      try {
        const { event: evtName, data } = JSON.parse(event.data);
        if (evtName === 'presence:update') {
          setPresence(data.members ?? []);
        } else if (evtName === 'chat:message') {
          setMessages(prev => [...prev, data]);
        } else if (evtName === 'message:updated') {
          setMessages(prev => prev.map(m => m.id === data.id ? { ...m, ...data } : m));
        }
      } catch {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      ws.close();
    };
  }, [workspace.id]);

  const handleSend = useCallback(async () => {
    if (!input.trim() && !screenshot) return;
    if (!activeChannel) return;
    setSending(true);
    try {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          event: 'chat:send',
          data: {
            channelId: activeChannel.id,
            text: input.trim() || (screenshot ? '📎 Screenshot' : ''),
            kind,
            screenshotUrl: screenshot,
          },
        }));
        setInput('');
        setScreenshot(null);
        setKind('CHAT');
      } else {
        // Fallback to REST if WS not connected
        const msg = await api.messages.send(activeChannel.id, input.trim(), kind, screenshot ?? undefined);
        setMessages(prev => [...prev, msg]);
        setInput('');
        setScreenshot(null);
        setKind('CHAT');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSending(false);
    }
  }, [input, screenshot, kind, activeChannel]);

  const handleResolve = useCallback((msg: Message) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        event: 'message:resolve',
        data: { messageId: msg.id, resolved: !msg.resolved, workspaceId: workspace.id },
      }));
    }
  }, [workspace.id]);

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      showToast('Screenshot must be under 200KB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const initials = (name: string) =>
    (name ?? '?').split(' ').map(n => n?.[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 14 }}>
            # {activeChannel?.name ?? 'general'}
          </span>
        </div>
        {/* Presence avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {presence.slice(0, 5).map(m => (
            <div
              key={m.userId}
              className="presence-avatar"
              title={m.name}
            >
              {initials(m.name)}
            </div>
          ))}
          {presence.length > 5 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{presence.length - 5}</span>
          )}
          {presence.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--green)', marginLeft: 4 }}>
              {presence.length} online
            </span>
          )}
        </div>
      </div>

      {/* Channel tabs (if multiple) */}
      {channels.length > 1 && (
        <div className="chat-channels">
          {channels.map(ch => (
            <button
              key={ch.id}
              className={`chat-channel-tab ${activeChannel?.id === ch.id ? 'active' : ''}`}
              onClick={() => setActiveChannel(ch)}
            >
              # {ch.name}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <span style={{ fontSize: 28 }}>💬</span>
            <p>No messages yet. Say something!</p>
          </div>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`chat-message ${msg.kind === 'FEEDBACK' ? 'feedback' : ''} ${msg.resolved ? 'resolved' : ''}`}
          >
            <div className="chat-message-header">
              <div className="chat-avatar-sm">{initials(msg.user.name)}</div>
              <span className="chat-author">{msg.user.name}</span>
              {msg.kind === 'FEEDBACK' && (
                <span className={`feedback-badge ${msg.resolved ? 'resolved' : ''}`}>
                  {msg.resolved ? '✓ Resolved' : '⚠ Feedback'}
                </span>
              )}
              <span className="chat-time">{formatTime(msg.createdAt)}</span>
              {msg.kind === 'FEEDBACK' && (
                <button
                  className="resolve-btn"
                  onClick={() => handleResolve(msg)}
                  title={msg.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
                >
                  {msg.resolved ? '↩ Reopen' : '✓ Resolve'}
                </button>
              )}
            </div>
            {msg.text && <div className="chat-message-text">{msg.text}</div>}
            {msg.screenshotUrl && (
              <img
                src={msg.screenshotUrl}
                alt="screenshot"
                className="chat-screenshot"
                onClick={() => window.open(msg.screenshotUrl!, '_blank')}
              />
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Screenshot preview */}
      {screenshot && (
        <div className="screenshot-preview">
          <img src={screenshot} alt="preview" style={{ maxHeight: 80, borderRadius: 6 }} />
          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setScreenshot(null)}>✕</button>
        </div>
      )}

      {/* Input bar */}
      <div className="chat-input-bar">
        <button
          className={`kind-toggle ${kind === 'FEEDBACK' ? 'feedback-mode' : ''}`}
          onClick={() => setKind(k => k === 'CHAT' ? 'FEEDBACK' : 'CHAT')}
          title={kind === 'CHAT' ? 'Switch to Feedback mode' : 'Switch to Chat mode'}
        >
          {kind === 'FEEDBACK' ? '⚠' : '💬'}
        </button>
        <input
          className="chat-input"
          placeholder={kind === 'FEEDBACK' ? 'Leave feedback...' : 'Message #' + (activeChannel?.name ?? 'general')}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleScreenshot}
        />
        <button
          className="btn btn-ghost"
          style={{ padding: '6px 10px', flexShrink: 0 }}
          onClick={() => fileInputRef.current?.click()}
          title="Attach screenshot"
        >
          📎
        </button>
        <button
          className="btn btn-primary"
          style={{ padding: '6px 14px', width: 'auto', flexShrink: 0 }}
          onClick={handleSend}
          disabled={sending || (!input.trim() && !screenshot)}
        >
          {sending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '↑'}
        </button>
      </div>
    </div>
  );
}
