import { Link, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-200 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="font-semibold text-sky-600 hover:text-sky-700">
            FumeGuard
          </Link>
          <Link to="/" className="text-sm text-slate-600 hover:text-slate-900">
            Dashboard
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </Layout>
  );
}
