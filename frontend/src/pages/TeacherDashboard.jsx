import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './AdminDashboard.css'; // Shared dark theme CSS

const TeacherDashboard = () => {
    const { user, logout } = useAuth();
    const [exams, setExams] = useState([]);
    const [showCreateExamModal, setShowCreateExamModal] = useState(false);
    const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [selectedExamDetails, setSelectedExamDetails] = useState(null);
    const [examSubmissions, setExamSubmissions] = useState([]);
    const [currentExamResultsReleased, setCurrentExamResultsReleased] = useState(false);

    // Submission Review Panel
    const [reviewData, setReviewData] = useState(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [editingAnswerId, setEditingAnswerId] = useState(null);
    const [editScore, setEditScore] = useState('');
    const [expandedFeedback, setExpandedFeedback] = useState({});

    // Exam Form State
    const [title, setTitle] = useState('');
    const [selectedGradeId, setSelectedGradeId] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [durationMinutes, setDurationMinutes] = useState('');
    const [password, setPassword] = useState('');
    const [topic, setTopic] = useState(''); // New topic state
    const [deletePassword, setDeletePassword] = useState('');
    const [myGrades, setMyGrades] = useState([]);

    const availableCourses = myGrades.find(g => g.id === selectedGradeId)?.courses || [];

    // Question Form State
    const [questionType, setQuestionType] = useState('MCQ');
    const [questionText, setQuestionText] = useState('');
    const [marks, setMarks] = useState(1);
    const [option1, setOption1] = useState('');
    const [option2, setOption2] = useState('');
    const [option3, setOption3] = useState('');
    const [option4, setOption4] = useState('');
    const [correctOptionIndex, setCorrectOptionIndex] = useState(0);

    // Bulk Upload State
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
    const [bulkUploadExamId, setBulkUploadExamId] = useState(null);
    const [bulkUploadFile, setBulkUploadFile] = useState(null);
    const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
    const [bulkUploadResult, setBulkUploadResult] = useState(null);

    // AI Generator State
    const [showAIGenModal, setShowAIGenModal] = useState(false);
    const [aiGenExam, setAiGenExam] = useState(null);
    const [aiGenNumQuestions, setAiGenNumQuestions] = useState(5);
    const [aiGenDifficulty, setAiGenDifficulty] = useState('Medium');
    const [aiGenQuestionType, setAiGenQuestionType] = useState('MCQ');
    const [aiGenPrompt, setAiGenPrompt] = useState('');
    const [aiGenLoading, setAiGenLoading] = useState(false);

    // Sidebar
    const [activeTab, setActiveTab] = useState('exams');

    // Exams tab state
    const [examsCourseFilter, setExamsCourseFilter] = useState('');
    const [examsStatusFilter, setExamsStatusFilter] = useState('');
    const [examsSort, setExamsSort] = useState('date-newest');

    // Teachers tab state
    const [teachers, setTeachers] = useState([]);
    const [teachersLoaded, setTeachersLoaded] = useState(false);
    const [expandedTeacherId, setExpandedTeacherId] = useState(null);
    const [teachersSort, setTeachersSort] = useState('name-az');

    // Students tab state
    const [students, setStudents] = useState([]);
    const [studentsLoaded, setStudentsLoaded] = useState(false);
    const [studentsSearch, setStudentsSearch] = useState('');
    const [studentsSemesterFilter, setStudentsSemesterFilter] = useState('');
    const [studentsSort, setStudentsSort] = useState('name-az');
    const [activityStudent, setActivityStudent] = useState(null);
    const [studentActivity, setStudentActivity] = useState(null);
    const [activityLoading, setActivityLoading] = useState(false);

    const fetchExams = async () => {
        try { const r = await api.get('/exams'); setExams(r.data); }
        catch (err) { console.error(err); toast.error('Failed to fetch exams'); }
    };

    const fetchMyGrades = async () => {
        try { const r = await api.get('/teacher/my-grades'); setMyGrades(r.data); }
        catch (err) { console.error(err); toast.error('Failed to fetch grades'); }
    };

    const fetchMyTeachers = async () => {
        try { const r = await api.get('/teacher/my-teachers'); setTeachers(r.data); setTeachersLoaded(true); }
        catch (err) { console.error(err); toast.error('Failed to fetch teachers'); }
    };

    const fetchMyStudents = async () => {
        try { const r = await api.get('/teacher/my-students'); setStudents(r.data); setStudentsLoaded(true); }
        catch (err) { console.error(err); toast.error('Failed to fetch students'); }
    };

    const fetchStudentActivity = async (student) => {
        setActivityStudent(student);
        setStudentActivity(null);
        setActivityLoading(true);
        try {
            const r = await api.get(`/teacher/student-activity/${student.id}`);
            setStudentActivity(r.data);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to fetch activity');
            setActivityStudent(null);
        } finally {
            setActivityLoading(false);
        }
    };

    useEffect(() => { fetchExams(); fetchMyGrades(); }, []);

    useEffect(() => {
        if (activeTab === 'teachers' && !teachersLoaded) fetchMyTeachers();
        if (activeTab === 'students' && !studentsLoaded) fetchMyStudents();
    }, [activeTab]);

    // --- Filtered and Sorted Lists ---

    // Unique courses from all exams for the filter dropdown
    const teacherExamCourses = useMemo(() => {
        const unique = {};
        exams.forEach(ex => {
            if (ex.course) unique[ex.course.id] = ex.course.name;
        });
        return Object.entries(unique).map(([id, name]) => ({ id, name }));
    }, [exams]);

    const filteredExams = useMemo(() => {
        let list = [...exams];
        const now = new Date();

        // Filter by Course
        if (examsCourseFilter) {
            list = list.filter(ex => ex.courseId === examsCourseFilter);
        }

        // Filter by Status
        if (examsStatusFilter) {
            list = list.filter(ex => {
                const isUpcoming = new Date(ex.scheduledDate) > now;
                const isReleased = ex.resultsReleased;
                const isPast = new Date(ex.scheduledDate) <= now && !isReleased;

                if (examsStatusFilter === 'upcoming') return isUpcoming;
                if (examsStatusFilter === 'past') return isPast;
                if (examsStatusFilter === 'released') return isReleased;
                return true;
            });
        }

        // Sort
        if (examsSort === 'date-newest') list.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
        else if (examsSort === 'date-oldest') list.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
        else if (examsSort === 'title-az') list.sort((a, b) => a.title.localeCompare(b.title));
        else if (examsSort === 'title-za') list.sort((a, b) => b.title.localeCompare(a.title));

        return list;
    }, [exams, examsCourseFilter, examsStatusFilter, examsSort]);

    const filteredTeachers = useMemo(() => {
        let list = [...teachers];
        if (teachersSort === 'name-az') list.sort((a, b) => a.name.localeCompare(b.name));
        else if (teachersSort === 'name-za') list.sort((a, b) => b.name.localeCompare(a.name));
        return list;
    }, [teachers, teachersSort]);

    const filteredStudents = useMemo(() => {
        let list = [...students];

        // Search
        if (studentsSearch.trim()) {
            const q = studentsSearch.toLowerCase();
            list = list.filter(s =>
                (s.name || '').toLowerCase().includes(q) ||
                (s.studentId || '').toLowerCase().includes(q) ||
                (s.rollNumber || '').toLowerCase().includes(q) ||
                (s.universityRollNumber || '').toLowerCase().includes(q) ||
                (s.section || '').toLowerCase().includes(q)
            );
        }

        // Filter by Semester
        if (studentsSemesterFilter) {
            list = list.filter(s => String(s.semester) === studentsSemesterFilter);
        }

        // Sort
        if (studentsSort === 'name-az') list.sort((a, b) => a.name.localeCompare(b.name));
        else if (studentsSort === 'name-za') list.sort((a, b) => b.name.localeCompare(a.name));
        else if (studentsSort === 'roll-asc') list.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));

        return list;
    }, [students, studentsSearch, studentsSemesterFilter, studentsSort]);

    const handleCreateExam = async (e) => {
        e.preventDefault();
        try {
            await api.post('/teacher/create-exam', {
                title, gradeId: selectedGradeId, courseId: selectedCourseId,
                scheduledDate, durationMinutes: parseInt(durationMinutes), password, topic
            });
            toast.success('Exam created!');
            setShowCreateExamModal(false); fetchExams();
            setTitle(''); setSelectedGradeId(''); setSelectedCourseId('');
            setScheduledDate(''); setDurationMinutes(''); setPassword(''); setTopic('');
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to create exam'); }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        const payload = {
            examId: selectedExamId,
            type: questionType,
            questionText,
            marks: parseInt(marks),
        };
        if (questionType === 'MCQ') {
            payload.options = [
                { optionText: option1, isCorrect: correctOptionIndex === 0 },
                { optionText: option2, isCorrect: correctOptionIndex === 1 },
                { optionText: option3, isCorrect: correctOptionIndex === 2 },
                { optionText: option4, isCorrect: correctOptionIndex === 3 },
            ];
        }
        try {
            await api.post('/teacher/add-question', payload);
            toast.success(`${questionType === 'MCQ' ? 'MCQ' : 'Subjective'} question added!`);
            setQuestionText(''); setMarks(1); setOption1(''); setOption2(''); setOption3(''); setOption4('');
            setCorrectOptionIndex(0);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to add question'); }
    };

    const openAddQuestion = (examId) => { setSelectedExamId(examId); setQuestionType('MCQ'); setShowAddQuestionModal(true); };

    const openBulkUpload = (examId) => {
        setBulkUploadExamId(examId); setBulkUploadFile(null); setBulkUploadResult(null);
        setShowBulkUploadModal(true);
    };

    const downloadTemplate = () => {
        const t = 'question,optionA,optionB,optionC,optionD,correctOption,marks\n"What is 2+2?",1,2,3,4,D,1\n';
        const blob = new Blob([t], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'mcq_template.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const handleBulkUpload = async () => {
        if (!bulkUploadFile) { toast.error('Please select a CSV file'); return; }
        setBulkUploadLoading(true); setBulkUploadResult(null);
        try {
            const fd = new FormData(); fd.append('file', bulkUploadFile); fd.append('examId', bulkUploadExamId);
            const r = await api.post('/teacher/bulk-upload-questions', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setBulkUploadResult({ success: true, message: r.data.message, count: r.data.count });
            toast.success(r.data.message); fetchExams();
        } catch (err) {
            const d = err.response?.data;
            if (d?.details) setBulkUploadResult({ success: false, error: d.error, details: d.details, totalRows: d.totalRows, errorCount: d.errorCount });
            else setBulkUploadResult({ success: false, error: d?.error || 'Upload failed' });
            toast.error(d?.error || 'Bulk upload failed');
        } finally { setBulkUploadLoading(false); }
    };

    const openAIGenModal = (exam) => {
        setAiGenExam(exam);
        setAiGenNumQuestions(5);
        setAiGenDifficulty('Medium');
        setAiGenPrompt(exam.topic ? `Generate questions about ${exam.topic}` : '');
        setShowAIGenModal(true);
    };

    const handleAIGenerate = async (e) => {
        e.preventDefault();
        if (!aiGenPrompt) {
            toast.error("Please provide a prompt for the AI.");
            return;
        }

        setAiGenLoading(true);
        try {
            await api.post('/ai/generate-questions', {
                examId: aiGenExam.id,
                numberOfQuestions: parseInt(aiGenNumQuestions),
                difficulty: aiGenDifficulty,
                questionType: aiGenQuestionType,
                prompt: aiGenPrompt
            });
            toast.success('AI successfully generated questions!');
            setShowAIGenModal(false);
            fetchExams();
        } catch (err) {
            toast.error(err.response?.data?.error || 'AI Generation failed');
        } finally {
            setAiGenLoading(false);
        }
    };

    const openManageExam = async (examId) => {
        setSelectedExamId(examId);
        try {
            const r = await api.get(`/teacher/exam/${examId}`);
            setSelectedExamDetails(r.data); setShowManageModal(true);
        } catch { toast.error("Failed to load exam details"); }
    };

    const handleDeleteQuestion = async (qId) => {
        if (!window.confirm("Delete this question?")) return;
        try {
            await api.delete(`/teacher/question/${qId}`);
            toast.success("Question deleted");
            const r = await api.get(`/teacher/exam/${selectedExamId}`);
            setSelectedExamDetails(r.data); fetchExams();
        } catch (err) { toast.error(err.response?.data?.error || "Failed to delete question"); }
    };

    const handleDeleteExam = async () => {
        if (!deletePassword) { toast.error("Enter the exam password to delete"); return; }
        if (!window.confirm("Delete this exam and all questions permanently?")) return;
        try {
            await api.delete(`/teacher/exam/${selectedExamId}`, { data: { password: deletePassword } });
            toast.success("Exam deleted"); setShowManageModal(false); setDeletePassword(''); fetchExams();
        } catch (err) { toast.error(err.response?.data?.error || "Failed to delete exam"); }
    };

    const openResults = async (exam) => {
        setSelectedExamId(exam.id); setCurrentExamResultsReleased(exam.resultsReleased);
        try {
            const r = await api.get(`/teacher/exam/${exam.id}/submissions`);
            setExamSubmissions(r.data); setShowResultsModal(true);
        } catch { toast.error("Failed to load submissions"); }
    };

    const openReviewPanel = async (submissionId) => {
        setReviewData(null);
        setEditingAnswerId(null);
        setExpandedFeedback({});
        setReviewLoading(true);
        try {
            const r = await api.get(`/submissions/${submissionId}/details`);
            setReviewData(r.data);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to load submission details');
        } finally {
            setReviewLoading(false);
        }
    };

    const handleOverrideScore = async (answerId, maxMarks) => {
        const score = parseInt(editScore, 10);
        if (isNaN(score) || score < 0 || score > maxMarks) {
            toast.error(`Score must be between 0 and ${maxMarks}`);
            return;
        }
        try {
            const r = await api.patch(`/submissions/answers/${answerId}/override`, { overriddenScore: score });
            // Update reviewData in place — answers + total
            setReviewData(prev => ({
                ...prev,
                totalScore: r.data.newTotalScore,
                answers: prev.answers.map(a =>
                    a.answerId === answerId ? { ...a, overriddenScore: score, finalScore: score } : a
                )
            }));
            // Also patch the examSubmissions row so the results table stays in sync
            setExamSubmissions(prev => prev.map(s =>
                s.id === reviewData.submissionId ? { ...s, totalScore: r.data.newTotalScore } : s
            ));
            setEditingAnswerId(null);
            toast.success('Score overridden successfully!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to override score');
        }
    };

    const toggleReleaseResults = async () => {
        try {
            const r = await api.patch(`/teacher/exam/${selectedExamId}/toggle-release`);
            setCurrentExamResultsReleased(r.data.resultsReleased);
            toast.success(`Results ${r.data.resultsReleased ? 'Released' : 'Unpublished'}`);
            fetchExams();
        } catch { toast.error("Failed to toggle results"); }
    };

    const handleEditScore = async (subId, currentScore) => {
        const newScore = prompt(`Enter new score for this student (Current: ${currentScore}):`, currentScore);
        if (newScore === null || newScore === "" || isNaN(newScore)) return;
        try {
            await api.patch(`/submissions/${subId}`, { totalScore: parseInt(newScore) });
            toast.success("Score updated!");
            // Refresh submissions
            const r = await api.get(`/teacher/exam/${selectedExamId}/submissions`);
            setExamSubmissions(r.data);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update score");
        }
    };

    const handleDeleteSubmission = async (subId, studentName, isReset = false) => {
        const msg = isReset
            ? `Reset record for ${studentName}? This will permanently delete their current submission and allow them to take the exam again.`
            : `Delete submission record for ${studentName} permanently?`;

        if (!window.confirm(msg)) return;
        try {
            await api.delete(`/submissions/${subId}`);
            toast.success(isReset ? "Record reset successfully!" : "Submission deleted!");
            // Refresh submissions
            const r = await api.get(`/teacher/exam/${selectedExamId}/submissions`);
            setExamSubmissions(r.data);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete submission");
        }
    };

    const optionSetters = [setOption1, setOption2, setOption3, setOption4];
    const optionValues = [option1, option2, option3, option4];

    return (
        <div className="ad-wrapper">
            {/* Sidebar */}
            <div className="ad-sidebar">
                <div className="ad-sidebar-logo"><img src="/images/infinity-symbol.png" alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} /><span>Smart<span style={{ color: '#818cf8' }}>Score</span></span></div>
                <div className={`ad-sidebar-item ${activeTab === 'exams' ? 'active' : ''}`}
                    onClick={() => setActiveTab('exams')}><span className="nav-icon">📝</span> Exams</div>
                <div className={`ad-sidebar-item ${activeTab === 'teachers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('teachers')}><span className="nav-icon">👨‍🏫</span> Teachers</div>
                <div className={`ad-sidebar-item ${activeTab === 'students' ? 'active' : ''}`}
                    onClick={() => setActiveTab('students')}><span className="nav-icon">🎓</span> Students</div>
                <div className="ad-sidebar-bottom">
                    <div className="ad-sidebar-item" onClick={logout}><span className="nav-icon">🚪</span> Logout</div>
                </div>
            </div>

            <div className="ad-main">
                {/* Header */}
                <div className="ad-header">
                    <div className="ad-header-left">
                        {activeTab === 'exams' && <><h1>Teacher Dashboard 📚</h1><p>Manage your exams, questions, and results</p></>}
                        {activeTab === 'teachers' && <><h1>Teachers 👨‍🏫</h1><p>Other teachers assigned to your grades</p></>}
                        {activeTab === 'students' && <><h1>Students 🎓</h1><p>Students enrolled in your grades</p></>}
                    </div>
                    <div className="ad-header-right">
                        <span className="ad-badge">👨‍🏫 {user?.name}</span>
                        {activeTab === 'exams' && <button className="ad-primary-btn" onClick={() => setShowCreateExamModal(true)}>+ Create Exam</button>}
                        <button className="ad-logout-btn" onClick={logout}>Logout</button>
                    </div>
                </div>

                {/* ===== EXAMS TAB ===== */}
                {activeTab === 'exams' && (
                    <div className="ad-section">
                        <div className="ad-section-header">
                            <div className="ad-section-title"><span className="icon">📝</span> All Exams</div>
                            <div className="filter-row">
                                <select
                                    className={`filter-select${examsCourseFilter ? ' active' : ''}`}
                                    value={examsCourseFilter}
                                    onChange={e => setExamsCourseFilter(e.target.value)}
                                >
                                    <option value="">All Courses</option>
                                    {teacherExamCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <select
                                    className={`filter-select${examsStatusFilter ? ' active' : ''}`}
                                    value={examsStatusFilter}
                                    onChange={e => setExamsStatusFilter(e.target.value)}
                                >
                                    <option value="">All Status</option>
                                    <option value="upcoming">Upcoming</option>
                                    <option value="past">Past</option>
                                    <option value="released">Results Released</option>
                                </select>
                                <select
                                    className={`filter-select${examsSort !== 'date-newest' ? ' active' : ''}`}
                                    value={examsSort}
                                    onChange={e => setExamsSort(e.target.value)}
                                >
                                    <option value="date-newest">Date (Newest)</option>
                                    <option value="date-oldest">Date (Oldest)</option>
                                    <option value="title-az">Title (A-Z)</option>
                                    <option value="title-za">Title (Z-A)</option>
                                </select>
                                {(examsCourseFilter || examsStatusFilter || examsSort !== 'date-newest') && (
                                    <button className="filter-clear" onClick={() => {
                                        setExamsCourseFilter('');
                                        setExamsStatusFilter('');
                                        setExamsSort('date-newest');
                                    }}>✕ Clear</button>
                                )}
                            </div>
                        </div>

                        {filteredExams.length > 0 ? (
                            <div className="ad-cards-grid">
                                {filteredExams.map(exam => (
                                    <div key={exam.id} className="ad-exam-card">
                                        <div className="ad-exam-card-title">{exam.title}</div>
                                        <div className="ad-exam-card-sub">{exam.grade?.name} — {exam.course?.name}</div>
                                        <div className="ad-exam-card-info">
                                            📅 {new Date(exam.scheduledDate).toLocaleString()}<br />
                                            ⏱ {exam.durationMinutes} mins &nbsp;•&nbsp; 📋 {exam._count?.questions || 0} questions
                                        </div>
                                        <div className="ad-btn-row" style={{ marginTop: 0 }}>
                                            <button className="ad-primary-btn ad-btn-sm" style={{ backgroundColor: '#8b5cf6' }} onClick={() => openAIGenModal(exam)}>🤖 AI Gen</button>
                                            <button className="ad-info-btn ad-btn-sm" onClick={() => openAddQuestion(exam.id)}>Add Q's</button>
                                            <button className="ad-success-btn ad-btn-sm" onClick={() => openBulkUpload(exam.id)}>📤 Bulk</button>
                                            <button className="ad-secondary-btn ad-btn-sm" onClick={() => openManageExam(exam.id)}>Manage</button>
                                            <button className="ad-warning-btn ad-btn-sm" onClick={() => openResults(exam)}>Results</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="ad-empty">
                                <div className="ad-empty-icon">📝</div>
                                <p>{exams.length > 0 ? 'No exams match your filters.' : 'No exams yet. Click "Create Exam" to get started!'}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== TEACHERS TAB ===== */}
                {activeTab === 'teachers' && (
                    <div className="ad-section">
                        <div className="ad-section-header">
                            <div className="ad-section-title"><span className="icon">👨‍🏫</span> All Teachers</div>
                            <div className="filter-row">
                                <select
                                    className={`filter-select${teachersSort !== 'name-az' ? ' active' : ''}`}
                                    value={teachersSort}
                                    onChange={e => setTeachersSort(e.target.value)}
                                >
                                    <option value="name-az">Name A→Z</option>
                                    <option value="name-za">Name Z→A</option>
                                </select>
                                {teachersSort !== 'name-az' && (
                                    <button className="filter-clear" onClick={() => setTeachersSort('name-az')}>✕ Clear</button>
                                )}
                            </div>
                        </div>

                        {filteredTeachers.length === 0 ? (
                            <div className="ad-empty">
                                <div className="ad-empty-icon">👨‍🏫</div>
                                <p>No other teachers are assigned to your grades yet.</p>
                            </div>
                        ) : (
                            <table className="ad-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th style={{ textAlign: 'center' }}>Exams Created</th>
                                        <th style={{ textAlign: 'center' }}>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTeachers.map(t => (
                                        <>
                                            <tr key={t.id}>
                                                <td style={{ color: '#fff', fontWeight: 500 }}>{t.name}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{t.email}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span
                                                        onClick={() => setExpandedTeacherId(expandedTeacherId === t.id ? null : t.id)}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                            minWidth: 32, height: 26, padding: '0 10px',
                                                            background: 'rgba(99,102,241,0.18)', color: '#818cf8',
                                                            border: '1px solid rgba(99,102,241,0.35)', borderRadius: 99,
                                                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                                            transition: 'background 0.15s',
                                                        }}
                                                    >{t.createdExams.length}</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        className="ad-secondary-btn ad-btn-sm"
                                                        onClick={() => setExpandedTeacherId(expandedTeacherId === t.id ? null : t.id)}
                                                    >
                                                        {expandedTeacherId === t.id ? '▲ Hide' : '▼ View Exams'}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedTeacherId === t.id && (
                                                <tr key={`${t.id}-expanded`}>
                                                    <td colSpan={4} style={{ padding: 0 }}>
                                                        <div style={{
                                                            background: 'rgba(99,102,241,0.05)',
                                                            border: '1px solid rgba(99,102,241,0.15)',
                                                            borderRadius: 8, margin: '4px 0 10px',
                                                            padding: t.createdExams.length === 0 ? '16px 20px' : 0,
                                                            overflow: 'hidden',
                                                        }}>
                                                            {t.createdExams.length === 0 ? (
                                                                <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>No exams created in your grades yet.</p>
                                                            ) : (
                                                                <table className="ad-table" style={{ margin: 0, borderRadius: 0 }}>
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Exam Title</th>
                                                                            <th>Course</th>
                                                                            <th>Scheduled Date</th>
                                                                            <th style={{ textAlign: 'center' }}>Submissions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {t.createdExams.map(ex => (
                                                                            <tr key={ex.id}>
                                                                                <td style={{ color: '#e2e8f0' }}>{ex.title}</td>
                                                                                <td style={{ color: 'var(--text-secondary)' }}>{ex.course?.name}</td>
                                                                                <td style={{ color: 'var(--text-secondary)' }}>{new Date(ex.scheduledDate).toLocaleDateString()}</td>
                                                                                <td style={{ textAlign: 'center', color: '#818cf8', fontWeight: 600 }}>{ex._count?.submissions ?? 0}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ===== STUDENTS TAB ===== */}
                {activeTab === 'students' && (
                    <div className="ad-section">
                        <div className="ad-section-header">
                            <div className="ad-section-title"><span className="icon">🎓</span> All Students</div>
                            <div className="filter-row">
                                <div style={{ position: 'relative', marginRight: 8 }}>
                                    <input
                                        className="ad-input"
                                        placeholder="🔍 Search name, roll..."
                                        value={studentsSearch}
                                        onChange={e => setStudentsSearch(e.target.value)}
                                        style={{ maxWidth: 200, paddingLeft: 32, height: 32, fontSize: 13 }}
                                    />
                                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13 }}></span>
                                </div>
                                <select
                                    className={`filter-select${studentsSemesterFilter ? ' active' : ''}`}
                                    value={studentsSemesterFilter}
                                    onChange={e => setStudentsSemesterFilter(e.target.value)}
                                >
                                    <option value="">All Semesters</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                                </select>
                                <select
                                    className={`filter-select${studentsSort !== 'name-az' ? ' active' : ''}`}
                                    value={studentsSort}
                                    onChange={e => setStudentsSort(e.target.value)}
                                >
                                    <option value="name-az">Name A→Z</option>
                                    <option value="name-za">Name Z→A</option>
                                    <option value="roll-asc">Roll Number</option>
                                </select>
                                {(studentsSearch || studentsSemesterFilter || studentsSort !== 'name-az') && (
                                    <button className="filter-clear" onClick={() => {
                                        setStudentsSearch('');
                                        setStudentsSemesterFilter('');
                                        setStudentsSort('name-az');
                                    }}>✕ Clear</button>
                                )}
                            </div>
                        </div>

                        {filteredStudents.length === 0 ? (
                            <div className="ad-empty">
                                <div className="ad-empty-icon">🎓</div>
                                <p>{(studentsSearch || studentsSemesterFilter) ? 'No students match your criteria.' : 'No students are enrolled in your grades yet.'}</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="ad-table">
                                    <thead>
                                        <tr>
                                            <th>Student ID</th>
                                            <th>Uni Roll No.</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Grade</th>
                                            <th style={{ textAlign: 'center' }}>Sem</th>
                                            <th style={{ textAlign: 'center' }}>Section</th>
                                            <th>Roll Number</th>
                                            <th style={{ textAlign: 'center' }}>Activity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map(s => (
                                            <tr key={s.id}>
                                                <td style={{ color: 'var(--text-secondary)' }}>{s.studentId || '—'}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{s.universityRollNumber || '—'}</td>
                                                <td style={{ color: '#fff', fontWeight: 500 }}>{s.name}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{s.grade?.name || '—'}</td>
                                                <td style={{ textAlign: 'center', color: '#818cf8', fontWeight: 600 }}>{s.semester ?? '—'}</td>
                                                <td style={{ textAlign: 'center', color: '#818cf8', fontWeight: 600 }}>{s.section || '—'}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{s.rollNumber || '—'}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        className="ad-info-btn ad-btn-sm"
                                                        onClick={() => fetchStudentActivity(s)}
                                                    >📊 Activity</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ========== CREATE EXAM MODAL ========== */}
            {showCreateExamModal && (
                <div className="ad-modal-overlay" onClick={() => setShowCreateExamModal(false)}>
                    <div className="ad-modal" onClick={e => e.stopPropagation()}>
                        <div className="ad-modal-title">
                            <span>📝 Create Exam</span>
                            <button className="ad-modal-close" onClick={() => setShowCreateExamModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateExam}>
                            <div className="ad-input-group" style={{ marginBottom: 12 }}>
                                <label>Title</label>
                                <input className="ad-input" required value={title} onChange={e => setTitle(e.target.value)} />
                            </div>
                            <div className="ad-input-group" style={{ marginBottom: 12 }}>
                                <label>Grade</label>
                                <select className="ad-select" required value={selectedGradeId} onChange={e => { setSelectedGradeId(e.target.value); setSelectedCourseId(''); }}>
                                    <option value="">Select Grade</option>
                                    {myGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            <div className="ad-input-group" style={{ marginBottom: 12 }}>
                                <label>Course</label>
                                <select className="ad-select" required value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} disabled={!selectedGradeId}>
                                    <option value="">Select Course</option>
                                    {availableCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="ad-form-grid" style={{ marginBottom: 12 }}>
                                <div className="ad-input-group">
                                    <label>Date & Time</label>
                                    <input className="ad-input" type="datetime-local" required value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                                </div>
                                <div className="ad-input-group">
                                    <label>Duration (Minutes)</label>
                                    <input className="ad-input" type="number" required value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} />
                                </div>
                            </div>
                            <div className="ad-input-group" style={{ marginBottom: 16 }}>
                                <label>Password (Optional)</label>
                                <input className="ad-input" type="text" placeholder="Enter exam password" value={password} onChange={e => setPassword(e.target.value)} />
                            </div>
                            <div className="ad-input-group" style={{ marginBottom: 16 }}>
                                <label>Topic (Optional but required for AI Gen)</label>
                                <input className="ad-input" type="text" placeholder="e.g. React Fundamentals, Algebra..." value={topic} onChange={e => setTopic(e.target.value)} />
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Used by AI to automatically generate questions later.</div>
                            </div>
                            <button type="submit" className="ad-primary-btn">Create Exam</button>
                        </form>
                    </div>
                </div>
            )}

            {/* ========== ADD QUESTION MODAL ========== */}
            {showAddQuestionModal && (
                <div className="ad-modal-overlay" onClick={() => setShowAddQuestionModal(false)}>
                    <div className="ad-modal lg" onClick={e => e.stopPropagation()}>
                        <div className="ad-modal-title">
                            <span>➕ Add Question</span>
                            <button className="ad-modal-close" onClick={() => setShowAddQuestionModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleAddQuestion}>
                            {/* Question Type Dropdown */}
                            <div className="ad-input-group" style={{ marginBottom: 16 }}>
                                <label>Question Type</label>
                                <select
                                    className="ad-select"
                                    value={questionType}
                                    onChange={e => setQuestionType(e.target.value)}
                                >
                                    <option value="MCQ">MCQ (Multiple Choice)</option>
                                    <option value="SUBJECTIVE">Subjective (AI Graded)</option>
                                </select>
                            </div>

                            <div className="ad-input-group" style={{ marginBottom: 12 }}>
                                <label>Question Text</label>
                                <textarea className="ad-textarea" rows={3} required value={questionText} onChange={e => setQuestionText(e.target.value)} />
                            </div>
                            <div className="ad-input-group" style={{ marginBottom: 16 }}>
                                <label>Marks</label>
                                <input className="ad-input" type="number" min="1" required value={marks} onChange={e => setMarks(e.target.value)} />
                            </div>

                            {questionType === 'MCQ' && (
                                <>
                                    <label style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'block' }}>Options</label>
                                    <div className="ad-radio-group" style={{ marginBottom: 16 }}>
                                        {[0, 1, 2, 3].map(idx => (
                                            <div key={idx} className="ad-radio-item">
                                                <input type="radio" name="correctOpt" checked={correctOptionIndex === idx}
                                                    onChange={() => setCorrectOptionIndex(idx)} />
                                                <label>Correct</label>
                                                <input className="ad-input" placeholder={`Option ${idx + 1}`} required
                                                    value={optionValues[idx]} onChange={e => optionSetters[idx](e.target.value)} />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {questionType === 'SUBJECTIVE' && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
                                    borderRadius: 8, padding: '10px 14px', marginBottom: 16
                                }}>
                                    <span style={{ fontSize: 16 }}>🤖</span>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                        AI will automatically generate a model answer in the background.
                                    </span>
                                </div>
                            )}

                            <button type="submit" className="ad-primary-btn">Add Question</button>
                        </form>
                    </div>
                </div>
            )}

            {/* ========== MANAGE EXAM MODAL ========== */}
            {showManageModal && (
                <div className="ad-modal-overlay" onClick={() => setShowManageModal(false)}>
                    <div className="ad-modal lg" onClick={e => e.stopPropagation()}>
                        <div className="ad-modal-title">
                            <span>⚙️ Manage: {selectedExamDetails?.title}</span>
                            <button className="ad-modal-close" onClick={() => setShowManageModal(false)}>✕</button>
                        </div>

                        <label style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'block' }}>Questions</label>
                        {selectedExamDetails?.questions?.length === 0 ? (
                            <p className="ad-no-data">No questions yet.</p>
                        ) : (
                            <table className="ad-table" style={{ marginBottom: 16 }}>
                                <thead>
                                    <tr><th>#</th><th>Question</th><th>Marks</th><th>Action</th></tr>
                                </thead>
                                <tbody>
                                    {selectedExamDetails?.questions?.map((q, idx) => (
                                        <tr key={q.id}>
                                            <td>{idx + 1}</td>
                                            <td>{q.questionText}</td>
                                            <td>{q.marks}</td>
                                            <td><button className="ad-danger-btn ad-btn-sm" onClick={() => handleDeleteQuestion(q.id)}>Delete</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <div className="ad-danger-zone">
                            <div className="ad-danger-zone-title">⚠️ Danger Zone</div>
                            <div className="ad-input-group" style={{ marginBottom: 12 }}>
                                <label>Enter Exam Password to Delete</label>
                                <input className="ad-input" type="password" placeholder="Exam Password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} />
                            </div>
                            <button className="ad-danger-btn" onClick={handleDeleteExam}>Delete Entire Exam</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== RESULTS MODAL ========== */}
            {showResultsModal && (
                <div className="ad-modal-overlay" onClick={() => setShowResultsModal(false)}>
                    <div className="ad-modal lg" onClick={e => e.stopPropagation()}>
                        <div className="ad-modal-title">
                            <span>📊 Exam Results</span>
                            <button className="ad-modal-close" onClick={() => setShowResultsModal(false)}>✕</button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <span style={{ fontSize: 14, color: '#fff' }}>Submissions: <strong>{examSubmissions.length}</strong></span>
                            <button
                                className={currentExamResultsReleased ? 'ad-warning-btn' : 'ad-success-btn'}
                                onClick={toggleReleaseResults}
                            >
                                {currentExamResultsReleased ? 'Unpublish Results' : 'Release Results'}
                            </button>
                        </div>

                        {examSubmissions.length === 0 ? (
                            <p className="ad-no-data">No submissions yet.</p>
                        ) : (
                            <table className="ad-table">
                                <thead>
                                    <tr><th>Student</th><th>Email</th><th>Score</th><th>Submitted</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {examSubmissions.map(sub => (
                                        <tr key={sub.id}>
                                            <td style={{ color: '#fff', fontWeight: 500 }}>{sub.student.name}</td>
                                            <td>{sub.student.email}</td>
                                            <td style={{ fontWeight: 600, color: '#818cf8' }}>{sub.totalScore}</td>
                                            <td>{new Date(sub.submittedAt).toLocaleString()}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                    <button
                                                        className="ad-primary-btn ad-btn-sm"
                                                        title="Review Answers"
                                                        onClick={() => openReviewPanel(sub.id)}
                                                        style={{ background: '#6366f1', fontSize: 12 }}
                                                    >🔍 Review</button>
                                                    <button
                                                        className="ad-info-btn ad-btn-sm"
                                                        title="Edit Marks"
                                                        onClick={() => handleEditScore(sub.id, sub.totalScore)}
                                                    >✏️</button>
                                                    <button
                                                        className="ad-warning-btn ad-btn-sm"
                                                        title="Reset (Allow Retake)"
                                                        onClick={() => handleDeleteSubmission(sub.id, sub.student.name, true)}
                                                    >🔄</button>
                                                    <button
                                                        className="ad-danger-btn ad-btn-sm"
                                                        title="Delete Permanently"
                                                        onClick={() => handleDeleteSubmission(sub.id, sub.student.name, false)}
                                                    >🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* ========== SUBMISSION REVIEW PANEL ========== */}
            {(reviewLoading || reviewData) && (
                <div className="ad-modal-overlay" onClick={() => { setReviewData(null); setReviewLoading(false); }}>
                    <div
                        className="ad-modal lg"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: 780, maxHeight: '90vh', overflowY: 'auto' }}
                    >
                        <div className="ad-modal-title" style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                            <span>🔍 Review Submission</span>
                            <button className="ad-modal-close" onClick={() => { setReviewData(null); setEditingAnswerId(null); }}>✕</button>
                        </div>

                        {reviewLoading && (
                            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
                                Loading submission details...
                            </div>
                        )}

                        {reviewData && (
                            <>
                                {/* ── Header ── */}
                                <div style={{ padding: '20px 0 16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                                                {reviewData.student.name}
                                                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 10 }}>{reviewData.student.email}</span>
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📋 {reviewData.examTitle}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 22, fontWeight: 800, color: '#818cf8' }}>
                                                {reviewData.totalScore} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>/ {reviewData.maxPossibleScore}</span>
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                {reviewData.maxPossibleScore > 0 ? Math.round((reviewData.totalScore / reviewData.maxPossibleScore) * 100) : 0}%
                                            </div>
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 10 }}>
                                        <div style={{
                                            height: '100%', borderRadius: 99, transition: 'width 0.4s ease',
                                            width: `${reviewData.maxPossibleScore > 0 ? Math.round((reviewData.totalScore / reviewData.maxPossibleScore) * 100) : 0}%`,
                                            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                                        }} />
                                    </div>
                                    <div style={{ fontSize: 12, color: 'rgba(139,92,246,0.8)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span>🤖</span> AI graded — review and override scores if needed.
                                    </div>
                                </div>

                                {/* ── Question Cards ── */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
                                    {reviewData.answers.map((ans, idx) => {
                                        const isMCQ = ans.questionType === 'MCQ';
                                        const isEditing = editingAnswerId === ans.answerId;
                                        const isFeedbackOpen = !!expandedFeedback[ans.answerId];

                                        return (
                                            <div key={ans.answerId} style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                border: `1px solid ${isMCQ ? 'rgba(99,102,241,0.2)' : 'rgba(139,92,246,0.25)'}`,
                                                borderRadius: 12,
                                                padding: '16px 18px',
                                            }}>
                                                {/* Card header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                    <div style={{ flex: 1, paddingRight: 12 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                            <span style={{
                                                                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                                                                background: isMCQ ? 'rgba(99,102,241,0.15)' : 'rgba(139,92,246,0.15)',
                                                                color: isMCQ ? '#818cf8' : '#a78bfa',
                                                                border: `1px solid ${isMCQ ? 'rgba(99,102,241,0.3)' : 'rgba(139,92,246,0.3)'}`,
                                                            }}>{isMCQ ? 'MCQ' : 'Subjective'}</span>
                                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Q{idx + 1} · {ans.marks} mark{ans.marks !== 1 ? 's' : ''}</span>
                                                        </div>
                                                        <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', lineHeight: 1.5 }}>{ans.questionText}</div>
                                                    </div>
                                                    {/* Final score badge + edit */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 120 }}>
                                                        {isMCQ ? (
                                                            <span style={{
                                                                fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                                                                background: ans.isCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                                                color: ans.isCorrect ? '#4ade80' : '#f87171',
                                                                border: `1px solid ${ans.isCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                                            }}>{ans.isCorrect ? '✓ Correct' : '✗ Wrong'}</span>
                                                        ) : (
                                                            <>
                                                                {!isEditing ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <span style={{
                                                                            fontSize: 14, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                                                                            background: 'rgba(129,140,248,0.15)', color: '#818cf8',
                                                                            border: '1px solid rgba(129,140,248,0.3)',
                                                                        }}>
                                                                            {ans.finalScore ?? '–'} / {ans.marks}
                                                                            {ans.overriddenScore !== null && ans.overriddenScore !== undefined &&
                                                                                <span style={{ fontSize: 10, marginLeft: 4, color: '#f59e0b' }}>✎</span>}
                                                                        </span>
                                                                        <button
                                                                            style={{
                                                                                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                                                                                color: 'var(--text-secondary)', borderRadius: 6, padding: '4px 8px',
                                                                                fontSize: 12, cursor: 'pointer',
                                                                            }}
                                                                            onClick={() => { setEditingAnswerId(ans.answerId); setEditScore(String(ans.finalScore ?? '')); }}
                                                                        >Edit</button>
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <input
                                                                            type="number" min="0" max={ans.marks}
                                                                            value={editScore}
                                                                            onChange={e => setEditScore(e.target.value)}
                                                                            autoFocus
                                                                            style={{
                                                                                width: 60, background: 'rgba(255,255,255,0.08)',
                                                                                border: '1px solid rgba(99,102,241,0.5)', borderRadius: 6,
                                                                                color: '#fff', padding: '4px 8px', fontSize: 13, outline: 'none',
                                                                            }}
                                                                        />
                                                                        <button
                                                                            style={{ background: '#6366f1', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                                                                            onClick={() => handleOverrideScore(ans.answerId, ans.marks)}
                                                                        >Save</button>
                                                                        <button
                                                                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
                                                                            onClick={() => setEditingAnswerId(null)}
                                                                        >Cancel</button>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* MCQ answer */}
                                                {isMCQ && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        <div style={{
                                                            padding: '8px 12px', borderRadius: 8, fontSize: 13,
                                                            background: ans.isCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                                                            border: `1px solid ${ans.isCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                                            color: ans.isCorrect ? '#4ade80' : '#f87171',
                                                        }}>
                                                            <span style={{ opacity: 0.7, marginRight: 6 }}>Selected:</span>
                                                            {ans.selectedOptionText || <em style={{ opacity: 0.5 }}>No answer</em>}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Subjective answer */}
                                                {!isMCQ && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                        {/* Student answer */}
                                                        <div style={{
                                                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                                            borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#e2e8f0',
                                                            lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 40,
                                                        }}>
                                                            {ans.answerText || <em style={{ color: 'var(--text-secondary)' }}>No answer written</em>}
                                                        </div>

                                                        {/* AI suggested score */}
                                                        {ans.aiSuggestedScore !== null && ans.aiSuggestedScore !== undefined && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                                                <span style={{ color: 'var(--text-secondary)' }}>🤖 AI suggested:</span>
                                                                <span style={{
                                                                    fontWeight: 700, color: '#818cf8',
                                                                    background: 'rgba(129,140,248,0.12)',
                                                                    padding: '2px 8px', borderRadius: 6,
                                                                    border: '1px solid rgba(129,140,248,0.25)',
                                                                }}>{ans.aiSuggestedScore} / {ans.marks}</span>
                                                            </div>
                                                        )}

                                                        {/* Collapsible AI feedback */}
                                                        {ans.aiFeedback && (
                                                            <div>
                                                                <button
                                                                    onClick={() => setExpandedFeedback(prev => ({ ...prev, [ans.answerId]: !prev[ans.answerId] }))}
                                                                    style={{
                                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                                        color: '#a78bfa', fontSize: 12, padding: 0, fontWeight: 500,
                                                                        display: 'flex', alignItems: 'center', gap: 5,
                                                                    }}
                                                                >
                                                                    <span style={{ fontSize: 10, display: 'inline-block', transform: isFeedbackOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                                                                    Why this score? 💡
                                                                </button>
                                                                <div style={{
                                                                    overflow: 'hidden',
                                                                    maxHeight: isFeedbackOpen ? 300 : 0,
                                                                    transition: 'max-height 0.3s ease',
                                                                }}>
                                                                    <div style={{
                                                                        marginTop: 8, padding: '10px 14px',
                                                                        background: 'rgba(167,139,250,0.06)',
                                                                        border: '1px solid rgba(167,139,250,0.18)',
                                                                        borderRadius: 8, fontSize: 13, color: '#c4b5fd',
                                                                        lineHeight: 1.6,
                                                                    }}>
                                                                        {ans.aiFeedback}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ========== BULK UPLOAD MODAL ========== */}
            {showBulkUploadModal && (
                <div className="ad-modal-overlay" onClick={() => setShowBulkUploadModal(false)}>
                    <div className="ad-modal lg" onClick={e => e.stopPropagation()}>
                        <div className="ad-modal-title">
                            <span>📤 Bulk Upload Questions (CSV)</span>
                            <button className="ad-modal-close" onClick={() => setShowBulkUploadModal(false)}>✕</button>
                        </div>

                        <div className="ad-alert info">
                            <span>
                                <strong>CSV Format:</strong> <code>question,optionA,optionB,optionC,optionD,correctOption,marks</code><br />
                                <code>correctOption</code> must be <strong>A</strong>, <strong>B</strong>, <strong>C</strong>, or <strong>D</strong>. <code>marks</code> must be ≥ 1.
                            </span>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <button className="ad-secondary-btn" onClick={downloadTemplate}>⬇️ Download Template</button>
                        </div>

                        <div className="ad-input-group" style={{ marginBottom: 16 }}>
                            <label>Select CSV File</label>
                            <input type="file" accept=".csv" className="ad-file-input" onChange={e => setBulkUploadFile(e.target.files[0])} />
                        </div>

                        <button className="ad-primary-btn" onClick={handleBulkUpload}
                            disabled={bulkUploadLoading || !bulkUploadFile}
                            style={{ opacity: (bulkUploadLoading || !bulkUploadFile) ? 0.5 : 1 }}>
                            {bulkUploadLoading ? 'Uploading...' : 'Upload & Validate'}
                        </button>

                        {bulkUploadResult?.success && (
                            <div className="ad-alert success" style={{ marginTop: 16 }}>✅ {bulkUploadResult.message}</div>
                        )}
                        {bulkUploadResult && !bulkUploadResult.success && (
                            <div className="ad-alert danger" style={{ marginTop: 16, flexDirection: 'column' }}>
                                <strong>❌ {bulkUploadResult.error}</strong>
                                {bulkUploadResult.details && (
                                    <>
                                        <p style={{ margin: '8px 0 4px' }}>Errors in {bulkUploadResult.errorCount} of {bulkUploadResult.totalRows} rows:</p>
                                        <div className="ad-error-list">
                                            {bulkUploadResult.details.map((d, idx) => (
                                                <div key={idx} className="ad-error-item"><strong>Row {d.row}:</strong> {d.errors.join('; ')}</div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========== AI GENERATOR MODAL ========== */}
            {showAIGenModal && (
                <div className="ad-modal-overlay" onClick={() => !aiGenLoading && setShowAIGenModal(false)}>
                    <div className="ad-modal" onClick={e => e.stopPropagation()}>
                        <div className="ad-modal-title">
                            <span>🤖 Generate Questions with AI</span>
                            {!aiGenLoading && <button className="ad-modal-close" onClick={() => setShowAIGenModal(false)}>✕</button>}
                        </div>

                        <form onSubmit={handleAIGenerate}>
                            <div className="ad-input-group" style={{ marginBottom: 16 }}>
                                <label>AI Prompt</label>
                                <textarea
                                    className="ad-textarea"
                                    rows={3}
                                    required
                                    value={aiGenPrompt}
                                    onChange={e => setAiGenPrompt(e.target.value)}
                                    disabled={aiGenLoading}
                                    placeholder="E.g., Generate difficult MCQ questions about basic algebra and fractions..."
                                />
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                    Describe exactly what kind of questions you want the AI to generate.
                                </div>
                            </div>

                            <div className="ad-input-group" style={{ marginBottom: 12 }}>
                                <label>Number of Questions</label>
                                <input className="ad-input" type="number" min="1" max="20" required value={aiGenNumQuestions} onChange={e => setAiGenNumQuestions(e.target.value)} disabled={aiGenLoading} />
                            </div>

                            <div className="ad-input-group" style={{ marginBottom: 12 }}>
                                <label>Difficulty</label>
                                <select className="ad-select" value={aiGenDifficulty} onChange={e => setAiGenDifficulty(e.target.value)} disabled={aiGenLoading}>
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                            </div>

                            <div className="ad-input-group" style={{ marginBottom: 16 }}>
                                <label>Question Type</label>
                                <select
                                    className="ad-select"
                                    value={aiGenQuestionType}
                                    onChange={e => setAiGenQuestionType(e.target.value)}
                                    disabled={aiGenLoading}
                                >
                                    <option value="MCQ">MCQ (Multiple Choice)</option>
                                    <option value="SUBJECTIVE">Subjective (AI Graded)</option>
                                    <option value="MIXED">Mixed (MCQ + Subjective)</option>
                                </select>
                            </div>

                            <button type="submit" className="ad-primary-btn" disabled={aiGenLoading} style={{ width: '100%', backgroundColor: '#8b5cf6' }}>
                                {aiGenLoading ? '🤖 Generating questions...' : 'Generate Questions'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* ========== STUDENT ACTIVITY MODAL ========== */}
            {(activityLoading || activityStudent) && (
                <div className="ad-modal-overlay" onClick={() => { setActivityStudent(null); setStudentActivity(null); }}>
                    <div
                        className="ad-modal lg"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: 760, maxHeight: '88vh', overflowY: 'auto' }}
                    >
                        <div className="ad-modal-title" style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                            <span>📊 Exam Activity</span>
                            <button className="ad-modal-close" onClick={() => { setActivityStudent(null); setStudentActivity(null); }}>✕</button>
                        </div>

                        {activityLoading && (
                            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
                                Loading activity...
                            </div>
                        )}

                        {studentActivity && (
                            <>
                                {/* Student info header */}
                                <div style={{ padding: '20px 0 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                                        {studentActivity.student.name}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        🎓 Grade: <strong style={{ color: '#818cf8' }}>{studentActivity.student.grade || '—'}</strong>
                                    </div>
                                </div>

                                {/* Summary bar */}
                                {studentActivity.activity.length > 0 && (() => {
                                    const total = studentActivity.activity.length;
                                    const avgPct = Math.round(
                                        studentActivity.activity.reduce((acc, a) => acc + a.percentage, 0) / total
                                    );
                                    return (
                                        <div style={{
                                            display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap'
                                        }}>
                                            <div style={{
                                                flex: 1, minWidth: 140,
                                                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                                                borderRadius: 10, padding: '12px 18px', textAlign: 'center'
                                            }}>
                                                <div style={{ fontSize: 26, fontWeight: 800, color: '#818cf8' }}>{total}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Exams Attempted</div>
                                            </div>
                                            <div style={{
                                                flex: 1, minWidth: 140,
                                                background: avgPct >= 60 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                                                border: `1px solid ${avgPct >= 60 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                                borderRadius: 10, padding: '12px 18px', textAlign: 'center'
                                            }}>
                                                <div style={{ fontSize: 26, fontWeight: 800, color: avgPct >= 60 ? '#4ade80' : '#f87171' }}>{avgPct}%</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Overall Average</div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Activity table or empty state */}
                                {studentActivity.activity.length === 0 ? (
                                    <div className="ad-empty" style={{ padding: '32px 0' }}>
                                        <div className="ad-empty-icon">📭</div>
                                        <p>No exam activity yet.</p>
                                    </div>
                                ) : (
                                    <table className="ad-table">
                                        <thead>
                                            <tr>
                                                <th>Exam Title</th>
                                                <th>Course</th>
                                                <th>Date</th>
                                                <th style={{ textAlign: 'center' }}>Score</th>
                                                <th style={{ textAlign: 'center' }}>Max</th>
                                                <th style={{ textAlign: 'center' }}>%</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentActivity.activity.map((a, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ color: '#e2e8f0', fontWeight: 500 }}>{a.examTitle}</td>
                                                    <td style={{ color: 'var(--text-secondary)' }}>{a.courseName}</td>
                                                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(a.scheduledDate).toLocaleDateString()}</td>
                                                    <td style={{ textAlign: 'center', color: '#818cf8', fontWeight: 700 }}>{a.totalScore}</td>
                                                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{a.maxPossibleScore}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{
                                                            fontWeight: 700, fontSize: 13,
                                                            color: a.percentage >= 60 ? '#4ade80' : '#f87171'
                                                        }}>{a.percentage}%</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
