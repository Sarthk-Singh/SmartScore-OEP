# SmartScore-OEP | Secure Online Examination Platform 🚀

A premium full-stack web application for managing and conducting online university exams with role-based access, AI-powered grading, secure delivery, and advanced analytics.

---

## ✨ Features

### 🔐 Authentication & Security
- **Multi-Role Access**: JWT-based login for Admin, Teacher, and Student roles.
- **Google OAuth 2.0**: Seamless one-tap login integration. 🔑
- **Forgot Password**: Robust email-based password recovery flow using Nodemailer. 📧
- **First-Login Enforcement**: Automatic password change prompt for new accounts.

### 🛡️ Admin Dashboard
- **User Management**: Create teachers and students with dedicated profiles.
- **Bulk Upload**: Intelligent CSV processing with row-level validation and duplicate detection. 📊
- **Grade & Course Hub**: Manage academic structure with safe cascade-deletion protections.
- **Teacher Assignment**: Dynamic searchable dropdowns for assigning teachers to grades. 🔍

### 👨‍🏫 Teacher Dashboard
- **Exam Lifecycle**: Create secure, password-protected exams with precise scheduling.
- **AI-Powered Grading**: Automated subjective answer analysis using Gemini AI. 🤖
- **Question Bank**: Support for individual MCQ/Subjective questions and bulk CSV uploads.
- **Result Analytics**: Toggle "Release Results" and view detailed performance metrics. 📈

### 🎓 Student Dashboard
- **Secure Testing**: Clean, distraction-free exam interface with persistent state.
- **Real-time Progress**: Automatic scoring for MCQs and AI-assisted grading for theory.
- **Performance Analytics**: Visual data representing subject-wise strengths and upcoming schedules. 📊
- **Result Transparency**: Detailed breakdown of answers and corrections post-release.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | Modern component-based UI |
| **Vite 7** | Lightning-fast build tool |
| **Vanilla CSS** | Premium custom styling with Glassmorphism |
| **Framer Motion** | Silky smooth micro-animations ✨ |
| **React Router v7** | Robust client-side routing |
| **Axios** | Efficient API communication |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js & Express 5** | High-performance API server |
| **Prisma ORM** | Type-safe database management |
| **PostgreSQL (Neon)** | Scalable relational database |
| **Gemini AI** | Intelligent answer grading 🤖 |
| **Nodemailer** | Secure transactional emails 📧 |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Vercel** | Scalable hosting with SPA support 🌐 |
| **Google Cloud** | OAuth and AI services |

---

## 📝 CSV Upload Formats

### Student Bulk Upload
```csv
name,email,studentId,rollNumber,universityRollNumber,grade,semester
John Doe,john@example.com,STU001,101,UNI001,BTech,3
```

### Question Bulk Upload
```csv
question,optionA,optionB,optionC,optionD,correct,marks
What is 2+2?,3,4,5,6,B,2
```

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/Sarthk-Singh/SmartScore-OEP.git
cd SmartScore-OEP
npm install
```

### 2. Environment Setup
Create a `.env` in the root (and relevant subdirectories):
```env
DATABASE_URL="your_neon_db_url"
JWT_SECRET="your_secret"
GEMINI_API_KEY="your_api_key"
EMAIL_USER="your_gmail"
EMAIL_PASS="your_app_password"
GOOGLE_CLIENT_ID="your_google_id"
FRONTEND_URL="http://localhost:5173"
```

### 3. Initialize & Run
```bash
# In backend directory
npx prisma db push
npm run dev

# In frontend directory
npm run dev
```

---

## 🌐 Deployment
The project is fully optimized for **Vercel**.
- **Rewrites**: Catch-all configuration in `vercel.json` ensures SPA routes work on refresh.
- **Serverless**: Backend is deployed as an optimized serverless function.

---

Powered by **SmartScore Engineering** ✨
