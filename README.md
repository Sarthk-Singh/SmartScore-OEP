# SmartScore-OEP | Secure Online Examination Platform

A full-stack web application for managing and conducting online university exams with role-based access, secure exam delivery, bulk data management, and student analytics.

---

## Features

### Authentication & Authorization
- JWT-based login with role-based access control (Admin, Teacher, Student).
- First-login password change enforcement.

### Admin Dashboard
- **User Management**: Create teachers and students individually.
- **Bulk Upload**: Upload students in bulk via CSV (with row-level validation and duplicate detection).
- **Grade & Course Management**: Create, list, and delete grades and courses with safe cascade-deletion (prevents deletion if student submissions exist).
- **Teacher Assignment**: Assign or remove teachers from grades.

### Teacher Dashboard
- **Exam Lifecycle**: Create password-protected exams with title, grade, course, date, and duration.
- **Question Management**: Add MCQ questions individually or bulk upload via CSV.
- **Exam Administration**: View exam details, delete individual questions, or delete entire exams (password-protected).
- **Result Management**: View all student submissions with scores. Toggle "Release Results" / "Unpublish Results" to control student visibility.

### Student Dashboard
- **Exam Participation**: Browse available exams filtered by grade. Enter exam password to start. No cancellation allowed once started.
- **Automatic Scoring**: Answers are auto-graded upon submission. Score is hidden until the teacher releases results.
- **Result Viewing**: "View Result" button appears only after the teacher releases results. Detailed view shows each question, selected answer, and correctness.
- **Analytics Dashboard**: Overall performance percentage, per-subject analysis, upcoming exams, and recent results.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | Component-based UI |
| **Vite 7** | Dev server & build tool |
| **React Bootstrap** | Responsive UI components |
| **React Router v7** | Client-side routing |
| **Axios** | HTTP client |
| **React Toastify** | Toast notifications |
| **jwt-decode** | Client-side token decoding |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js & Express 5** | RESTful API server |
| **Prisma ORM** | Type-safe database client |
| **PostgreSQL (NeonDB)** | Relational database |
| **JWT** | Authentication tokens |
| **Bcrypt** | Password hashing |
| **Multer** | File upload handling (CSV) |
| **csv-parser** | CSV parsing for bulk uploads |

### Deployment
| Technology | Purpose |
|---|---|
| **Vercel** | Hosting (serverless backend + static frontend) |
| **NeonDB** | Managed PostgreSQL |

---

## Database Schema

```
Grade ──< Course
  │          │
  │          └──< Exam ──< Question ──< Option
  │                │                       │
  └──< User       └──< Submission ──< Answer ─┘
       (Student/       (per student)
        Teacher)
```

Key models: `User`, `Grade`, `Course`, `Exam`, `Question`, `Option`, `Submission`, `Answer`.

---

## Getting Started

### Prerequisites
- **Node.js** v18+
- **PostgreSQL** database URL (e.g., [NeonDB](https://neon.tech))

### 1. Clone & Install

```bash
git clone https://github.com/Sarthk-Singh/SmartScore-OEP.git
cd SmartScore-OEP
npm install    # Runs postinstall: installs backend + frontend deps & generates Prisma client
```

### 2. Configure Environment

Create a `.env` file in the **root** directory:

```env
DATABASE_URL="your_postgresql_connection_string"
JWT_SECRET="your_secret_key"
```

### 3. Sync Database

```bash
cd backend
npx prisma db push
```

### 4. Run Locally

Open two terminals:

**Backend** (Terminal 1):
```bash
cd backend
npm run dev          # Runs on http://localhost:8080
```

**Frontend** (Terminal 2):
```bash
cd frontend
npm run dev          # Runs on http://localhost:5173
```

### 5. Seed Admin Account

Hit the seed endpoint once to create the default admin:
```
GET http://localhost:8080/api/seed-admin
```

Default credentials: `admin@exam.com` / `admin123`

---

## Deployment (Vercel)

The project is configured for Vercel deployment:

```bash
vercel --prod
```

- **Frontend**: Built via `npm run build` → served from `frontend/dist/`.
- **Backend**: Serverless function at `api/index.js` with `/api/*` rewrites.

---

## CSV Upload Formats

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

## Usage Guide

| Role | Flow |
|---|---|
| **Admin** | Login → Create grades & courses → Create teachers → Assign teachers to grades → Create/upload students |
| **Teacher** | Login → Create exam → Add/upload questions → Wait for submissions → View results → Release results |
| **Student** | Login → View exams → Enter password → Take exam → Submit → Wait for results release → View result & analytics |
