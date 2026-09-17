export default function Field({ label, children, full, hint, error }) {
  return (
    <div className={`field${full ? ' grow' : ''}`}>
      <label>{label}</label>
      {children}
      {hint ? <span className="muted" style={{ fontSize: 12 }}>{hint}</span> : null}
      {error ? <span className="error-text">{error}</span> : null}
    </div>
  );
}
