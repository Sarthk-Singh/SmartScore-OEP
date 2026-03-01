import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal, Form, Button } from 'react-bootstrap';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './StudentDashboard.css';

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

    // Exam Timer
    const [timeLeft, setTimeLeft] = useState(null);

    // Password modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [examPassword, setExamPassword] = useState('');

    // Active sidebar tab
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isFullscreenReady, setIsFullscreenReady] = useState(false);

    // Calendar month navigation
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [calYear, setCalYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchDashboard();
        fetchExams();
    }, []);

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
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleSubmitExam = async (isAutoSubmit = false, customMessage = null) => {
        const formattedAnswers = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
            questionId, selectedOptionId
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
        const examDays = new Set();

        if (dashData?.upcomingExams) {
            dashData.upcomingExams.forEach(ex => {
                const d = new Date(ex.scheduledDate);
                if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
                    examDays.add(d.getDate());
                }
            });
        }

        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push({ empty: true });
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push({
                day: d,
                isToday: d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear(),
                hasExam: examDays.has(d)
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

        return (
            <div className="sd-wrapper" style={{ minHeight: '100vh', background: 'var(--sd-bg)', color: 'var(--sd-text)' }}>
                {/* Fullscreen doesn't render sidebar well often, but we keep it relative */}
                <div className="sd-main" style={{ marginLeft: 0, width: '100%', padding: '40px' }}>
                    <div className="sd-exam-view">
                        <div className="sd-exam-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>{activeExam.title}</h2>
                            <div className={`sd-timer ${timeLeft <= 60 ? 'danger' : ''}`} style={{
                                background: timeLeft <= 60 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                                color: timeLeft <= 60 ? '#ef4444' : '#8b5cf6',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                fontSize: '1.2rem',
                                border: `1px solid ${timeLeft <= 60 ? '#ef4444' : '#8b5cf6'}`
                            }}>
                                ⏱ {formatTime(timeLeft)}
                            </div>
                        </div>
                        {activeExam.questions.map((q, idx) => (
                            <div key={q.id} className="sd-question-card">
                                <div className="sd-question-text">
                                    <span className="sd-question-num">{idx + 1}.</span>
                                    <span>{q.questionText} <span className="sd-question-marks">({q.marks} marks)</span></span>
                                </div>
                                <div className="sd-options-list">
                                    {q.options.map(opt => (
                                        <div
                                            key={opt.id}
                                            className={`sd-option-item ${answers[q.id] === opt.id ? 'selected' : ''}`}
                                            onClick={() => handleOptionSelect(q.id, opt.id)}
                                        >
                                            <div className="sd-option-radio"></div>
                                            {opt.optionText}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <button className="sd-submit-exam-btn" onClick={() => handleSubmitExam(false)}>
                            Submit Exam
                        </button>
                    </div>
                </div>
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
                                <p>{studentInfo.grade} • Semester {studentInfo.semester || '—'} {studentInfo.universityRollNumber ? `• Uni Roll: ${studentInfo.universityRollNumber}` : ''}</p>
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

                        {/* Subject Analysis + Calendar */}
                        <div className="sd-content-grid">
                            {/* Subject Analysis */}
                            <div className="sd-section">
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

                            {/* Calendar + Upcoming */}
                            <div className="sd-section">
                                <div className="sd-section-header">
                                    <div className="sd-section-title">
                                        <span className="icon">📅</span> Exam Schedule
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
                                            <div key={i} className={`sd-calendar-cell ${cell.empty ? 'empty' : ''} ${cell.isToday ? 'today' : ''} ${cell.hasExam ? 'has-exam' : ''}`}>
                                                {cell.day || ''}
                                            </div>
                                        ))}
                                    </div>

                                    {upcomingExams.length > 0 ? (
                                        <div className="sd-upcoming-list">
                                            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '4px 0 8px' }}>Upcoming Exams</h4>
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
                        </div>

                        {/* Recent Results */}
                        <div className="sd-section">
                            <div className="sd-section-header">
                                <div className="sd-section-title">
                                    <span className="icon">📋</span> Recent Results
                                </div>
                            </div>
                            {recentResults.length > 0 ? (
                                <div className="sd-results-grid">
                                    {recentResults.map(r => (
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
                                    <p>No results released yet.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'exams' && (
                    <>
                        <div className="sd-header">
                            <div className="sd-header-left">
                                <h1>Available Exams</h1>
                                <p>Take exams assigned to your grade</p>
                            </div>
                            <div className="sd-header-right">
                                <button className="sd-logout-btn" onClick={logout}>Logout</button>
                            </div>
                        </div>
                        {exams.length > 0 ? (
                            <div className="sd-exam-list-grid">
                                {exams.map(exam => (
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
                                <p>No exams available for your grade.</p>
                            </div>
                        )}
                    </>
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
                <div className="sd-modal-overlay" onClick={() => setViewingResult(null)}>
                    <div className="sd-modal lg" onClick={e => e.stopPropagation()}>
                        <div className="sd-modal-title">
                            <span>📊 Exam Result</span>
                            <button className="sd-modal-close" onClick={() => setViewingResult(null)}>✕</button>
                        </div>
                        <div className="sd-result-modal-score">
                            Total Score: {viewingResult.totalScore}
                        </div>
                        {viewingResult.answers?.map((ans, idx) => (
                            <div key={ans.id} className="sd-result-answer">
                                <div className="sd-result-answer-q">
                                    Q{idx + 1}: {ans.question.questionText} ({ans.question.marks} marks)
                                </div>
                                <div className={`sd-result-answer-a ${ans.selectedOption?.isCorrect ? 'correct' : 'incorrect'}`}>
                                    Your Answer: {ans.selectedOption?.optionText || 'Unanswered'}
                                    {ans.selectedOption?.isCorrect ? ' ✓ Correct' : ' ✗ Incorrect'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Sidebar Component
const Sidebar = ({ activeTab, setActiveTab, logout }) => (
    <div className="sd-sidebar">
        <div className="sd-sidebar-logo"><span>SS</span> SmartScore</div>
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
