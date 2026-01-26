export function App() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '1rem' }}>MapGen Studio</h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        Civ7 Map Generation Pipeline Visualizer (Preview Demo A)
      </p>
      <div
        style={{
          background: '#16213e',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <p style={{ color: '#4ecca3', fontFamily: 'monospace' }}>
          Deployment successful.
        </p>
        <p style={{ color: '#9ca3af', marginTop: '0.75rem', fontSize: '0.9rem' }}>
          Preview Demo B: (this PR should NOT get a preview)
        </p>
        <p style={{ color: '#666', marginTop: '1rem', fontSize: '0.9rem' }}>
          Next: Web Worker + deck.gl integration
        </p>
      </div>
    </div>
  );
}
