# Online Examination Portal

## 📌 Overview

The Online Examination Portal is a web-based system designed to automate and manage the complete examination lifecycle in educational institutions. The project initially started as an **Answer Sheet Evaluation System** and is being extended into a **full-scale online exam portal** supporting both **objective (MCQ)** and **subjective answer evaluation**.

The system follows a **role-based architecture** with three core modules: **Admin, Teacher, and Student**, ensuring controlled access, scalability, and real-world usability.

---

## 🎯 Project Vision

The vision of this project is to build a secure, scalable, and intelligent examination platform where:

* Exams can be scheduled and conducted online
* MCQ answers are evaluated automatically
* Subjective answers are evaluated using a **machine learning–based approach**
* Results are stored centrally for long-term academic tracking

This project aims to simulate a real institutional examination environment.

---

## 🏗️ System Architecture

The application is developed using a **client–server architecture**:

* **Frontend**: React.js (User Interface)
* **Backend**: Spring Boot (Business Logic & APIs)
* **Database**: MySQL (Persistent Storage)

Communication between frontend and backend is handled using **RESTful APIs**.

---

## 👤 User Modules

### 🔐 Admin Module

The Admin is the base-level user responsible for managing the system structure.

**Responsibilities:**

* Register teachers in the system
* Assign teachers to classes, sections, or custom groups
* Control overall system configuration

---

### 👨‍🏫 Teacher Module

Teachers are responsible for academic activities and exam management.

**Features:**

* Schedule exams with date, time, subject, and topic
* Upload student lists using CSV files for bulk registration
* Add or remove individual students manually
* Create custom student groups or sections
* Add instructions or messages for each exam
* Create MCQ-based questions (initial phase)
* Define key points for subjective answers (advanced phase)

---

### 🎓 Student Module

Students are the end users who attempt the exams.

**Features:**

* Login using default credentials
* Mandatory password reset on first login
* View upcoming exams with date, time, and subject
* Read teacher-provided exam instructions
* Attempt exams only during the scheduled time window
* Submit answers securely
* View results and previous exam history

---

## ⏱️ Exam Workflow

1. Admin registers teachers and assigns responsibilities
2. Teacher schedules an exam and uploads questions
3. Students view upcoming exams
4. At exam time, students log in and attempt the test
5. Answers are submitted to the system
6. Automatic evaluation is performed
7. Results are generated and stored in the database

---

## 📝 Evaluation Strategy

### Phase 1: MCQ Evaluation

* Automatic validation based on correct options
* Used to validate system flow and correctness

### Phase 2: Subjective Evaluation (Future Scope)

* Teachers provide key points for each subjective question
* A trained machine learning model evaluates student answers
* Supports partial marking and semantic similarity checking
* Reduces manual correction effort

---

## 🗄️ Result Management

For each student, the system stores:

* Subject name
* Exam date
* Question-wise scores
* Final result

This enables:

* Easy result retrieval
* Performance tracking
* Future analytics and reporting

---

## 🛠️ Tech Stack

### Backend

* Spring Boot
* Maven

### Frontend

* React.js
* Bootstrap 5

### Database

* MySQL

---

## 💻 Development Tools

* Spring Tool Suite (STS) – Backend development
* Visual Studio Code – Frontend development
* MySQL Workbench – Database management

---

## 🚀 Future Enhancements

* Full ML-based subjective answer evaluation
* Exam a
