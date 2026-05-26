import { Link, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-200 bg-white px-4 py-3 shadow-[0_2px_10px_rgba(255,143,184,0.12)]">
        <div className="mx-auto max-w-7xl">
          <Link to="/" className="font-semibold text-sky-600 hover:text-sky-700">
            FumeGuard
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
