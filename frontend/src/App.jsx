import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminProvider } from "./context/AdminContext";
import { UserProvider, useUser } from "./context/UserContext";
import AdminRoute from "./components/AdminRoute";
import StepBar from "./components/StepBar";
import Timer from "./components/Timer";
import WebcamMonitor from "./components/WebcamMonitor";
import Login from "./pages/Login";
import Otp from "./pages/Otp";
import Terms from "./pages/Terms";
import Domains from "./pages/Domains";
import Verification from "./pages/Verification";
import Quiz from "./pages/Quiz";
import Submitted from "./pages/Submitted";
import Result from "./pages/Result";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";

const LOGO = "/branding/myhourly-mark.png";

function CandidateShell() {
  const location = useLocation();
  const { user, triggerTimeUp } = useUser();
  const isLogin = location.pathname === "/";
  const isQuiz = location.pathname === "/quiz";

  return (
    <div className="app-shell candidate-shell">
      <header className="candidate-header">
        <div className="candidate-brand">
          <img src={LOGO} alt="HourlyRecruit Tech Labs" />
          <span>Assessment Platform</span>
        </div>

        {!isLogin && <StepBar />}

        {isQuiz && user.testEndTime && (
          <Timer endTime={user.testEndTime} onExpire={triggerTimeUp} />
        )}
      </header>

      {isQuiz && <WebcamMonitor />}

      <main className={`page-area ${isLogin ? "page-area--login" : ""}`}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/otp" element={<Otp />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/domains" element={<Domains />} />
          <Route path="/verify" element={<Verification />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/submitted" element={<Submitted />} />
          <Route path="/result" element={<Result />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="shell-footer">
        <span>HourlyRecruit Tech Labs</span>
        <span>·</span>
        <span>Secure assessment session</span>
      </footer>
    </div>
  );
}

function AdminShell() {
  return (
    <div className="app-shell app-shell--admin">
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
}

function Root() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return isAdminRoute ? (
    <AdminProvider>
      <AdminShell />
    </AdminProvider>
  ) : (
    <CandidateShell />
  );
}

export default function App() {
  return (
    <UserProvider>
      <Root />
    </UserProvider>
  );
}
