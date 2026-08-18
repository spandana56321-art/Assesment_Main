import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const UserContext = createContext(null);

// ============================================================
// STORAGE KEY
// ============================================================

const USER_STORAGE_KEY = "myhourly_candidate_session";

// ============================================================
// INITIAL USER / EXAM STATE
// ============================================================

const initialUser = {
  // ----------------------------------------------------------
  // USER
  // ----------------------------------------------------------

  id: null,
  name: "",
  email: "",
  phone: "",

  // ----------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------

  token: null,
  isVerified: false,

  // ----------------------------------------------------------
  // TERMS
  // ----------------------------------------------------------

  isTermsAccepted: false,

  // ----------------------------------------------------------
  // OTP
  // ----------------------------------------------------------

  otpUserId: null,

  // ----------------------------------------------------------
  // EXAM
  // ----------------------------------------------------------

  examId: null,

  selectedDomain: null,

  questions: [],

  durationMinutes: null,

  startTime: null,

  // Calculated from backend startTime.
  // Stored in milliseconds.
  testEndTime: null,

  // ----------------------------------------------------------
  // EXAM RESULT
  // ----------------------------------------------------------

  score: 0,

  totalMarks: 0,

  autoSubmitted: false,

  // ----------------------------------------------------------
  // EXAM STATUS
  // ----------------------------------------------------------

  examStatus: null,
};

// ============================================================
// LOAD USER FROM LOCAL STORAGE
// ============================================================

function loadStoredUser() {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);

    if (!stored) {
      return initialUser;
    }

    const parsed = JSON.parse(stored);

    if (!parsed || typeof parsed !== "object") {
      return initialUser;
    }

    return {
      ...initialUser,
      ...parsed,
    };
  } catch (error) {
    console.error(
      "Failed to restore candidate session:",
      error
    );

    localStorage.removeItem(USER_STORAGE_KEY);

    return initialUser;
  }
}

// ============================================================
// PROVIDER
// ============================================================

export function UserProvider({ children }) {
  // ----------------------------------------------------------
  // INITIAL STATE
  // ----------------------------------------------------------

  const [user, setUser] = useState(loadStoredUser);

  // ----------------------------------------------------------
  // HYDRATION STATE
  // ----------------------------------------------------------

  const [hydrated, setHydrated] = useState(false);

  // ----------------------------------------------------------
  // TIMER HANDLER
  // ----------------------------------------------------------

  const timeUpHandlerRef = useRef(() => {});

  // ==========================================================
  // RESTORE SESSION
  // ==========================================================

  useEffect(() => {
    setHydrated(true);
  }, []);

  // ==========================================================
  // SAVE SESSION
  // ==========================================================

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify(user)
      );
    } catch (error) {
      console.error(
        "Failed to save candidate session:",
        error
      );
    }
  }, [user, hydrated]);

  // ==========================================================
  // UPDATE USER
  // ==========================================================

  const updateUser = useCallback((fields) => {
    setUser((prev) => ({
      ...prev,
      ...fields,
    }));
  }, []);

  // ==========================================================
  // RESET USER
  // ==========================================================

  const resetUser = useCallback(() => {
    setUser(initialUser);

    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  // ==========================================================
  // LOGOUT
  // ==========================================================
  //
  // IMPORTANT:
  // This is the ONLY normal candidate action that completely
  // removes the saved login/session.
  //
  // Closing or refreshing the browser does NOT call this.
  //
  // ==========================================================

  const logout = useCallback(() => {
    // Clear React state
    setUser(initialUser);

    // Clear persisted candidate session
    localStorage.removeItem(USER_STORAGE_KEY);

    // Clear timer callback so an old quiz handler cannot fire
    // after logout.
    timeUpHandlerRef.current = () => {};
  }, []);

  // ==========================================================
  // TIMER HANDLER REGISTRATION
  // ==========================================================

  const registerTimeUpHandler = useCallback((fn) => {
    timeUpHandlerRef.current = fn || (() => {});
  }, []);

  // ==========================================================
  // TIMER EXPIRED
  // ==========================================================

  const triggerTimeUp = useCallback(() => {
    timeUpHandlerRef.current();
  }, []);

  // ==========================================================
  // CONTEXT VALUE
  // ==========================================================

  return (
    <UserContext.Provider
      value={{
        user,

        updateUser,

        resetUser,

        logout,

        hydrated,

        registerTimeUpHandler,

        triggerTimeUp,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// ============================================================
// CUSTOM HOOK
// ============================================================

export function useUser() {
  return useContext(UserContext);
}