// ============================================================
// REAL BACKEND API SERVICE
// ============================================================
//
// Frontend -> Express Backend -> MongoDB
//
// Backend:
// http://localhost:7000
//
// Candidate APIs:
// /api/auth
// /api/domains
// /api/exams
// /api/questions
//
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL

// ============================================================
// COMMON REQUEST HELPER
// ============================================================

async function request(endpoint, options = {}) {
  const {
    method = "GET",
    body,
    token,
  } = options;

  const headers = {
    "Content-Type": "application/json",
  };

  // ==========================================================
  // JWT AUTHORIZATION
  // ==========================================================

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // ==========================================================
  // REQUEST
  // ==========================================================

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        method,
        headers,
        body: body
          ? JSON.stringify(body)
          : undefined,
      }
    );
  } catch (error) {
    throw new Error(
      "Unable to connect to the server. Please make sure the backend is running."
    );
  }

  // ==========================================================
  // PARSE RESPONSE
  // ==========================================================

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Invalid response received from server."
    );
  }

  // ==========================================================
  // BACKEND ERROR
  // ==========================================================

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

// ============================================================
// API OBJECT
// ============================================================

export const api = {

  // ==========================================================
  // AUTH APIs
  // ==========================================================

  // ==========================================================
  // REGISTER
  // ==========================================================
  //
  // POST /api/auth/register
  //
  // Body:
  // {
  //   name,
  //   email,
  //   phone
  // }
  //
  // Response:
  // {
  //   success,
  //   message,
  //   userId
  // }
  //
  // OTP is sent through Nodemailer.
  // ==========================================================

  async register({
    name,
    email,
    phone,
  }) {
    return request(
      "/auth/register",
      {
        method: "POST",

        body: {
          name,
          email,
          phone,
        },
      }
    );
  },

  // ==========================================================
  // SEND OTP
  // ==========================================================
  //
  // Alias for register.
  //
  // Kept for compatibility with older Login.jsx code.
  // ==========================================================

  async sendOtp(form) {
    return this.register(form);
  },

  // ==========================================================
  // VERIFY OTP
  // ==========================================================
  //
  // POST /api/auth/verify-otp
  //
  // Body:
  // {
  //   userId,
  //   otpCode
  // }
  //
  // Response:
  // {
  //   success,
  //   message,
  //   token,
  //   user
  // }
  //
  // ==========================================================

  async verifyOtp(
    userId,
    otpCode
  ) {
    return request(
      "/auth/verify-otp",
      {
        method: "POST",

        body: {
          userId,
          otpCode,
        },
      }
    );
  },

  // ==========================================================
  // RESEND OTP
  // ==========================================================
  //
  // POST /api/auth/resend-otp
  //
  // Body:
  // {
  //   userId
  // }
  //
  // ==========================================================

  async resendOtp(userId) {
    return request(
      "/auth/resend-otp",
      {
        method: "POST",

        body: {
          userId,
        },
      }
    );
  },

  // ==========================================================
  // ACCEPT TERMS
  // ==========================================================
  //
  // POST /api/auth/accept-terms
  //
  // Requires JWT.
  //
  // ==========================================================

  async acceptTerms(token) {
    return request(
      "/auth/accept-terms",
      {
        method: "POST",
        token,
      }
    );
  },

  // ==========================================================
  // GET CURRENT USER
  // ==========================================================
  //
  // GET /api/auth/me
  //
  // Requires JWT.
  //
  // ==========================================================

  async getMe(token) {
    return request(
      "/auth/me",
      {
        method: "GET",
        token,
      }
    );
  },

  // ==========================================================
  // DOMAIN APIs
  // ==========================================================

  // ==========================================================
  // GET ALL ACTIVE DOMAINS
  // ==========================================================
  //
  // GET /api/domains
  //
  // Requires:
  // protect
  // requireTermsAccepted
  //
  // ==========================================================

  async getDomains(token) {
    return request(
      "/domains",
      {
        method: "GET",
        token,
      }
    );
  },

  // ==========================================================
  // GET SINGLE DOMAIN
  // ==========================================================
  //
  // GET /api/domains/:id
  //
  // ==========================================================

  async getDomainById(
    domainId,
    token
  ) {
    return request(
      `/domains/${domainId}`,
      {
        method: "GET",
        token,
      }
    );
  },

  // ==========================================================
  // QUESTION APIs
  // ==========================================================

  // ==========================================================
  // GET QUESTIONS BY DOMAIN
  // ==========================================================
  //
  // GET /api/questions/:domainId
  //
  // NOTE:
  // For the actual exam, Quiz.jsx should use the questions
  // returned by /api/exams/start or /api/exams/active.
  //
  // ==========================================================

  async getQuestions(
    domainId,
    token
  ) {
    return request(
      `/questions/${domainId}`,
      {
        method: "GET",
        token,
      }
    );
  },

  // ==========================================================
  // EXAM APIs
  // ==========================================================

  // ==========================================================
  // GET ACTIVE EXAM
  // ==========================================================
  //
  // GET /api/exams/active
  //
  // Requires:
  // protect
  // requireTermsAccepted
  //
  // Used when the candidate already has an exam in progress.
  //
  // Response:
  // {
  //   success,
  //   examId,
  //   durationMinutes,
  //   startTime,
  //   status,
  //   domain,
  //   questions,
  //   answers
  // }
  //
  // ==========================================================

  async getActiveExam(token) {
    return request(
      "/exams/active",
      {
        method: "GET",
        token,
      }
    );
  },

  // ==========================================================
  // START EXAM
  // ==========================================================
  //
  // POST /api/exams/start
  //
  // Body:
  // {
  //   domainId
  // }
  //
  // Response:
  // {
  //   success,
  //   examId,
  //   durationMinutes,
  //   startTime,
  //   questions
  // }
  //
  // ==========================================================

  async startExam(
    domainId,
    token
  ) {
    return request(
      "/exams/start",
      {
        method: "POST",

        token,

        body: {
          domainId,
        },
      }
    );
  },

  // ==========================================================
  // SUBMIT ANSWER
  // ==========================================================
  //
  // POST /api/exams/answer
  //
  // MCQ:
  //
  // {
  //   examId,
  //   questionId,
  //   answerType: "mcq",
  //   selectedOption: "A"
  // }
  //
  // OUTPUT:
  //
  // {
  //   examId,
  //   questionId,
  //   answerType: "output",
  //   selectedOption: "B"
  // }
  //
  // CODING:
  //
  // {
  //   examId,
  //   questionId,
  //   answerType: "coding",
  //   code: "..."
  // }
  //
  // ==========================================================

  async submitAnswer(
    payload,
    token
  ) {
    return request(
      "/exams/answer",
      {
        method: "POST",

        token,

        body: payload,
      }
    );
  },

  // ==========================================================
  // FINISH EXAM
  // ==========================================================
  //
  // POST /api/exams/:examId/finish
  //
  // Requires JWT.
  //
  // ==========================================================

  async finishExam(
    token,
    examId
  ) {
    return request(
      `/exams/${examId}/finish`,
      {
        method: "POST",
        token,
      }
    );
  },

  // ==========================================================
  // GET EXAM RESULT
  // ==========================================================
  //
  // GET /api/exams/:examId/result
  //
  // Requires JWT.
  //
  // ==========================================================

  async getExamResult(
    token,
    examId
  ) {
    return request(
      `/exams/${examId}/result`,
      {
        method: "GET",
        token,
      }
    );
  },

  // ==========================================================
  // ADMIN APIs
  // ==========================================================
  //
  // Backend base path: /api/admin
  // All routes except /admin/login require an admin JWT
  // (Authorization: Bearer <token>) via protectAdmin.
  //
  // ==========================================================

  admin: {
    // ========================================================
    // LOGIN
    // ========================================================
    //
    // POST /api/admin/login
    //
    // Body: { email, password }
    // Response: { success, token, admin: { id, name, email } }
    //
    // ========================================================

    async login({ email, password }) {
      return request("/admin/login", {
        method: "POST",
        body: { email, password },
      });
    },

    // ========================================================
    // LOGOUT
    // ========================================================
    //
    // There is no /admin/logout route on the backend — admin
    // JWTs are stateless, so "logging out" just means the
    // frontend forgets the token. Kept as an async no-op so
    // AdminContext's existing `api.admin.logout(adminToken)`
    // call site doesn't need to change.
    // ========================================================

    async logout() {
      return Promise.resolve({ success: true });
    },

    // ========================================================
    // IS VALID TOKEN
    // ========================================================
    //
    // Synchronous check used by AdminContext to decide
    // `isAuthenticated` without an extra network round trip.
    // Decodes the JWT payload locally and checks expiry.
    // This is a UI convenience only — the backend's
    // protectAdmin middleware is what actually enforces auth
    // on every request.
    // ========================================================

    isValidToken(token) {
      if (!token) return false;

      const parts = token.split(".");
      if (parts.length !== 3) return false;

      try {
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
        );

        if (!payload.exp) return true;

        return payload.exp * 1000 > Date.now();
      } catch {
        return false;
      }
    },

    // ========================================================
    // DASHBOARD STATS
    // ========================================================
    //
    // GET /api/admin/stats
    // Response: { success, stats: { totalUsers, totalDomains,
    //             totalQuestions, totalExams } }
    //
    // ========================================================

    async getStats(token) {
      return request("/admin/stats", {
        method: "GET",
        token,
      });
    },

    // ========================================================
    // DOMAIN CRUD
    // ========================================================
    //
    // GET    /api/admin/domains
    // GET    /api/admin/domains/:id
    // POST   /api/admin/domains
    // PUT    /api/admin/domains/:id
    // DELETE /api/admin/domains/:id  (soft-deactivate, isActive=false)
    //
    // ========================================================

    async getDomains(token) {
      return request("/admin/domains", {
        method: "GET",
        token,
      });
    },

    async getDomainById(domainId, token) {
      return request(`/admin/domains/${domainId}`, {
        method: "GET",
        token,
      });
    },

    async createDomain(payload, token) {
      return request("/admin/domains", {
        method: "POST",
        token,
        body: payload,
      });
    },

    async updateDomain(domainId, payload, token) {
      return request(`/admin/domains/${domainId}`, {
        method: "PUT",
        token,
        body: payload,
      });
    },

    async deleteDomain(domainId, token) {
      return request(`/admin/domains/${domainId}`, {
        method: "DELETE",
        token,
      });
    },

    // ========================================================
    // QUESTION CRUD
    // ========================================================
    //
    // GET    /api/admin/questions               (all questions)
    // GET    /api/admin/questions/domain/:domainId
    // GET    /api/admin/questions/:id
    // POST   /api/admin/questions
    // PUT    /api/admin/questions/:id
    // DELETE /api/admin/questions/:id
    //
    // ========================================================

    async getAllQuestions(token) {
      return request("/admin/questions", {
        method: "GET",
        token,
      });
    },

    async getQuestions(domainId, token) {
      return request(`/admin/questions/domain/${domainId}`, {
        method: "GET",
        token,
      });
    },

    async getQuestionById(questionId, token) {
      return request(`/admin/questions/${questionId}`, {
        method: "GET",
        token,
      });
    },

    async createQuestion(payload, token) {
      return request("/admin/questions", {
        method: "POST",
        token,
        body: payload,
      });
    },

    async updateQuestion(questionId, payload, token) {
      return request(`/admin/questions/${questionId}`, {
        method: "PUT",
        token,
        body: payload,
      });
    },

    async deleteQuestion(domainId, questionId, token) {
      // domainId is accepted (and ignored) so the call site in
      // AdminDashboard.jsx — deleteQuestion(activeDomain, id, token) —
      // doesn't need to change. The backend deletes by question id alone.
      return request(`/admin/questions/${questionId}`, {
        method: "DELETE",
        token,
      });
    },

    // ========================================================
    // SAVE QUESTION (create or update)
    // ========================================================
    //
    // Convenience wrapper so QuestionForm can call one method
    // regardless of whether it's creating or editing. Decides
    // based on presence of payload._id / payload.id.
    //
    // ========================================================

    async saveQuestion(domainId, payload, token) {
      const questionId = payload._id || payload.id;
      const body = { ...payload, domain: domainId };
      delete body._id;
      delete body.id;

      if (questionId) {
        return this.updateQuestion(questionId, body, token);
      }
      return this.createQuestion(body, token);
    },

    // ========================================================
    // EXAM REPORTS
    // ========================================================
    //
    // GET /api/admin/exams       — list, populated user+domain
    // GET /api/admin/exams/:id   — single, populated user+domain
    //                              +questions (each with merged
    //                              `answer` from the Answer
    //                              collection)
    //
    // ========================================================

    async getExams(token) {
      return request("/admin/exams", {
        method: "GET",
        token,
      });
    },

    async getExam(examId, token) {
      return request(`/admin/exams/${examId}`, {
        method: "GET",
        token,
      });
    },

    // ========================================================
    // FORCE-FINISH AN ABANDONED EXAM
    // ========================================================
    //
    // POST /api/admin/exams/:id/force-finish
    //
    // For exams stuck at "in_progress" because the candidate
    // never came back to trigger the normal expiry check (e.g.
    // they closed the tab). Scores whatever was answered so far
    // and marks the exam completed + autoSubmitted.
    //
    // Response: { success, message, exam }
    //
    // ========================================================

    async forceFinishExam(examId, token) {
      return request(`/admin/exams/${examId}/force-finish`, {
        method: "POST",
        token,
      });
    },
  },
};