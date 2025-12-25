import { Routes, Route, Link, useLocation } from 'react-router-dom';

// Simple placeholder pages
const Settings = () => (
  <div className="p-4">
    <h2 className="text-xl font-bold">Settings</h2>
    <p>Configuration options go here.</p>
  </div>
);
const About = () => (
  <div className="p-4">
    <h2 className="text-xl font-bold">About</h2>
    <p>Easy Extension v1.0.0</p>
  </div>
);
const Help = () => (
  <div className="p-4">
    <h2 className="text-xl font-bold">Help</h2>
    <p>How to use this extension.</p>
  </div>
);

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <nav className="w-64 bg-white shadow-md min-h-screen p-4">
        <h1 className="text-xl font-bold mb-6 text-gray-800">Easy Extension</h1>
        <div className="space-y-2">
          <NavLink to="/settings">Settings</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/help">Help</NavLink>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <Routes>
          <Route path="/" element={<Settings />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </main>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <Link
      to={to}
      className={`block px-4 py-2 rounded transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {children}
    </Link>
  );
}
