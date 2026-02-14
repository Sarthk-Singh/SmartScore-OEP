import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { auth } from "./middleware/auth.js";
import { requireRole } from "./middleware/roles.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Backend is running" });
});

import { prisma } from "./prisma.js";

app.get("/test-db", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// admin seeding endpoint
app.post("/seed-admin", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@exam.com",
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// login endpoint
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, firstLogin: user.firstLogin },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, firstLogin: user.firstLogin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// protected route example
app.get("/protected", auth, (req, res) => {
  res.json({
    message: "You are authenticated",
    user: req.user,
  });
});

// Change Password Endpoint
app.post("/change-password", auth, async (req, res) => {
  const { newPassword } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        password: hashedPassword,
        firstLogin: false
      }
    });
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// role-based route example
app.get("/admin-only", auth, requireRole("ADMIN"), (req, res) => {
  res.json({ message: "Admin access granted" });
});

// --- GRADE & COURSE MANAGEMENT ---

// Admin creates a grade
app.post("/admin/grades", auth, requireRole("ADMIN"), async (req, res) => {
  const { name } = req.body;
  try {
    const grade = await prisma.grade.create({ data: { name } });
    res.json(grade);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin lists all grades
app.get("/admin/grades", auth, async (req, res) => {
  try {
    const grades = await prisma.grade.findMany({ include: { courses: true } });
    res.json(grades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin creates a course for a grade
app.post("/admin/courses", auth, requireRole("ADMIN"), async (req, res) => {
  const { name, gradeId } = req.body;
  try {
    const course = await prisma.course.create({
      data: { name, gradeId }
    });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List courses for a specific grade
app.get("/admin/courses/:gradeId", auth, async (req, res) => {
  const { gradeId } = req.params;
  try {
    const courses = await prisma.course.findMany({ where: { gradeId } });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin creates a teacher
app.post("/admin/create-teacher", auth, requireRole("ADMIN"), async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const teacher = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "TEACHER",
      },
    });

    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin creates a student
app.post("/admin/create-student", auth, requireRole("ADMIN"), async (req, res) => {
  const { name, email, password, studentId, rollNumber, universityRollNumber, gradeId } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "STUDENT",
        studentId,
        rollNumber,
        universityRollNumber,
        gradeId
      },
    });

    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin lists all teachers
app.get("/admin/teachers", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER" },
      include: { teachingGrades: true }
    });
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin assigns teacher to a grade
app.post("/admin/assign-teacher-grade", auth, requireRole("ADMIN"), async (req, res) => {
  const { teacherId, gradeId } = req.body;
  try {
    const teacher = await prisma.user.update({
      where: { id: teacherId },
      data: {
        teachingGrades: {
          connect: { id: gradeId }
        }
      },
      include: { teachingGrades: true }
    });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher views their assigned grades
app.get("/teacher/my-grades", auth, requireRole("TEACHER"), async (req, res) => {
  try {
    const teacher = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        teachingGrades: {
          include: { courses: true }
        }
      }
    });

    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    res.json(teacher.teachingGrades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher creates an exam
app.post("/teacher/create-exam", auth, requireRole("TEACHER"), async (req, res) => {
  const { title, gradeId, courseId, scheduledDate, durationMinutes, password } = req.body;

  try {
    const exam = await prisma.exam.create({
      data: {
        title,
        gradeId,
        courseId,
        scheduledDate: new Date(scheduledDate),
        durationMinutes,
        password
      },
    });

    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher adds questions to an exam
app.post("/teacher/add-question", auth, requireRole("TEACHER"), async (req, res) => {
  const { examId, type, questionText, marks, options } = req.body;

  try {
    const question = await prisma.question.create({
      data: {
        examId,
        type,
        questionText,
        marks,
        options: {
          create: options,
        },
      },
      include: {
        options: true,
      },
    });

    res.json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher views specific exam details (including questions)
app.get("/teacher/exam/:examId", auth, requireRole("TEACHER"), async (req, res) => {
  const { examId } = req.params;
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher deletes a question
app.delete("/teacher/question/:questionId", auth, requireRole("TEACHER"), async (req, res) => {
  const { questionId } = req.params;
  try {
    // Manually delete related options first (if not cascading in DB)
    // Prisma usually handles this if relations are configured, but let's be safe or rely on Prisma.
    // The schema does not specify onDelete: Cascade for relations.
    // So we must delete children first.

    // 1. Delete options
    await prisma.option.deleteMany({
      where: { questionId }
    });

    // 2. Delete question
    await prisma.question.delete({
      where: { id: questionId }
    });

    res.json({ message: "Question deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher deletes an exam
app.delete("/teacher/exam/:examId", auth, requireRole("TEACHER"), async (req, res) => {
  const { examId } = req.params;
  const { password } = req.body;

  try {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    // Verify password
    if (exam.password !== password) {
      return res.status(403).json({ error: "Incorrect password" });
    }

    // Delete all questions and options for this exam
    // 1. Find all questions
    const questions = await prisma.question.findMany({ where: { examId }, select: { id: true } });
    const questionIds = questions.map(q => q.id);

    // 2. Delete all options for these questions
    await prisma.option.deleteMany({
      where: { questionId: { in: questionIds } }
    });

    // 3. Delete all questions
    await prisma.question.deleteMany({
      where: { examId }
    });

    // 4. Delete the exam
    await prisma.exam.delete({ where: { id: examId } });

    res.json({ message: "Exam deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher toggles result release status
app.patch("/teacher/exam/:examId/toggle-release", auth, requireRole("TEACHER"), async (req, res) => {
  const { examId } = req.params;
  try {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const updatedExam = await prisma.exam.update({
      where: { id: examId },
      data: { resultsReleased: !exam.resultsReleased }
    });
    res.json(updatedExam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher views submissions for an exam
app.get("/teacher/exam/:examId/submissions", auth, requireRole("TEACHER"), async (req, res) => {
  const { examId } = req.params;
  try {
    const submissions = await prisma.submission.findMany({
      where: { examId },
      include: {
        student: { select: { name: true, email: true } }
      }
    });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all exams (Filtered by Grade for Students)
app.get("/exams", auth, async (req, res) => {
  try {
    let whereClause = {};

    // If student, only show exams for their grade
    if (req.user.role === 'STUDENT') {
      const student = await prisma.user.findUnique({
        where: { id: req.user.userId }
      });
      if (student && student.gradeId) {
        whereClause.gradeId = student.gradeId;
      }
    }

    const exams = await prisma.exam.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { questions: true }
        },
        grade: true,
        course: true
      }
    });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student verifies exam password
app.post("/student/verify-exam", auth, requireRole("STUDENT"), async (req, res) => {
  const { examId, password } = req.body;
  try {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });

    if (!exam) return res.status(404).json({ error: "Exam not found" });

    if (exam.password && exam.password !== password) {
      return res.status(403).json({ error: "Incorrect password" });
    }

    // Check if already submitted
    const submission = await prisma.submission.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: req.user.userId
        }
      }
    });

    if (submission) {
      return res.status(400).json({ error: "You have already attempted this exam" });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student views available exams
app.get("/student/exam/:examId", auth, requireRole("STUDENT"), async (req, res) => {
  const { examId } = req.params;

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student submits exam answers
app.post("/student/submit-exam", auth, requireRole("STUDENT"), async (req, res) => {
  const { examId, answers } = req.body;

  try {
    // create submission
    const submission = await prisma.submission.create({
      data: {
        examId,
        studentId: req.user.userId,
        answers: {
          create: answers.map(a => ({
            questionId: a.questionId,
            selectedOptionId: a.selectedOptionId,
          })),
        },
      },
      include: {
        answers: {
          include: {
            question: { include: { options: true } },
            selectedOption: true,
          },
        },
      },
    });

    // auto-evaluate MCQs
    let totalScore = 0;

    for (const ans of submission.answers) {
      if (ans.selectedOption?.isCorrect) {
        totalScore += ans.question.marks;
      }
    }

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: { totalScore },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Student views their submission (only if released)
app.get("/student/submission/:examId", auth, requireRole("STUDENT"), async (req, res) => {
  const { examId } = req.params;
  try {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    if (!exam.resultsReleased) {
      return res.status(403).json({ error: "Results not yet released" });
    }

    const submission = await prisma.submission.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: req.user.userId
        }
      },
      include: {
        answers: {
          include: {
            question: { include: { options: true } },
            selectedOption: true
          }
        }
      }
    });

    if (!submission) return res.status(404).json({ error: "Submission not found" });

    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 8080;

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
