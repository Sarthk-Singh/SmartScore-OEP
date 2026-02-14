# SmartScore-OEP | Secure Online Examination Platform

A comprehensive web-based platform for managing and conducting online university exams securely.

## Features

### Role-Based Access
-   **Admin**: Manage users (teachers/students) and assign teachers to grades.
-   **Teacher**: Create and manage exams, view student submissions, release results.
-   **Student**: View available exams, take timed exams, view released results.

### Exam Management (Teacher Dashboard)
-   **Create Exams**: Set title, grade, course, date, duration, and optional password.
-   **Add Questions**: Multiple Choice Questions (MCQs) with customizable options and marks.
-   **Exam Security**: Exams can be password-protected.
-   **Exam Deletion**: Secure deletion of entire exams (requires password verification) and individual questions.
-   **Result Management**: Toggle to release or unpublish exam results for students.

### Exam Participation (Student Dashboard)
-   **Take Exams**: password-protected entry.
-   **Timed Environment**: Automatic submission or manual submission.
-   **Result Visibility**: Scores are hidden until the teacher explicitly releases them.
-   **Secure Flow**: No cancellation allowed once exam starts.

## Tech Stack

### Frontend
-   **React.js**: Component-based UI.
-   **Vite**: Fast build tool and dev server.
-   **React Bootstrap**: Responsive UI components.
-   **React Router**: Client-side routing.
-   **Axios**: HTTP client for API requests.
-   **React Toastify**: In-app notifications.

### Backend
-   **Node.js & Express.js**: RESTful API server.
-   **Prisma ORM**: Type-safe database client and migrations.
-   **PostgreSQL**: Relational database (hosted on NeonDB).
-   **JSON Web Token (JWT)**: Secure user authentication.
-   **Bcrypt**: Password hashing.

## Getting Started

### Prerequisites
-   Node.js (v18+)
-   PostgreSQL Database URL (e.g., NeonDB)

### Setup & Installation

1.  **Clone the Repository**
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

### Backend Configuration

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up Environment Variables:
    Create a `.env` file in the `backend` directory:
    ```env
    DATABASE_URL="your_postgresql_connection_string"
    JWT_SECRET="your_secret_key"
    PORT=8080
    ```

4.  Run Database Migrations:
    Initialize the database schema:
    ```bash
    npx prisma migrate dev
    ```

5.  Start the Backend Server:
    ```bash
    npm run dev
    ```
    The server will run on `http://localhost:8080`.

### Frontend Configuration

1.  Open a new terminal and navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the Frontend Application:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## Usage Guide

1.  **Login**: Use credentials provided by the admin.
2.  **Teacher Flow**: Create an exam -> Add questions -> Manage exam (delete or edit) -> Wait for students to submit -> Release results.
3.  **Student Flow**: Login -> Enter exam password -> Complete exam -> Submit -> Wait for results to be released.
