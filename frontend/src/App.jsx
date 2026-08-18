import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  UserProvider,
  useUser,
} from "./context/UserContext";

import { AdminProvider } from "./context/AdminContext";

import AdminRoute from "./components/AdminRoute";
import StepBar from "./components/StepBar";
import Timer from "./components/Timer";

import Login from "./pages/Login";
import Otp from "./pages/Otp";
import Terms from "./pages/Terms";
import Domains from "./pages/Domains";
import Quiz from "./pages/Quiz";
import Submitted from "./pages/Submitted";
import Result from "./pages/Result";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";


// ============================================================
// CANDIDATE SHELL
// ============================================================

function CandidateShell() {
  const location = useLocation();

  const isLogin = location.pathname === "/";
  const isQuiz = location.pathname === "/quiz";

  const {
    user,
    triggerTimeUp,
  } = useUser();

  return (
    <div className="app-shell">

      {/* ======================================================
          TOP NAVIGATION
      ====================================================== */}

      <header className="topnav">

        {/* BRAND */}

        <div className="topnav-brand">

          <img
            className="brand-mark-img"
            src="/branding/myhourly-mark.png"
            alt="MyHourly"
          />

          <span className="brand-name">
            MyHourly Assessments
          </span>

        </div>


        {/* STEP BAR */}

        {!isLogin && <StepBar />}


        {/* QUIZ TIMER */}

        {isQuiz && user.testEndTime && (
          <Timer
            endTime={user.testEndTime}
            onExpire={triggerTimeUp}
          />
        )}

      </header>


      {/* ======================================================
          CANDIDATE PAGE AREA
      ====================================================== */}

      <main
        className={
          isLogin
            ? "page-area page-area--login"
            : "page-area"
        }
      >

        <Routes>

          {/* ==================================================
              STEP 1 — LOGIN / REGISTRATION
          ================================================== */}

          <Route
            path="/"
            element={<Login />}
          />


          {/* ==================================================
              STEP 2 — OTP
          ================================================== */}

          <Route
            path="/otp"
            element={<Otp />}
          />


          {/* ==================================================
              STEP 3 — TERMS
          ================================================== */}

          <Route
            path="/terms"
            element={<Terms />}
          />


          {/* ==================================================
              STEP 4 — DOMAIN SELECTION
          ================================================== */}

          <Route
            path="/domains"
            element={<Domains />}
          />


          {/* ==================================================
              STEP 5 — QUIZ / ASSESSMENT
          ================================================== */}

          <Route
            path="/quiz"
            element={<Quiz />}
          />


          {/* ==================================================
              SUBMITTED SCREEN
          ================================================== */}

          <Route
            path="/submitted"
            element={<Submitted />}
          />


          {/* ==================================================
              RESULT SCREEN
          ==================================================
              
              Flow:

              Quiz
                ↓
              Finish assessment
                ↓
              Submitted
                ↓
              View Result
                ↓
              /result
                ↓
              GET /api/exams/:examId/result

          ================================================== */}

          <Route
            path="/result"
            element={<Result />}
          />


          {/* ==================================================
              UNKNOWN CANDIDATE ROUTE
          ================================================== */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </main>


      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="shell-footer">

        © {new Date().getFullYear()} MyHourly · Your responses are
        recorded only for this assessment session

      </footer>

    </div>
  );
}


// ============================================================
// ADMIN SHELL
// ============================================================

function AdminShell() {

  const location = useLocation();

  const isAdminLogin =
    location.pathname === "/admin/login";

  return (
    <div className="app-shell app-shell--admin">

      <main
        className={
          isAdminLogin
            ? "page-area page-area--login"
            : "page-area"
        }
      >

        <Routes>

          {/* ==================================================
              ADMIN LOGIN
          ================================================== */}

          <Route
            path="/admin/login"
            element={<AdminLogin />}
          />


          {/* ==================================================
              ADMIN DASHBOARD
          ================================================== */}

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

        </Routes>

      </main>

    </div>
  );
}


// ============================================================
// ROOT ROUTER
// ============================================================

function Root() {

  const location = useLocation();

  const isAdminRoute =
    location.pathname.startsWith("/admin");


  // ==========================================================
  // ADMIN APPLICATION
  // ==========================================================

  if (isAdminRoute) {

    return (
      <AdminProvider>
        <AdminShell />
      </AdminProvider>
    );

  }


  // ==========================================================
  // CANDIDATE APPLICATION
  // ==========================================================

  return (
    <CandidateShell />
  );
}


// ============================================================
// APP
// ============================================================

export default function App() {

  return (
    <UserProvider>

      <Root />

    </UserProvider>
  );
}