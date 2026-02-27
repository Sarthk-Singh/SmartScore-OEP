import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { auth } from "./middleware/auth.js";
import { requireRole } from "./middleware/roles.js";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "text/csv" && !file.originalname.endsWith(".csv")) {
      return cb(new Error("Only CSV files are allowed"));
    }
    cb(null, true);
  }
});

const app = express();

app.use(cors());
app.use(express.json());


const apiRouter = express.Router();

apiRouter.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Backend is running" });
});

import { prisma } from "./prisma.js";

apiRouter.get("/test-db", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// admin seeding endpoint
apiRouter.post("/seed-admin", async (req, res) => {
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
apiRouter.post("/login", async (req, res) => {
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
apiRouter.get("/protected", auth, (req, res) => {
  res.json({
    message: "You are authenticated",
    user: req.user,
  });
});

// Change Password Endpoint
apiRouter.post("/change-password", auth, async (req, res) => {
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
apiRouter.get("/admin-only", auth, requireRole("ADMIN"), (req, res) => {
  res.json({ message: "Admin access granted" });
});

// --- ADMIN OVERVIEW ---
apiRouter.get("/admin/overview", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const [totalTeachers, totalStudents, grades] = await Promise.all([
      prisma.user.count({ where: { role: "TEACHER" } }),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.grade.findMany({
        include: {
          courses: { select: { id: true, name: true } },
          students: { select: { id: true } },
          teachers: { select: { id: true, name: true, email: true } },
          exams: { select: { id: true } }
        }
      })
    ]);

    const gradeDetails = grades.map(g => ({
      id: g.id,
      name: g.name,
      studentCount: g.students.length,
      teacherCount: g.teachers.length,
      courseCount: g.courses.length,
      examCount: g.exams.length,
      courses: g.courses,
      teachers: g.teachers
    }));

    res.json({
      totalTeachers,
      totalStudents,
      totalGrades: grades.length,
      grades: gradeDetails
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GRADE & COURSE MANAGEMENT ---

// Admin creates a grade
apiRouter.post("/admin/grades", auth, requireRole("ADMIN"), async (req, res) => {
  const { name } = req.body;
  try {
    const grade = await prisma.grade.create({ data: { name } });
    res.json(grade);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin lists all grades
apiRouter.get("/admin/grades", auth, async (req, res) => {
  try {
    const grades = await prisma.grade.findMany({ include: { courses: true } });
    res.json(grades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin creates a course for a grade
apiRouter.post("/admin/courses", auth, requireRole("ADMIN"), async (req, res) => {
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
apiRouter.get("/admin/courses/:gradeId", auth, async (req, res) => {
  const { gradeId } = req.params;
  try {
    const courses = await prisma.course.findMany({ where: { gradeId } });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin deletes a grade
apiRouter.delete("/admin/grades/:gradeId", auth, requireRole("ADMIN"), async (req, res) => {
  const { gradeId } = req.params;
  try {
    // Check if any exams under this grade have submissions
    const submissionCount = await prisma.submission.count({
      where: { exam: { gradeId } }
    });
    if (submissionCount > 0) {
      return res.status(400).json({
        error: "Cannot delete this grade — it has exams with student submissions. Remove submissions first."
      });
    }

    // Use a transaction to safely cascade-delete everything
    await prisma.$transaction(async (tx) => {
      // Find all exams for this grade
      const exams = await tx.exam.findMany({ where: { gradeId }, select: { id: true } });
      const examIds = exams.map(e => e.id);

      if (examIds.length > 0) {
        // Find all questions in those exams
        const questions = await tx.question.findMany({
          where: { examId: { in: examIds } }, select: { id: true }
        });
        const questionIds = questions.map(q => q.id);

        if (questionIds.length > 0) {
          await tx.option.deleteMany({ where: { questionId: { in: questionIds } } });
        }
        await tx.question.deleteMany({ where: { examId: { in: examIds } } });
        await tx.exam.deleteMany({ where: { gradeId } });
      }

      // Delete courses under this grade
      await tx.course.deleteMany({ where: { gradeId } });

      // Disconnect all teachers from this grade
      const teachers = await tx.user.findMany({
        where: { role: "TEACHER", teachingGrades: { some: { id: gradeId } } },
        select: { id: true }
      });
      for (const teacher of teachers) {
        await tx.user.update({
          where: { id: teacher.id },
          data: { teachingGrades: { disconnect: { id: gradeId } } }
        });
      }

      // Unset gradeId for students in this grade
      await tx.user.updateMany({
        where: { role: "STUDENT", gradeId },
        data: { gradeId: null }
      });

      // Delete the grade
      await tx.grade.delete({ where: { id: gradeId } });
    }, { maxWait: 10000, timeout: 15000 });

    res.json({ message: "Grade deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin deletes a course
apiRouter.delete("/admin/courses/:courseId", auth, requireRole("ADMIN"), async (req, res) => {
  const { courseId } = req.params;
  try {
    // Check if any exams under this course have submissions
    const submissionCount = await prisma.submission.count({
      where: { exam: { courseId } }
    });
    if (submissionCount > 0) {
      return res.status(400).json({
        error: "Cannot delete this course — it has exams with student submissions. Remove submissions first."
      });
    }

    await prisma.$transaction(async (tx) => {
      // Find all exams for this course
      const exams = await tx.exam.findMany({ where: { courseId }, select: { id: true } });
      const examIds = exams.map(e => e.id);

      if (examIds.length > 0) {
        const questions = await tx.question.findMany({
          where: { examId: { in: examIds } }, select: { id: true }
        });
        const questionIds = questions.map(q => q.id);

        if (questionIds.length > 0) {
          await tx.option.deleteMany({ where: { questionId: { in: questionIds } } });
        }
        await tx.question.deleteMany({ where: { examId: { in: examIds } } });
        await tx.exam.deleteMany({ where: { courseId } });
      }

      // Delete the course
      await tx.course.delete({ where: { id: courseId } });
    }, { maxWait: 10000, timeout: 15000 });

    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin removes a grade from a teacher
apiRouter.delete("/admin/teacher/:teacherId/grade/:gradeId", auth, requireRole("ADMIN"), async (req, res) => {
  const { teacherId, gradeId } = req.params;
  try {
    const teacher = await prisma.user.update({
      where: { id: teacherId },
      data: {
        teachingGrades: {
          disconnect: { id: gradeId }
        }
      },
      include: { teachingGrades: true }
    });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin creates a teacher
apiRouter.post("/admin/create-teacher", auth, requireRole("ADMIN"), async (req, res) => {
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
apiRouter.post("/admin/create-student", auth, requireRole("ADMIN"), async (req, res) => {
  const { name, email, password, studentId, rollNumber, universityRollNumber, gradeId, semester } = req.body;

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
        gradeId,
        semester: semester ? parseInt(semester) : null
      },
    });

    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin bulk uploads students via CSV
apiRouter.post("/admin/bulk-upload-students",
  auth, requireRole("ADMIN"),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
      // Parse CSV
      const rows = [];
      const REQUIRED_HEADERS = [
        "name", "email", "studentId", "rollNumber", "universityRollNumber", "grade", "semester"
      ];

      await new Promise((resolve, reject) => {
        const stream = Readable.from(req.file.buffer.toString());
        stream
          .pipe(csvParser())
          .on("headers", (headers) => {
            const normalized = headers.map(h => h.trim());
            const missing = REQUIRED_HEADERS.filter(r => !normalized.includes(r));
            if (missing.length > 0) {
              reject(new Error(`Missing required CSV headers: ${missing.join(", ")}`));
            }
          })
          .on("data", (row) => rows.push(row))
          .on("end", resolve)
          .on("error", reject);
      });

      if (rows.length === 0) {
        return res.status(400).json({ error: "CSV file is empty (no data rows)" });
      }

      // Fetch all grades for name→ID resolution
      const allGrades = await prisma.grade.findMany();
      const gradeMap = {};
      for (const g of allGrades) {
        gradeMap[g.name.toLowerCase()] = g.id;
      }

      // Check for existing emails in the database
      const allEmails = rows.map(r => r.email?.trim().toLowerCase()).filter(Boolean);
      const existingUsers = await prisma.user.findMany({
        where: { email: { in: allEmails } },
        select: { email: true }
      });
      const existingEmailSet = new Set(existingUsers.map(u => u.email.toLowerCase()));

      // Row-by-row validation
      const errors = [];
      const seenEmails = new Set();
      const validRows = [];

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const r = rows[i];
        const rowErrors = [];

        const name = r.name?.trim();
        const email = r.email?.trim().toLowerCase();
        const sid = r.studentId?.trim();
        const roll = r.rollNumber?.trim();
        const uniRoll = r.universityRollNumber?.trim();
        const gradeName = r.grade?.trim();
        const semester = parseInt(r.semester?.trim(), 10);

        if (!name) rowErrors.push("name is empty");
        if (!email) rowErrors.push("email is empty");
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) rowErrors.push("invalid email format");
        if (!sid) rowErrors.push("studentId is empty");
        if (!roll) rowErrors.push("rollNumber is empty");
        if (!uniRoll) rowErrors.push("universityRollNumber is empty");
        if (!gradeName) rowErrors.push("grade is empty");
        else if (!gradeMap[gradeName.toLowerCase()]) {
          rowErrors.push(`grade "${gradeName}" not found (available: ${allGrades.map(g => g.name).join(", ")})`);
        }
        if (isNaN(semester) || semester < 1) rowErrors.push(`semester must be >= 1, got "${r.semester}"`);

        // Duplicate email within file
        if (email && seenEmails.has(email)) {
          rowErrors.push("duplicate email within file");
        }
        // Duplicate email in database
        if (email && existingEmailSet.has(email)) {
          rowErrors.push("email already exists in database");
        }

        if (rowErrors.length > 0) {
          errors.push({ row: rowNum, errors: rowErrors });
        } else {
          seenEmails.add(email);
          validRows.push({
            name, email, studentId: sid, rollNumber: roll,
            universityRollNumber: uniRoll,
            gradeId: gradeMap[gradeName.toLowerCase()],
            semester
          });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          error: "Validation failed",
          totalRows: rows.length,
          errorCount: errors.length,
          details: errors
        });
      }

      // Hash the default password once
      const hashedPassword = await bcrypt.hash("portal@123", 10);

      // Bulk insert in transaction
      const result = await prisma.$transaction(async (tx) => {
        const created = [];
        for (const row of validRows) {
          const student = await tx.user.create({
            data: {
              name: row.name,
              email: row.email,
              password: hashedPassword,
              role: "STUDENT",
              studentId: row.studentId,
              rollNumber: row.rollNumber,
              universityRollNumber: row.universityRollNumber,
              gradeId: row.gradeId,
              semester: row.semester
            }
          });
          created.push(student);
        }
        return created;
      }, { maxWait: 10000, timeout: 30000 });

      res.json({
        message: `Successfully created ${result.length} students (default password: portal@123)`,
        count: result.length
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Admin bulk uploads teachers via CSV
apiRouter.post("/admin/bulk-upload-teachers",
  auth, requireRole("ADMIN"),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const rows = [];
      const REQUIRED_HEADERS = ["name", "email"];

      await new Promise((resolve, reject) => {
        const stream = Readable.from(req.file.buffer.toString());
        stream
          .pipe(csvParser())
          .on("headers", (headers) => {
            const normalized = headers.map(h => h.trim());
            const missing = REQUIRED_HEADERS.filter(r => !normalized.includes(r));
            if (missing.length > 0) {
              reject(new Error(`Missing required CSV headers: ${missing.join(", ")}`));
            }
          })
          .on("data", (row) => rows.push(row))
          .on("end", resolve)
          .on("error", reject);
      });

      if (rows.length === 0) {
        return res.status(400).json({ error: "CSV file is empty (no data rows)" });
      }

      // Fetch all grades for name→ID resolution
      const allGrades = await prisma.grade.findMany();
      const gradeMap = {};
      for (const g of allGrades) {
        gradeMap[g.name.toLowerCase()] = g.id;
      }

      // Check for existing emails
      const allEmails = rows.map(r => r.email?.trim().toLowerCase()).filter(Boolean);
      const existingUsers = await prisma.user.findMany({
        where: { email: { in: allEmails } },
        select: { email: true }
      });
      const existingEmailSet = new Set(existingUsers.map(u => u.email.toLowerCase()));

      // Row-by-row validation
      const errors = [];
      const seenEmails = new Set();
      const validRows = [];

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const r = rows[i];
        const rowErrors = [];

        const name = r.name?.trim();
        const email = r.email?.trim().toLowerCase();
        const gradesRaw = r.grades?.trim() || "";

        if (!name) rowErrors.push("name is empty");
        if (!email) rowErrors.push("email is empty");
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) rowErrors.push("invalid email format");

        // Parse grades (semicolon-separated, optional)
        const gradeIds = [];
        if (gradesRaw) {
          const gradeNames = gradesRaw.split(";").map(g => g.trim()).filter(Boolean);
          for (const gn of gradeNames) {
            const gId = gradeMap[gn.toLowerCase()];
            if (!gId) {
              rowErrors.push(`grade "${gn}" not found (available: ${allGrades.map(g => g.name).join(", ")})`);
            } else {
              gradeIds.push(gId);
            }
          }
        }

        if (email && seenEmails.has(email)) {
          rowErrors.push("duplicate email within file");
        }
        if (email && existingEmailSet.has(email)) {
          rowErrors.push("email already exists in database");
        }

        if (rowErrors.length > 0) {
          errors.push({ row: rowNum, errors: rowErrors });
        } else {
          seenEmails.add(email);
          validRows.push({ name, email, gradeIds });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          error: "Validation failed",
          totalRows: rows.length,
          errorCount: errors.length,
          details: errors
        });
      }

      const hashedPassword = await bcrypt.hash("portal@123", 10);

      const result = await prisma.$transaction(async (tx) => {
        const created = [];
        for (const row of validRows) {
          const teacher = await tx.user.create({
            data: {
              name: row.name,
              email: row.email,
              password: hashedPassword,
              role: "TEACHER",
              teachingGrades: row.gradeIds.length > 0
                ? { connect: row.gradeIds.map(id => ({ id })) }
                : undefined
            }
          });
          created.push(teacher);
        }
        return created;
      }, { maxWait: 10000, timeout: 30000 });

      res.json({
        message: `Successfully created ${result.length} teachers (default password: portal@123)`,
        count: result.length
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Admin lists all teachers
apiRouter.get("/admin/teachers", auth, requireRole("ADMIN"), async (req, res) => {
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
apiRouter.post("/admin/assign-teacher-grade", auth, requireRole("ADMIN"), async (req, res) => {
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

// Admin lists all students
apiRouter.get("/admin/students", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        rollNumber: true,
        universityRollNumber: true,
        semester: true,
        createdAt: true,
        grade: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin deletes a user (teacher or student) with cascade
apiRouter.delete("/admin/user/:id", auth, requireRole("ADMIN"), async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "ADMIN") return res.status(403).json({ error: "Cannot delete admin users" });

    // Delete answers for all submissions by this user
    const submissions = await prisma.submission.findMany({
      where: { studentId: id },
      select: { id: true }
    });
    const submissionIds = submissions.map(s => s.id);

    if (submissionIds.length > 0) {
      await prisma.answer.deleteMany({ where: { submissionId: { in: submissionIds } } });
      await prisma.submission.deleteMany({ where: { studentId: id } });
    }

    // Disconnect teacher from grades (many-to-many)
    if (user.role === "TEACHER") {
      const teacher = await prisma.user.findUnique({
        where: { id },
        include: { teachingGrades: true }
      });
      if (teacher.teachingGrades.length > 0) {
        await prisma.user.update({
          where: { id },
          data: {
            teachingGrades: {
              disconnect: teacher.teachingGrades.map(g => ({ id: g.id }))
            }
          }
        });
      }
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: `${user.role === "TEACHER" ? "Teacher" : "Student"} "${user.name}" deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher views their assigned grades
apiRouter.get("/teacher/my-grades", auth, requireRole("TEACHER"), async (req, res) => {
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
apiRouter.post("/teacher/create-exam", auth, requireRole("TEACHER"), async (req, res) => {
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
apiRouter.post("/teacher/add-question", auth, requireRole("TEACHER"), async (req, res) => {
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

// Teacher bulk uploads questions via CSV
apiRouter.post("/teacher/bulk-upload-questions",
  auth, requireRole("TEACHER"),
  upload.single("file"),
  async (req, res) => {
    const { examId } = req.body;

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!examId) return res.status(400).json({ error: "examId is required" });

    try {
      // Verify exam exists
      const exam = await prisma.exam.findUnique({ where: { id: examId } });
      if (!exam) return res.status(404).json({ error: "Exam not found" });

      // Parse CSV from buffer
      const rows = [];
      const errors = [];
      const REQUIRED_HEADERS = [
        "question", "optionA", "optionB", "optionC", "optionD",
        "correctOption", "marks"
      ];

      await new Promise((resolve, reject) => {
        const stream = Readable.from(req.file.buffer.toString());
        stream
          .pipe(csvParser())
          .on("headers", (headers) => {
            const normalized = headers.map(h => h.trim());
            const missing = REQUIRED_HEADERS.filter(r => !normalized.includes(r));
            if (missing.length > 0) {
              reject(new Error(`Missing required CSV headers: ${missing.join(", ")}`));
            }
          })
          .on("data", (row) => rows.push(row))
          .on("end", resolve)
          .on("error", reject);
      });

      if (rows.length === 0) {
        return res.status(400).json({ error: "CSV file is empty (no data rows)" });
      }

      // Row-by-row validation
      const VALID_OPTIONS = ["A", "B", "C", "D"];
      const seenQuestions = new Set();
      const validRows = [];

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2; // +2 for header row + 0-index
        const r = rows[i];
        const rowErrors = [];

        const question = r.question?.trim();
        const optA = r.optionA?.trim();
        const optB = r.optionB?.trim();
        const optC = r.optionC?.trim();
        const optD = r.optionD?.trim();
        const correct = r.correctOption?.trim().toUpperCase();
        const marks = parseInt(r.marks?.trim(), 10);

        if (!question) rowErrors.push("question is empty");
        if (!optA || !optB || !optC || !optD) rowErrors.push("all 4 options are required");
        if (!VALID_OPTIONS.includes(correct)) rowErrors.push(`correctOption must be A/B/C/D, got "${r.correctOption}"`);
        if (isNaN(marks) || marks < 1) rowErrors.push(`marks must be >= 1, got "${r.marks}"`);

        // Duplicate detection within file
        if (question && seenQuestions.has(question.toLowerCase())) {
          rowErrors.push("duplicate question within file");
        }

        if (rowErrors.length > 0) {
          errors.push({ row: rowNum, errors: rowErrors });
        } else {
          seenQuestions.add(question.toLowerCase());
          validRows.push({ question, optA, optB, optC, optD, correct, marks });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          error: "Validation failed",
          totalRows: rows.length,
          errorCount: errors.length,
          details: errors
        });
      }

      // Bulk insert in transaction
      const result = await prisma.$transaction(async (tx) => {
        const created = [];
        for (const row of validRows) {
          const q = await tx.question.create({
            data: {
              examId,
              type: "MCQ",
              questionText: row.question,
              marks: row.marks,
              options: {
                create: [
                  { optionText: row.optA, isCorrect: row.correct === "A" },
                  { optionText: row.optB, isCorrect: row.correct === "B" },
                  { optionText: row.optC, isCorrect: row.correct === "C" },
                  { optionText: row.optD, isCorrect: row.correct === "D" },
                ]
              }
            },
            include: { options: true }
          });
          created.push(q);
        }
        return created;
      }, { maxWait: 10000, timeout: 30000 });

      res.json({
        message: `Successfully uploaded ${result.length} questions`,
        count: result.length
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Teacher views specific exam details (including questions)
apiRouter.get("/teacher/exam/:examId", auth, requireRole("TEACHER"), async (req, res) => {
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
apiRouter.delete("/teacher/question/:questionId", auth, requireRole("TEACHER"), async (req, res) => {
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
apiRouter.delete("/teacher/exam/:examId", auth, requireRole("TEACHER"), async (req, res) => {
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
apiRouter.patch("/teacher/exam/:examId/toggle-release", auth, requireRole("TEACHER"), async (req, res) => {
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
apiRouter.get("/teacher/exam/:examId/submissions", auth, requireRole("TEACHER"), async (req, res) => {
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

// Student Dashboard - Aggregated analytics data
apiRouter.get("/student/dashboard", auth, requireRole("STUDENT"), async (req, res) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { grade: true }
    });
    if (!student) return res.status(404).json({ error: "Student not found" });

    // Get all submissions for this student with exam/course details
    const submissions = await prisma.submission.findMany({
      where: { studentId: req.user.userId },
      include: {
        exam: {
          include: {
            course: true,
            grade: true,
            questions: { select: { marks: true } }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Compute subject-wise analysis
    const subjectMap = {};
    let totalScoreSum = 0;
    let totalMarksSum = 0;

    for (const sub of submissions) {
      const courseName = sub.exam.course?.name || 'Unknown';
      const courseId = sub.exam.courseId;
      const totalMarks = sub.exam.questions.reduce((sum, q) => sum + q.marks, 0);

      if (!subjectMap[courseId]) {
        subjectMap[courseId] = {
          courseId,
          courseName,
          totalScore: 0,
          totalMarks: 0,
          examCount: 0
        };
      }
      subjectMap[courseId].totalScore += sub.totalScore;
      subjectMap[courseId].totalMarks += totalMarks;
      subjectMap[courseId].examCount += 1;

      totalScoreSum += sub.totalScore;
      totalMarksSum += totalMarks;
    }

    const subjectAnalysis = Object.values(subjectMap).map(s => ({
      ...s,
      percentage: s.totalMarks > 0 ? Math.round((s.totalScore / s.totalMarks) * 100) : 0
    }));

    // Overall stats
    const overallPercentage = totalMarksSum > 0 ? Math.round((totalScoreSum / totalMarksSum) * 100) : 0;
    const totalExams = submissions.length;
    const avgScore = totalExams > 0 ? Math.round(totalScoreSum / totalExams) : 0;
    const bestSubject = subjectAnalysis.length > 0
      ? subjectAnalysis.reduce((best, s) => s.percentage > best.percentage ? s : best)
      : null;

    // Upcoming exams (for student's grade, scheduled in the future)
    const upcomingExams = student.gradeId ? await prisma.exam.findMany({
      where: {
        gradeId: student.gradeId,
        scheduledDate: { gte: new Date() }
      },
      include: { course: true, grade: true },
      orderBy: { scheduledDate: 'asc' },
      take: 10
    }) : [];

    // Recent results (released exams with submissions)
    const recentResults = submissions
      .filter(s => s.exam.resultsReleased)
      .slice(0, 5)
      .map(s => ({
        examId: s.examId,
        examTitle: s.exam.title,
        courseName: s.exam.course?.name || 'Unknown',
        totalScore: s.totalScore,
        totalMarks: s.exam.questions.reduce((sum, q) => sum + q.marks, 0),
        percentage: (() => {
          const tm = s.exam.questions.reduce((sum, q) => sum + q.marks, 0);
          return tm > 0 ? Math.round((s.totalScore / tm) * 100) : 0;
        })(),
        submittedAt: s.submittedAt,
        scheduledDate: s.exam.scheduledDate
      }));

    res.json({
      student: {
        name: student.name,
        grade: student.grade?.name || 'N/A',
        semester: student.semester,
        rollNumber: student.rollNumber
      },
      stats: {
        overallPercentage,
        totalExams,
        avgScore,
        bestSubject: bestSubject ? bestSubject.courseName : 'N/A'
      },
      subjectAnalysis,
      upcomingExams,
      recentResults
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all exams (Filtered by Grade for Students)
apiRouter.get("/exams", auth, async (req, res) => {
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
apiRouter.post("/student/verify-exam", auth, requireRole("STUDENT"), async (req, res) => {
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
apiRouter.get("/student/exam/:examId", auth, requireRole("STUDENT"), async (req, res) => {
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
apiRouter.post("/student/submit-exam", auth, requireRole("STUDENT"), async (req, res) => {
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
apiRouter.get("/student/submission/:examId", auth, requireRole("STUDENT"), async (req, res) => {
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

app.use("/api", apiRouter);



const PORT = process.env.PORT || 8080;

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
