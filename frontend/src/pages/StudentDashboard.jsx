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

    // Password modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [examPassword, setExamPassword] = useState('');

    // Active sidebar tab
    const [activeTab, setActiveTab] = useState('dashboard');

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

    const handleSubmitExam = async () => {
        const formattedAnswers = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
            questionId, selectedOptionId
        }));
        try {
            const response = await api.post('/student/submit-exam', {
                examId: activeExam.id,
                answers: formattedAnswers
            });
            setSubmissionResult(response.data);
            toast.success('Exam submitted! Results will be available once released by the teacher.');
            setActiveExam(null);
            fetchDashboard(); // refresh analytics
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit exam');
        }
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
        return (
            <div className="sd-wrapper">
                <Sidebar activeTab="exams" setActiveTab={setActiveTab} logout={logout} />
                <div className="sd-main">
                    <div className="sd-exam-view">
                        <div className="sd-exam-header">
                            <h2>{activeExam.title}</h2>
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
                        <button className="sd-submit-exam-btn" onClick={handleSubmitExam}>
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
                                <p>{studentInfo.grade} • Semester {studentInfo.semester || '—'} {studentInfo.rollNumber ? `• Roll No: ${studentInfo.rollNumber}` : ''}</p>
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
                                                        <div className="sd-upcoming-duration">{ex.durationMinutes} min</div>
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
                                                <div className={`sd-result-percent ${getColorClass(r.percentage)}`}>
                                                    {r.percentage}%
                                                </div>
                                            </div>
                                            <div className="sd-result-bottom">
                                                <span className="sd-result-score">
                                                    Score: <strong>{r.totalScore}</strong> / {r.totalMarks}
                                                </span>
                                                <button className="sd-view-btn" onClick={() => handleViewResult(r.examId)}>
                                                    View Details
                                                </button>
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
                                            ⏱ {exam.durationMinutes} minutes
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
        <div className="sd-sidebar-logo">SS</div>
        <div
            className={`sd-sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            title="Dashboard"
        >📊</div>
        <div
            className={`sd-sidebar-item ${activeTab === 'exams' ? 'active' : ''}`}
            onClick={() => setActiveTab('exams')}
            title="Exams"
        >📝</div>
        <div className="sd-sidebar-bottom">
            <div className="sd-sidebar-item" onClick={logout} title="Logout">🚪</div>
        </div>
    </div>
);

export default StudentDashboard;
