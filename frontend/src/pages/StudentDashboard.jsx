import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal, Form, Button } from 'react-bootstrap';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './StudentDashboard.css';
import infinitySymbol from '../assets/images/infinity-symbol.png';

const StudentDashboard = () => {
    const { user, logout } = useAuth();

    // Dashboard data
    const [dashData, setDashData] = useState(null);
    const [dashLoading, setDashLoading] = useState(true);

    // Exam list & taking
    const [exams, setExams] = useState([]);
    const [activeExam, setActiveExam] = useState(null);
    const [answers, setAnswers] = useState({});
    const [submissionResult, setSubmissionResult] = useState(null);
    const [viewingResult, setViewingResult] = useState(null);
    const [resultFeedbackExpanded, setResultFeedbackExpanded] = useState({});

    // Exam Timer
    const [timeLeft, setTimeLeft] = useState(null);

    // Password modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [examPassword, setExamPassword] = useState('');

    // Active sidebar tab
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isFullscreenReady, setIsFullscreenReady] = useState(false);

    // Exam attempt UI state
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

    // Calendar month navigation
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [calYear, setCalYear] = useState(new Date().getFullYear());

    // Available Exams filter/sort
    const [availCourseFilter, setAvailCourseFilter] = useState('');
    const [availStatusFilter, setAvailStatusFilter] = useState('');
    const [availSort, setAvailSort] = useState('date-newest');

    // Recent Results filter/sort
    const [resultsCourseFilter, setResultsCourseFilter] = useState('');
    const [resultsSort, setResultsSort] = useState('date-newest');

    useEffect(() => {
        fetchDashboard();
        fetchExams();
    }, []);

    // --- Filtered and Sorted Lists ---

    // Unique courses from available exams
    const availExamCourses = useMemo(() => {
        const unique = {};
        exams.forEach(ex => {
            if (ex.course) unique[ex.course.id] = ex.course.name;
        });
        return Object.entries(unique).map(([id, name]) => ({ id, name }));
    }, [exams]);

    // Unique courses from recent results
    const resultsCourses = useMemo(() => {
        const unique = new Set();
        dashData?.recentResults?.forEach(sub => {
            if (sub.exam?.course?.name) unique.add(sub.exam.course.name);
        });
        return [...unique].sort();
    }, [dashData]);

    const filteredUpcomingExams = useMemo(() => {
        let list = [...exams];
        const now = new Date();

        // Filter by Course
        if (availCourseFilter) {
            list = list.filter(ex => ex.courseId === availCourseFilter);
        }

        // Filter by Status
        if (availStatusFilter) {
            list = list.filter(ex => {
                const isUpcoming = new Date(ex.scheduledDate) > now;
                if (availStatusFilter === 'upcoming') return isUpcoming;
                if (availStatusFilter === 'past') return !isUpcoming;
                return true;
            });
        }

        // Sort
        if (availSort === 'date-newest') list.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
        else if (availSort === 'date-oldest') list.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
        else if (availSort === 'title-az') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        else if (availSort === 'title-za') list.sort((a, b) => (b.title || '').localeCompare(a.title || ''));

        return list;
    }, [exams, availCourseFilter, availStatusFilter, availSort]);

    const filteredResults = useMemo(() => {
        if (!dashData?.recentResults) return [];
        let list = [...dashData.recentResults];

        // Filter by Course
        if (resultsCourseFilter) {
            list = list.filter(sub => sub.exam?.course?.name === resultsCourseFilter);
        }

        // Sort
        if (resultsSort === 'date-newest') list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        else if (resultsSort === 'date-oldest') list.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
        else if (resultsSort === 'score-high') list.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        else if (resultsSort === 'score-low') list.sort((a, b) => (a.totalScore || 0) - (b.totalScore || 0));

        return list;
    }, [dashData, resultsCourseFilter, resultsSort]);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/student/dashboard');
            setDashData(res.data);
        } catch (err) {
            console.error(err);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                logout();
            }
        } finally {
            setDashLoading(false);
        }
    };

    const fetchExams = async () => {
        try {
            const response = await api.get('/exams');
            setExams(response.data);
        } catch (err) {
            console.error(err);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                logout();
            } else {
                toast.error('Failed to fetch exams');
            }
        }
    };

    const initiateExamStart = (examId) => {
        setSelectedExamId(examId);
        setExamPassword('');
        setShowPasswordModal(true);
    };

    const handleVerifyAndStart = async (e) => {
        e.preventDefault();
        try {
            await api.post('/student/verify-exam', {
                examId: selectedExamId,
                password: examPassword
            });
            const response = await api.get(`/student/exam/${selectedExamId}`);
            setActiveExam(response.data);
            setAnswers({});
            setSubmissionResult(null);
            setShowPasswordModal(false);
            setCurrentQuestion(0);
            setFlaggedQuestions(new Set());

            // Do not start timer yet — wait for Fullscreen Modal
            setIsFullscreenReady(true);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Verification failed');
        }
    };

    const handleViewResult = async (examId) => {
        try {
            const response = await api.get(`/student/submission/${examId}`);
            setViewingResult(response.data);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to fetch result');
        }
    };

    const handleOptionSelect = (questionId, optionId) => {
        setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], selectedOptionId: optionId } }));
    };

    const handleAnswerText = (questionId, text) => {
        setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], answerText: text } }));
    };

    const handleSubmitExam = async (isAutoSubmit = false, customMessage = null) => {
        const formattedAnswers = activeExam.questions.map(q => ({
            questionId: q.id,
            selectedOptionId: q.type === 'MCQ' ? (answers[q.id]?.selectedOptionId || null) : null,
            answerText: q.type === 'SUBJECTIVE' ? (answers[q.id]?.answerText || '') : null,
        }));
        try {
            const response = await api.post('/student/submit-exam', {
                examId: activeExam.id,
                answers: formattedAnswers
            });
            setSubmissionResult(response.data);

            // Exit fullscreen if active
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }

            if (customMessage) {
                toast.info(customMessage);
            } else if (isAutoSubmit) {
                toast.info("Time's up! Your exam has been submitted automatically.");
            } else {
                toast.success('Exam submitted! Results will be available once released by the teacher.');
            }
            setActiveExam(null);
            setTimeLeft(null); // Clear timer
            setIsFullscreenReady(false);
            setCurrentQuestion(0);
            setFlaggedQuestions(new Set());
            setShowSubmitConfirm(false);
            fetchDashboard(); // refresh analytics
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit exam');
        }
    };

    // Fullscreen constraints & security listeners
    useEffect(() => {
        // Only enforce anti-cheat if exam is fully active and fullscreen modal is cleared (timer running)
        if (!activeExam || isFullscreenReady || timeLeft === null) return;

        const handleSecurityViolation = () => {
            handleSubmitExam(true, "Exam submitted due to fullscreen exit or window switch.");
        };

        const onFullscreenChange = () => {
            if (!document.fullscreenElement) handleSecurityViolation();
        };

        const onVisibilityChange = () => {
            if (document.hidden) handleSecurityViolation();
        };

        const onBlur = () => {
            handleSecurityViolation();
        };

        const onKeyDown = (e) => {
            // Disable Ctrl+C, Ctrl+V, etc...
            if (
                e.key === 'F11' ||
                (e.ctrlKey && ['c', 'v', 'x', 't', 'w'].includes(e.key.toLowerCase())) ||
                (e.metaKey && ['c', 'v', 'x', 't', 'w'].includes(e.key.toLowerCase())) ||
                (e.altKey && e.key === 'Tab')
            ) {
                e.preventDefault();
            }
        };

        const onContextMenu = (e) => e.preventDefault(); // disable right click

        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('blur', onBlur);
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('contextmenu', onContextMenu);

        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('contextmenu', onContextMenu);
        };
    }, [activeExam, isFullscreenReady, timeLeft, answers]);

    // Timer effect
    useEffect(() => {
        if (!activeExam || isFullscreenReady || timeLeft === null) return;

        if (timeLeft <= 0) {
            handleSubmitExam(true);
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [activeExam, isFullscreenReady, timeLeft]);

    // Format mm:ss
    const formatTime = (seconds) => {
        if (seconds === null) return "00:00";
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Calendar helpers
    const getColorClass = (pct) => pct >= 80 ? 'green' : pct >= 60 ? 'yellow' : 'red';

    const calendarData = useMemo(() => {
        const firstDay = new Date(calYear, calMonth, 1).getDay();
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const today = new Date();

        // Map day-of-month → [exam objects] for the visible month
        const examsByDay = {};
        if (dashData?.upcomingExams) {
            dashData.upcomingExams.forEach(ex => {
                const d = new Date(ex.scheduledDate);
                if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
                    const day = d.getDate();
                    if (!examsByDay[day]) examsByDay[day] = [];
                    examsByDay[day].push({ ...ex, _date: d });
                }
            });
        }

        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push({ empty: true });
        for (let d = 1; d <= daysInMonth; d++) {
            const exams = examsByDay[d] || [];
            cells.push({
                day: d,
                isToday: d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear(),
                hasExam: exams.length > 0,
                exams,
            });
        }
        return cells;
    }, [calMonth, calYear, dashData]);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const prevMonth = () => {
        if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
        else setCalMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
        else setCalMonth(m => m + 1);
    };

    // Loading state
    if (dashLoading) {
        return (
            <div className="sd-loading">
                <div className="sd-spinner"></div>
            </div>
        );
    }

    // Exam taking view
    if (activeExam) {
        if (isFullscreenReady) {
            return (
                <div className="sd-modal-overlay">
                    <div className="sd-modal">
                        <h3>Start Exam Session</h3>
                        <p style={{ color: 'var(--sd-text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
                            This exam will run in fullscreen mode with strict anti-cheat monitoring. <br /><br />
                            <strong>Warning:</strong> Exiting fullscreen, switching tabs, hiding the window, or using unauthorized keyboard shortcuts will automatically submit your exam immediately.
                        </p>
                        <div className="sd-modal-actions">
                            <button className="sd-btn-cancel" onClick={() => {
                                setActiveExam(null);
                                setIsFullscreenReady(false);
                            }}>Cancel</button>
                            <button className="sd-btn-submit" onClick={() => {
                                document.documentElement.requestFullscreen().catch((err) => {
                                    toast.error(`Error attempting to enable fullscreen: ${err.message}`);
                                });
                                setTimeLeft(activeExam.durationMinutes * 60);
                                setIsFullscreenReady(false);
                            }}>Start Exam</button>
                        </div>
                    </div>
                </div>
            );
        }

        // ─── Stitch Exam Attempt Interface ───────────────────────────────
        const questions = activeExam.questions;
        const totalQ = questions.length;
        const q = questions[currentQuestion];
        const isTimerWarning = timeLeft !== null && timeLeft <= 300;
        const isTimerDanger = timeLeft !== null && timeLeft <= 60;

        // Stats for confirm dialog
        const answeredCount = questions.filter(question => {
            if (question.type === 'MCQ') return !!answers[question.id]?.selectedOptionId;
            return !!(answers[question.id]?.answerText?.trim());
        }).length;
        const flaggedCount = flaggedQuestions.size;
        const unansweredCount = totalQ - answeredCount;

        const goToQuestion = (idx) => setCurrentQuestion(idx);

        const handleToggleFlag = () => {
            setFlaggedQuestions(prev => {
                const next = new Set(prev);
                if (next.has(q.id)) next.delete(q.id);
                else next.add(q.id);
                return next;
            });
        };

        const getQNavClass = (idx) => {
            const qId = questions[idx].id;
            const isAnswered = questions[idx].type === 'MCQ'
                ? !!answers[qId]?.selectedOptionId
                : !!(answers[qId]?.answerText?.trim());
            if (idx === currentQuestion) return 'ea-qnav-btn current';
            if (flaggedQuestions.has(qId)) return 'ea-qnav-btn flagged';
            if (isAnswered) return 'ea-qnav-btn answered';
            return 'ea-qnav-btn';
        };

        return (
            <div className="ea-wrapper">
                {/* ── Top Bar ── */}
                <div className="ea-topbar">
                    <div className="ea-topbar-left">
                        <div className="ea-logo"><img src={infinitySymbol} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} /><span>Smart<span style={{ color: '#818cf8' }}>Score</span></span></div>
                    </div>
                    <div className="ea-topbar-center">
                        {activeExam.course?.name && <span className="ea-course-name">{activeExam.course.name}</span>}
                        <span className="ea-exam-title">{activeExam.title}</span>
                    </div>
                    <div className="ea-topbar-right">
                        <div className={`ea-timer${isTimerWarning ? (isTimerDanger ? ' danger' : ' warning') : ''}`}>
                            <span className="ea-timer-icon">⏱</span>
                            {formatTime(timeLeft)}
                        </div>
                        <div className="ea-avatar">{(user?.name || 'S')[0].toUpperCase()}</div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="ea-body">
                    {/* Left: Question Navigator */}
                    <div className="ea-sidebar">
                        <div className="ea-sidebar-header">
                            <span className="ea-sidebar-title">QUESTION NAVIGATOR</span>
                            <span className="ea-sidebar-count">{currentQuestion + 1}/{totalQ}</span>
                        </div>

                        {/* Legend */}
                        <div className="ea-legend">
                            <div className="ea-legend-item"><span className="ea-legend-dot answered"></span>Answered</div>
                            <div className="ea-legend-item"><span className="ea-legend-dot current"></span>Current</div>
                            <div className="ea-legend-item"><span className="ea-legend-dot flagged"></span>Flagged</div>
                            <div className="ea-legend-item"><span className="ea-legend-dot pending"></span>Pending</div>
                        </div>

                        {/* Grid of question numbers */}
                        <div className="ea-qnav-grid">
                            {questions.map((_, idx) => (
                                <button
                                    key={idx}
                                    className={getQNavClass(idx)}
                                    onClick={() => goToQuestion(idx)}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Question Panel */}
                    <div className="ea-main">
                        <div className="ea-question-label">QUESTION {currentQuestion + 1} OF {totalQ}</div>

                        <div className="ea-question-card">
                            <div className="ea-question-text">
                                {q.questionText}
                                <span className="ea-question-marks"> ({q.marks} mark{q.marks !== 1 ? 's' : ''})</span>
                            </div>

                            {q.type === 'MCQ' ? (
                                <div className="ea-options-list">
                                    {q.options.map(opt => (
                                        <label
                                            key={opt.id}
                                            className={`ea-mcq-option${answers[q.id]?.selectedOptionId === opt.id ? ' selected' : ''}`}
                                            onClick={() => handleOptionSelect(q.id, opt.id)}
                                        >
                                            <input
                                                type="radio"
                                                name={`q-${q.id}`}
                                                checked={answers[q.id]?.selectedOptionId === opt.id}
                                                onChange={() => handleOptionSelect(q.id, opt.id)}
                                                className="ea-radio"
                                            />
                                            <span className="ea-radio-custom"></span>
                                            <span className="ea-option-text">{opt.optionText}</span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <div className="ea-textarea-wrap">
                                    <textarea
                                        className="ea-textarea"
                                        placeholder="Write your answer here..."
                                        value={answers[q.id]?.answerText || ''}
                                        onChange={e => handleAnswerText(q.id, e.target.value)}
                                        rows={8}
                                    />
                                    <span className="ea-char-count">
                                        {(answers[q.id]?.answerText || '').length} chars
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Bottom Bar ── */}
                <div className="ea-bottombar">
                    <button
                        className="ea-btn ea-btn-prev"
                        onClick={() => setCurrentQuestion(i => Math.max(0, i - 1))}
                        disabled={currentQuestion === 0}
                    >
                        ← Previous
                    </button>

                    <button
                        className={`ea-btn ea-btn-flag${flaggedQuestions.has(q.id) ? ' flagged' : ''}`}
                        onClick={handleToggleFlag}
                    >
                        🚩 {flaggedQuestions.has(q.id) ? 'Unflag' : 'Flag for Review'}
                    </button>

                    <button
                        className="ea-btn ea-btn-next"
                        onClick={() => setCurrentQuestion(i => Math.min(totalQ - 1, i + 1))}
                        disabled={currentQuestion === totalQ - 1}
                    >
                        Save &amp; Next →
                    </button>

                    <button
                        className="ea-btn ea-btn-submit"
                        onClick={() => setShowSubmitConfirm(true)}
                    >
                        Submit Exam
                    </button>
                </div>

                {/* ── Submit Confirm Dialog ── */}
                {showSubmitConfirm && (
                    <div className="ea-confirm-overlay" onClick={() => setShowSubmitConfirm(false)}>
                        <div className="ea-confirm-dialog" onClick={e => e.stopPropagation()}>
                            <div className="ea-confirm-title">Submit Exam?</div>
                            <p className="ea-confirm-subtitle">Are you sure you want to submit? You cannot change your answers after submission.</p>
                            <div className="ea-confirm-stats">
                                <div className="ea-confirm-stat answered">
                                    <span className="ea-confirm-stat-val">{answeredCount}</span>
                                    <span className="ea-confirm-stat-label">Answered</span>
                                </div>
                                <div className="ea-confirm-stat flagged">
                                    <span className="ea-confirm-stat-val">{flaggedCount}</span>
                                    <span className="ea-confirm-stat-label">Flagged</span>
                                </div>
                                <div className="ea-confirm-stat unanswered">
                                    <span className="ea-confirm-stat-val">{unansweredCount}</span>
                                    <span className="ea-confirm-stat-label">Unanswered</span>
                                </div>
                            </div>
                            <div className="ea-confirm-actions">
                                <button className="ea-confirm-cancel" onClick={() => setShowSubmitConfirm(false)}>Cancel</button>
                                <button className="ea-confirm-ok" onClick={() => { setShowSubmitConfirm(false); handleSubmitExam(false); }}>Submit Exam</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const stats = dashData?.stats || {};
    const studentInfo = dashData?.student || {};
    const subjectAnalysis = dashData?.subjectAnalysis || [];
    const upcomingExams = dashData?.upcomingExams || [];
    const recentResults = dashData?.recentResults || [];

    return (
        <div className="sd-wrapper">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} logout={logout} />

            <div className="sd-main">
                {/* Alert for submission */}
                {submissionResult && (
                    <div className="sd-alert">
                        <span>✅ Exam submitted! Please wait for the teacher to release the results.</span>
                        <button className="sd-alert-close" onClick={() => setSubmissionResult(null)}>✕</button>
                    </div>
                )}

                {activeTab === 'dashboard' && (
                    <>
                        {/* Header */}
                        <div className="sd-header">
                            <div className="sd-header-left">
                                <h1>Welcome back, {studentInfo.name || user?.name}! 👋</h1>
                                <p>{studentInfo.grade} • Semester {studentInfo.semester || '—'} {studentInfo.section ? `• Section ${studentInfo.section}` : ''} {studentInfo.universityRollNumber ? `• Uni Roll: ${studentInfo.universityRollNumber}` : ''}</p>
                            </div>
                            <div className="sd-header-right">
                                <span className="sd-badge">📚 Student</span>
                                <button className="sd-logout-btn" onClick={logout}>Logout</button>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="sd-stats-grid">
                            <div className="sd-stat-card">
                                <div className="sd-stat-label">Overall Performance</div>
                                <div className="sd-stat-value-row">
                                    <div>
                                        <span className="sd-stat-value">{stats.overallPercentage}</span>
                                        <span className="sd-stat-unit">%</span>
                                    </div>
                                    <div className="sd-stat-icon purple">📊</div>
                                </div>
                            </div>
                            <div className="sd-stat-card">
                                <div className="sd-stat-label">Exams Taken</div>
                                <div className="sd-stat-value-row">
                                    <span className="sd-stat-value">{stats.totalExams}</span>
                                    <div className="sd-stat-icon blue">📝</div>
                                </div>
                            </div>
                            <div className="sd-stat-card">
                                <div className="sd-stat-label">Average Score</div>
                                <div className="sd-stat-value-row">
                                    <span className="sd-stat-value">{stats.avgScore}</span>
                                    <div className="sd-stat-icon green">🎯</div>
                                </div>
                            </div>
                            <div className="sd-stat-card">
                                <div className="sd-stat-label">Best Subject</div>
                                <div className="sd-stat-value-row">
                                    <span className="sd-stat-value" style={{ fontSize: stats.bestSubject?.length > 10 ? '20px' : '28px' }}>
                                        {stats.bestSubject}
                                    </span>
                                    <div className="sd-stat-icon yellow">🏆</div>
                                </div>
                            </div>
                        </div>

                        {/* 2x2 Analytics Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="sd-analytics-grid">

                            {/* TOP LEFT — Subject-wise Analysis */}
                            <div className="sd-section" style={{ margin: 0 }}>
                                <div className="sd-section-header">
                                    <div className="sd-section-title">
                                        <span className="icon">📈</span> Subject-wise Analysis
                                    </div>
                                </div>
                                {subjectAnalysis.length > 0 ? (
                                    <div className="sd-subject-list">
                                        {subjectAnalysis.map(s => (
                                            <div key={s.courseId} className="sd-subject-item">
                                                <div className="sd-subject-top">
                                                    <span className="sd-subject-name">{s.courseName}</span>
                                                    <span className="sd-subject-score">
                                                        <strong>{s.totalScore}</strong> / {s.totalMarks} marks
                                                        <span className={`sd-subject-percentage ${getColorClass(s.percentage)}`}> ({s.percentage}%)</span>
                                                    </span>
                                                </div>
                                                <div className="sd-progress-bar">
                                                    <div
                                                        className={`sd-progress-fill ${getColorClass(s.percentage)}`}
                                                        style={{ width: `${s.percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="sd-empty">
                                        <div className="sd-empty-icon">📚</div>
                                        <p>No exam data yet. Take some exams to see your analysis!</p>
                                    </div>
                                )}
                            </div>

                            {/* TOP RIGHT — Calendar */}
                            <div className="sd-section" style={{ margin: 0 }}>
                                <div className="sd-section-header">
                                    <div className="sd-section-title">
                                        <span className="icon">📅</span> Exam Calendar
                                    </div>
                                </div>
                                <div className="sd-calendar-wrapper">
                                    <div className="sd-calendar-nav">
                                        <button className="sd-calendar-nav-btn" onClick={prevMonth}>‹</button>
                                        <h3>{monthNames[calMonth]} {calYear}</h3>
                                        <button className="sd-calendar-nav-btn" onClick={nextMonth}>›</button>
                                    </div>
                                    <div className="sd-calendar-grid">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                            <div key={d} className="sd-calendar-day-label">{d}</div>
                                        ))}
                                        {calendarData.map((cell, i) => (
                                            <div
                                                key={i}
                                                className={`sd-calendar-cell ${cell.empty ? 'empty' : ''} ${cell.isToday ? 'today' : ''} ${cell.hasExam ? 'has-exam' : ''}`}
                                            >
                                                {cell.day || ''}
                                                {cell.hasExam && cell.exams.length > 0 && (
                                                    <div className="sd-cal-tooltip">
                                                        {cell.exams.map(ex => (
                                                            <div key={ex.id} className="sd-cal-tooltip-item">
                                                                <div className="sd-cal-tooltip-title">{ex.title}</div>
                                                                <div className="sd-cal-tooltip-meta">
                                                                    {ex.course?.name && <span>{ex.course.name}</span>}
                                                                    {ex.course?.name && <span className="sd-cal-tooltip-dot">·</span>}
                                                                    <span>⏱ {ex.durationMinutes} min</span>
                                                                    {ex._date && (
                                                                        <><span className="sd-cal-tooltip-dot">·</span>
                                                                            <span>{ex._date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* BOTTOM LEFT — Recent Results */}
                            <div className="sd-section" style={{ margin: 0 }}>
                                <div className="sd-section-header">
                                    <div className="sd-section-title">
                                        <span className="icon">📋</span> Recent Results
                                    </div>
                                    <div className="filter-row">
                                        <select
                                            className={`filter-select${resultsCourseFilter ? ' active' : ''}`}
                                            value={resultsCourseFilter}
                                            onChange={e => setResultsCourseFilter(e.target.value)}
                                            style={{ minWidth: 120 }}
                                        >
                                            <option value="">All Courses</option>
                                            {resultsCourses.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <select
                                            className={`filter-select${resultsSort !== 'date-newest' ? ' active' : ''}`}
                                            value={resultsSort}
                                            onChange={e => setResultsSort(e.target.value)}
                                            style={{ minWidth: 130 }}
                                        >
                                            <option value="date-newest">Date (Newest)</option>
                                            <option value="date-oldest">Date (Oldest)</option>
                                            <option value="score-high">Score (High-Low)</option>
                                            <option value="score-low">Score (Low-High)</option>
                                        </select>
                                        {(resultsCourseFilter || resultsSort !== 'date-newest') && (
                                            <button className="filter-clear" onClick={() => { setResultsCourseFilter(''); setResultsSort('date-newest'); }}>✕</button>
                                        )}
                                    </div>
                                </div>
                                {filteredResults.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {filteredResults.map(r => (
                                            <div key={r.examId} className="sd-result-card">
                                                <div className="sd-result-top">
                                                    <div>
                                                        <div className="sd-result-title">{r.examTitle}</div>
                                                        <div className="sd-result-course">{r.courseName}</div>
                                                    </div>
                                                    {r.resultsReleased ? (
                                                        <div className={`sd-result-percent ${getColorClass(r.percentage)}`}>
                                                            {r.percentage}%
                                                        </div>
                                                    ) : (
                                                        <div className="sd-result-percent" style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '4px 8px' }}>
                                                            Pending
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="sd-result-bottom">
                                                    {r.resultsReleased ? (
                                                        <>
                                                            <span className="sd-result-score">
                                                                Score: <strong>{r.totalScore}</strong> / {r.totalMarks}
                                                            </span>
                                                            <button className="sd-view-btn" onClick={() => handleViewResult(r.examId)}>
                                                                View Details
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="sd-result-score" style={{ color: 'var(--text-secondary)' }}>
                                                            Result Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="sd-empty">
                                        <div className="sd-empty-icon">📋</div>
                                        <p>{resultsCourseFilter ? 'No results match your filter.' : 'No results released yet.'}</p>
                                    </div>
                                )}
                            </div>

                            {/* BOTTOM RIGHT — Upcoming Exams */}
                            <div className="sd-section" style={{ margin: 0 }}>
                                <div className="sd-section-header">
                                    <div className="sd-section-title">
                                        <span className="icon">🗓</span> Upcoming Exams
                                    </div>
                                </div>
                                {upcomingExams.length > 0 ? (
                                    <div className="sd-upcoming-list">
                                        {upcomingExams.slice(0, 4).map(ex => {
                                            const d = new Date(ex.scheduledDate);
                                            return (
                                                <div key={ex.id} className="sd-upcoming-item">
                                                    <div className="sd-upcoming-date">
                                                        <div className="day">{d.getDate()}</div>
                                                        <div className="month">{monthNames[d.getMonth()].slice(0, 3)}</div>
                                                    </div>
                                                    <div className="sd-upcoming-info">
                                                        <div className="sd-upcoming-title">{ex.title}</div>
                                                        <div className="sd-upcoming-meta">{ex.course?.name} • {ex.grade?.name}</div>
                                                    </div>
                                                    <div className="sd-upcoming-duration" style={{ textAlign: 'right', fontSize: '13px' }}>
                                                        <div style={{ fontWeight: '500' }}>⏱ {ex.durationMinutes} min</div>
                                                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>📋 {ex._count?.questions || 0} Qs</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="sd-empty">
                                        <div className="sd-empty-icon">🎉</div>
                                        <p>No upcoming exams scheduled!</p>
                                    </div>
                                )}
                            </div>

                        </div>

                    </>
                )}

                {activeTab === 'exams' && (
                    <div className="sd-section" style={{ padding: 24 }}>
                        <div className="sd-section-header" style={{ marginBottom: 20 }}>
                            <div className="sd-section-title">
                                <span className="icon">📝</span> All Available Exams
                            </div>
                            <div className="filter-row">
                                <select
                                    className={`filter-select${availCourseFilter ? ' active' : ''}`}
                                    value={availCourseFilter}
                                    onChange={e => setAvailCourseFilter(e.target.value)}
                                >
                                    <option value="">All Courses</option>
                                    {availExamCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <select
                                    className={`filter-select${availStatusFilter ? ' active' : ''}`}
                                    value={availStatusFilter}
                                    onChange={e => setAvailStatusFilter(e.target.value)}
                                >
                                    <option value="">All Status</option>
                                    <option value="upcoming">Upcoming</option>
                                    <option value="past">Past</option>
                                </select>
                                <select
                                    className={`filter-select${availSort !== 'date-newest' ? ' active' : ''}`}
                                    value={availSort}
                                    onChange={e => setAvailSort(e.target.value)}
                                >
                                    <option value="date-newest">Date (Newest)</option>
                                    <option value="date-oldest">Date (Oldest)</option>
                                    <option value="title-az">Title (A-Z)</option>
                                    <option value="title-za">Title (Z-A)</option>
                                </select>
                                {(availCourseFilter || availStatusFilter || availSort !== 'date-newest') && (
                                    <button className="filter-clear" onClick={() => {
                                        setAvailCourseFilter('');
                                        setAvailStatusFilter('');
                                        setAvailSort('date-newest');
                                    }}>✕ Clear</button>
                                )}
                            </div>
                        </div>

                        {filteredUpcomingExams.length > 0 ? (
                            <div className="sd-exam-list-grid">
                                {filteredUpcomingExams.map(exam => (
                                    <div key={exam.id} className="sd-exam-card">
                                        <div className="sd-exam-card-title">{exam.title}</div>
                                        <div className="sd-exam-card-sub">{exam.grade?.name} — {exam.course?.name}</div>
                                        <div className="sd-exam-card-info">
                                            📅 {new Date(exam.scheduledDate).toLocaleString()}<br />
                                            ⏱ {exam.durationMinutes} mins &nbsp;•&nbsp; 📋 {exam._count?.questions || 0} questions
                                        </div>
                                        <div className="sd-exam-card-actions">
                                            <button className="sd-take-exam-btn" onClick={() => initiateExamStart(exam.id)}>
                                                Take Exam
                                            </button>
                                            {exam.resultsReleased && (
                                                <button className="sd-view-btn" onClick={() => handleViewResult(exam.id)}>
                                                    View Result
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="sd-empty">
                                <div className="sd-empty-icon">📝</div>
                                <p>{(availCourseFilter || availStatusFilter) ? 'No exams match your filters.' : 'No exams available for your grade.'}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="sd-modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="sd-modal" onClick={e => e.stopPropagation()}>
                        <div className="sd-modal-title">
                            <span>🔒 Enter Exam Password</span>
                            <button className="sd-modal-close" onClick={() => setShowPasswordModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleVerifyAndStart}>
                            <div className="sd-input-group">
                                <span className="hint">Check with your teacher for the exam password. You can only attempt this exam once.</span>
                                <label>Password</label>
                                <input
                                    type="password"
                                    className="sd-input"
                                    required
                                    value={examPassword}
                                    onChange={e => setExamPassword(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <button type="submit" className="sd-primary-btn">Start Exam</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Result Modal */}
            {viewingResult && (
                <div className="sd-modal-overlay" onClick={() => { setViewingResult(null); setResultFeedbackExpanded({}); }}>
                    <div
                        className="sd-modal lg"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}
                    >
                        <div
                            className="sd-modal-title"
                            style={{ position: 'sticky', top: 0, background: 'var(--sd-card)', zIndex: 10, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                        >
                            <span>📊 Exam Result</span>
                            <button className="sd-modal-close" onClick={() => { setViewingResult(null); setResultFeedbackExpanded({}); }}>✕</button>
                        </div>

                        <div className="sd-result-modal-score">
                            Total Score: {viewingResult.totalScore}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24 }}>
                            {viewingResult.answers?.map((ans, idx) => {
                                const isMCQ = ans.question.type === 'MCQ';
                                const isFeedbackOpen = !!resultFeedbackExpanded[ans.id];
                                return (
                                    <div key={ans.id} style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${isMCQ ? 'rgba(99,102,241,0.18)' : 'rgba(139,92,246,0.22)'}`,
                                        borderRadius: 12,
                                        padding: '14px 16px',
                                    }}>
                                        {/* Question header */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <span style={{
                                                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                                                background: isMCQ ? 'rgba(99,102,241,0.12)' : 'rgba(139,92,246,0.12)',
                                                color: isMCQ ? '#818cf8' : '#a78bfa',
                                                border: `1px solid ${isMCQ ? 'rgba(99,102,241,0.28)' : 'rgba(139,92,246,0.28)'}`,
                                            }}>{isMCQ ? 'MCQ' : 'Subjective'}</span>
                                            <span style={{ fontSize: 12, color: 'var(--sd-text-muted)' }}>
                                                Q{idx + 1} · {ans.question.marks} mark{ans.question.marks !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', lineHeight: 1.5, marginBottom: 10 }}>
                                            {ans.question.questionText}
                                        </div>

                                        {isMCQ ? (
                                            /* MCQ answer */
                                            <div className={`sd-result-answer-a ${ans.selectedOption?.isCorrect ? 'correct' : 'incorrect'}`}>
                                                Your Answer: {ans.selectedOption?.optionText || 'Unanswered'}
                                                {ans.selectedOption?.isCorrect ? ' ✓ Correct' : ' ✗ Incorrect'}
                                            </div>
                                        ) : (
                                            /* Subjective answer */
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {/* Written answer */}
                                                <div style={{
                                                    background: 'rgba(255,255,255,0.04)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: 8, padding: '10px 14px',
                                                    fontSize: 13, color: '#e2e8f0',
                                                    lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 36,
                                                }}>
                                                    {ans.answerText || <em style={{ color: 'var(--sd-text-muted)' }}>No answer written</em>}
                                                </div>

                                                {/* Score badge */}
                                                {(ans.finalScore !== null && ans.finalScore !== undefined) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                                        <span style={{ color: 'var(--sd-text-muted)' }}>🤖 AI Score:</span>
                                                        <span style={{
                                                            fontWeight: 700, color: '#818cf8',
                                                            background: 'rgba(129,140,248,0.12)',
                                                            padding: '2px 8px', borderRadius: 6,
                                                            border: '1px solid rgba(129,140,248,0.25)',
                                                        }}>{ans.finalScore} / {ans.question.marks}</span>
                                                    </div>
                                                )}

                                                {/* Collapsible AI feedback */}
                                                {ans.aiFeedback && (
                                                    <div>
                                                        <button
                                                            onClick={() => setResultFeedbackExpanded(prev => ({ ...prev, [ans.id]: !prev[ans.id] }))}
                                                            style={{
                                                                background: 'none', border: 'none', cursor: 'pointer',
                                                                color: '#a78bfa', fontSize: 12, padding: 0, fontWeight: 500,
                                                                display: 'flex', alignItems: 'center', gap: 5,
                                                            }}
                                                        >
                                                            <span style={{
                                                                fontSize: 10, display: 'inline-block',
                                                                transform: isFeedbackOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                                                transition: 'transform 0.2s'
                                                            }}>▶</span>
                                                            AI Feedback 💡
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
                                                                borderRadius: 8, fontSize: 13,
                                                                color: '#c4b5fd', lineHeight: 1.6,
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
                    </div>
                </div>
            )}
        </div>
    );
};

// Sidebar Component
const Sidebar = ({ activeTab, setActiveTab, logout }) => (
    <div className="sd-sidebar">
        <div className="sd-sidebar-logo"><img src={infinitySymbol} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} /><span>Smart<span style={{ color: '#818cf8' }}>Score</span></span></div>
        <div
            className={`sd-sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
        ><span className="nav-icon">📊</span> Dashboard</div>
        <div
            className={`sd-sidebar-item ${activeTab === 'exams' ? 'active' : ''}`}
            onClick={() => setActiveTab('exams')}
        ><span className="nav-icon">📝</span> Exams</div>
        <div className="sd-sidebar-bottom">
            <div className="sd-sidebar-item" onClick={logout}><span className="nav-icon">🚪</span> Logout</div>
        </div>
    </div>
);

export default StudentDashboard;
