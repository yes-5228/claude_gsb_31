export default function StatCard({ label, value, unit, foot, tone = 'primary' }) {
  return (
    <div className={`stat-card${tone === 'primary' ? '' : ` is-${tone}`}`}>
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      {foot ? <div className="foot">{foot}</div> : null}
    </div>
  );
}
