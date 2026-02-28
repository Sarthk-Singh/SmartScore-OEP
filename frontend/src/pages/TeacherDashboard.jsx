import React, { useState, useEffect } from 'react';
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

    // Exam Form State
    const [title, setTitle] = useState('');
    const [selectedGradeId, setSelectedGradeId] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [durationMinutes, setDurationMinutes] = useState('');
    const [password, setPassword] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [myGrades, setMyGrades] = useState([]);

    const availableCourses = myGrades.find(g => g.id === selectedGradeId)?.courses || [];

    // Question Form State
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

    // Sidebar
    const [activeTab, setActiveTab] = useState('exams');

    const fetchExams = async () => {
        try { const r = await api.get('/exams'); setExams(r.data); }
        catch (err) { console.error(err); toast.error('Failed to fetch exams'); }
    };

    const fetchMyGrades = async () => {
        try { const r = await api.get('/teacher/my-grades'); setMyGrades(r.data); }
        catch (err) { console.error(err); toast.error('Failed to fetch grades'); }
    };

    useEffect(() => { fetchExams(); fetchMyGrades(); }, []);

    const handleCreateExam = async (e) => {
        e.preventDefault();
        try {
            await api.post('/teacher/create-exam', {
                title, gradeId: selectedGradeId, courseId: selectedCourseId,
                scheduledDate, durationMinutes: parseInt(durationMinutes), password
            });
            toast.success('Exam created!');
            setShowCreateExamModal(false); fetchExams();
            setTitle(''); setSelectedGradeId(''); setSelectedCourseId('');
            setScheduledDate(''); setDurationMinutes(''); setPassword('');
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to create exam'); }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        const opts = [
            { optionText: option1, isCorrect: correctOptionIndex === 0 },
            { optionText: option2, isCorrect: correctOptionIndex === 1 },
            { optionText: option3, isCorrect: correctOptionIndex === 2 },
            { optionText: option4, isCorrect: correctOptionIndex === 3 },
        ];
        try {
            await api.post('/teacher/add-question', {
                examId: selectedExamId, type: 'MCQ', questionText, marks: parseInt(marks), options: opts
            });
            toast.success('Question added!');
            setQuestionText(''); setOption1(''); setOption2(''); setOption3(''); setOption4('');
            setCorrectOptionIndex(0);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to add question'); }
    };

    const openAddQuestion = (examId) => { setSelectedExamId(examId); setShowAddQuestionModal(true); };

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
                <div className="ad-sidebar-logo"><span>SS</span> SmartScore</div>
                <div className={`ad-sidebar-item ${activeTab === 'exams' ? 'active' : ''}`}
                    onClick={() => setActiveTab('exams')}><span className="nav-icon">📝</span> Exams</div>
                <div className="ad-sidebar-bottom">
                    <div className="ad-sidebar-item" onClick={logout}><span className="nav-icon">🚪</span> Logout</div>
                </div>
            </div>

            <div className="ad-main">
                {/* Header */}
                <div className="ad-header">
                    <div className="ad-header-left">
                        <h1>Teacher Dashboard 📚</h1>
                        <p>Manage your exams, questions, and results</p>
                    </div>
                    <div className="ad-header-right">
                        <span className="ad-badge">👨‍🏫 {user?.name}</span>
                        <button className="ad-primary-btn" onClick={() => setShowCreateExamModal(true)}>+ Create Exam</button>
                        <button className="ad-logout-btn" onClick={logout}>Logout</button>
                    </div>
                </div>

                {/* Exam Cards */}
                {exams.length > 0 ? (
                    <div className="ad-cards-grid">
                        {exams.map(exam => (
                            <div key={exam.id} className="ad-exam-card">
                                <div className="ad-exam-card-title">{exam.title}</div>
                                <div className="ad-exam-card-sub">{exam.grade?.name} — {exam.course?.name}</div>
                                <div className="ad-exam-card-info">
                                    📅 {new Date(exam.scheduledDate).toLocaleString()}<br />
                                    ⏱ {exam.durationMinutes} mins &nbsp;•&nbsp; 📋 {exam._count?.questions || 0} questions
                                </div>
                                <div className="ad-btn-row" style={{ marginTop: 0 }}>
                                    <button className="ad-info-btn ad-btn-sm" onClick={() => openAddQuestion(exam.id)}>Add Q's</button>
                                    <button className="ad-success-btn ad-btn-sm" onClick={() => openBulkUpload(exam.id)}>📤 Bulk</button>
                                    <button className="ad-secondary-btn ad-btn-sm" onClick={() => openManageExam(exam.id)}>Manage</button>
                                    <button className="ad-warning-btn ad-btn-sm" onClick={() => openResults(exam)}>Results</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="ad-section">
                        <div className="ad-empty">
                            <div className="ad-empty-icon">📝</div>
                            <p>No exams yet. Click "Create Exam" to get started!</p>
                        </div>
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
                            <div className="ad-input-group" style={{ marginBottom: 12 }}>
                                <label>Question Text</label>
                                <textarea className="ad-textarea" rows={3} required value={questionText} onChange={e => setQuestionText(e.target.value)} />
                            </div>
                            <div className="ad-input-group" style={{ marginBottom: 16 }}>
                                <label>Marks</label>
                                <input className="ad-input" type="number" required value={marks} onChange={e => setMarks(e.target.value)} />
                            </div>

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
        </div>
    );
};

export default TeacherDashboard;
