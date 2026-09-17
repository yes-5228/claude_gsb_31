import { NavLink, Outlet } from 'react-router-dom';

import ToastProvider from './Toast.jsx';

const NAV_ITEMS = [
  { to: '/', label: '总览看板', icon: '📊', end: true },
  { to: '/restrooms', label: '公厕台账', icon: '🏛️' },
  { to: '/inspections', label: '保洁巡查', icon: '🧹' },
  { to: '/issues', label: '问题整改', icon: '🛠️' },
];

export default function Layout() {
  return (
    <ToastProvider>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <strong>公厕保洁巡查记录系统</strong>
            <span>台账 · 巡查 · 问题 · 整改闭环</span>
          </div>
          <nav>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div>接口文档：/docs</div>
            <div>版本 v1.0.0</div>
          </div>
        </aside>
        <div className="main">
          <Outlet />
        </div>
      </div>
    </ToastProvider>
  );
}
