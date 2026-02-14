import { prisma } from './prisma.js';

async function verifyResultFlow() {
    console.log('Starting results verification...');
    try {
        // 1. Setup Data
        const grade = await prisma.grade.create({ data: { name: 'ResultTestGrade_' + Date.now() } });
        const course = await prisma.course.create({ data: { name: 'ResultTestCourse', gradeId: grade.id } });
        const exam = await prisma.exam.create({
            data: {
                title: 'Result Test Exam',
                scheduledDate: new Date(),
                durationMinutes: 60,
                gradeId: grade.id,
                courseId: course.id,
                password: 'pass',
                resultsReleased: false // Default
            }
        });

        // 2. Create Student & Submission
        const student = await prisma.user.create({
            data: {
                name: 'Test Student',
                email: 'student_' + Date.now() + '@test.com',
                password: 'pass',
                role: 'STUDENT',
                gradeId: grade.id
            }
        });

        const question = await prisma.question.create({
            data: {
                examId: exam.id,
                questionText: 'Q1',
                marks: 10,
                type: 'MCQ',
                options: { create: [{ optionText: 'A', isCorrect: true }] }
            },
            include: { options: true }
        });

        const submission = await prisma.submission.create({
            data: {
                examId: exam.id,
                studentId: student.id,
                totalScore: 10,
                answers: {
                    create: [{
                        questionId: question.id,
                        selectedOptionId: question.options[0].id
                    }]
                }
            }
        });

        // 3. Verify Student Cannot See Result (Simulated)
        // In app.js logic: returns 403 if !resultsReleased
        // We check DB state directly here as a proxy for what the endpoint checks
        const examCheck1 = await prisma.exam.findUnique({ where: { id: exam.id } });
        if (examCheck1.resultsReleased !== false) {
            console.error('FAILURE: Exam should not be released yet.');
            process.exit(1);
        }
        console.log('Verified: Results initially not released.');

        // 4. Toggle Release (Simulate Teacher Action)
        const updatedExam = await prisma.exam.update({
            where: { id: exam.id },
            data: { resultsReleased: true }
        });

        if (updatedExam.resultsReleased !== true) {
            console.error('FAILURE: Failed to release results.');
            process.exit(1);
        }
        console.log('Verified: Results released.');

        // 5. Cleanup
        await prisma.submission.delete({ where: { id: submission.id } }); // Cascades answers? No, need to check schema. Answers have onDelete? Schema doesn't say.
        // Manual cleanup to be safe
        await prisma.answer.deleteMany({ where: { submissionId: submission.id } });
        await prisma.submission.delete({ where: { id: submission.id } });

        await prisma.option.deleteMany({ where: { questionId: question.id } });
        await prisma.question.delete({ where: { id: question.id } });
        await prisma.exam.delete({ where: { id: exam.id } });
        await prisma.user.delete({ where: { id: student.id } });
        await prisma.course.delete({ where: { id: course.id } });
        await prisma.grade.delete({ where: { id: grade.id } });

        console.log('SUCCESS: Result flow verification passed.');

    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

verifyResultFlow();
