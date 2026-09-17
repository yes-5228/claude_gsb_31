export default function PageHeader({ title, description, actions }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="action-group">{actions}</div> : null}
    </header>
  );
}
