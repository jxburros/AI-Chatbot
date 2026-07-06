'use client';

import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ConnectionOption {
  id: string;
  label: string;
  provider: string;
  models: string[];
  error?: string;
}

const GRASS_EMOJIS = ['🌷', '🌼', '🌻', '🌱', '🌿', '🌸'];
const GRASS_ROW = Array.from({ length: 24 }, (_, i) => GRASS_EMOJIS[i % GRASS_EMOJIS.length]);

const STARTER_PROMPTS = [
  'What should I plant this spring?',
  'Tell me a joke about gardening',
  'Help me name my new houseplant',
];

export default function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hi there, I'm Sprout! 🌱 I just poked my head up through the soil to say hello. Ask me anything, and I'll do my best to help it grow into a good answer.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string>('');
  const [model, setModel] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/models')
      .then((res) => res.json())
      .then((data: { connections: ConnectionOption[] }) => {
        if (cancelled) return;
        setConnections(data.connections);
        const firstUsable = data.connections.find((c) => c.models.length > 0) ?? data.connections[0];
        if (firstUsable) {
          setConnectionId(firstUsable.id);
          setModel(firstUsable.models[0] ?? '');
        }
      })
      .catch((err) => {
        if (!cancelled) setConnectionsError(err instanceof Error ? err.message : 'Could not load models');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function handleConnectionChange(nextId: string) {
    setConnectionId(nextId);
    const next = connections.find((c) => c.id === nextId);
    setModel(next?.models[0] ?? '');
  }

  const selectedConnection = connections.find((c) => c.id === connectionId);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    if (!connectionId || !model) {
      setError('Pick a garden bed (provider) and a model before planting a message.');
      return;
    }

    setError(null);
    const nextMessages: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, connectionId, model }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => '');
        throw new Error(detail || `Request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const rawEvent of events) {
          const line = rawEvent.trim();
          if (!line.startsWith('data:')) continue;
          const payload = JSON.parse(line.slice(5).trim());

          if (payload.type === 'delta') {
            assistantText += payload.text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: assistantText };
              return updated;
            });
          } else if (payload.type === 'error') {
            throw new Error(payload.message);
          }
        }
      }

      if (!assistantText) {
        setMessages((prev) => prev.slice(0, -1));
        throw new Error('Sprout came back empty-handed. Try again?');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something wilted. Please try again.');
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.content === '') return prev.slice(0, -1);
        return prev;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="garden-shell">
      <div className="garden-sky" aria-hidden>
        <div className="garden-sun" />
        <span className="garden-cloud garden-cloud-1">☁️</span>
        <span className="garden-cloud garden-cloud-2">☁️</span>
        <span className="garden-bee">🐝</span>
      </div>

      <div className="chat-card">
        <header className="chat-header">
          <div className="chat-header-title">
            <span className="chat-avatar" aria-hidden>🌱</span>
            <div>
              <h1>Sprout&apos;s Garden Chat</h1>
              <p>a small, sunny AI assistant</p>
            </div>
          </div>

          <div className="model-row">
            <label className="model-field">
              <span>🪴 Garden bed</span>
              <select
                value={connectionId}
                onChange={(e) => handleConnectionChange(e.target.value)}
                disabled={isStreaming || connections.length === 0}
              >
                {connections.length === 0 && <option value="">Loading…</option>}
                {connections.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.models.length === 0}>
                    {c.label}
                    {c.models.length === 0 ? ' (unavailable)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="model-field">
              <span>🌼 Model</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={isStreaming || !selectedConnection || selectedConnection.models.length === 0}
              >
                {(selectedConnection?.models ?? []).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedConnection?.error && <p className="model-warning">🥀 {selectedConnection.error}</p>}
          {connectionsError && <p className="model-warning">🥀 {connectionsError}</p>}
        </header>

        <div className="chat-scroll" ref={scrollRef}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={message.role === 'user' ? 'bubble bubble-user' : 'bubble bubble-assistant'}
            >
              {message.role === 'assistant' && <span className="bubble-icon" aria-hidden>🌿</span>}
              <div className="bubble-text">
                {message.content || (isStreaming && index === messages.length - 1 ? <TypingDots /> : '')}
              </div>
              {message.role === 'user' && <span className="bubble-icon" aria-hidden>🌸</span>}
            </div>
          ))}
          {error && <div className="chat-error">🥀 {error}</div>}
        </div>

        {messages.length <= 1 && (
          <div className="starter-row">
            {STARTER_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" className="starter-chip" onClick={() => sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        )}

        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            className="chat-input"
            type="text"
            placeholder="Plant a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
          />
          <button className="chat-send" type="submit" disabled={isStreaming || !input.trim()}>
            {isStreaming ? 'Growing…' : 'Send 🌼'}
          </button>
        </form>
      </div>

      <div className="garden-grass" aria-hidden>
        {GRASS_ROW.map((emoji, index) => (
          <span key={index} className="grass-item" style={{ animationDelay: `${(index % 6) * 0.15}s` }}>
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="typing-dots" aria-label="Sprout is thinking">
      <span />
      <span />
      <span />
    </span>
  );
}
