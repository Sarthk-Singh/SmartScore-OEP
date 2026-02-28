import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './AdminOverview.css';

const AdminExams = ({ isVisible = true }) => {
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedGradeId, setExpandedGradeId] = useState(null);

    useEffect(() => {
        if (isVisible) {
            fetchGradesWithExams();
        }
    }, [isVisible]);

    const fetchGradesWithExams = async () => {
        try {
            const res = await api.get('/admin/grades-exams');
            setGrades(res.data);
        } catch (err) {
            toast.error('Failed to load exams');
        } finally {
            setLoading(false);
        }
    };

    const toggleGrade = (gradeId) => {
        setExpandedGradeId(prev => prev === gradeId ? null : gradeId);
    };

    const handleDeleteExam = async (examId, examTitle) => {
        if (!window.confirm(`Are you sure you want to permanently delete the exam "${examTitle}"? This will also remove all questions and student submissions.`)) return;
        try {
            await api.delete(`/admin/exam/${examId}`);
            toast.success("Exam deleted successfully");
            fetchGradesWithExams();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete exam");
        }
    };

    if (loading) {
        return (
            <div className="ao-loading">
                <div className="ao-spinner"></div>
                <p>Loading exams...</p>
            </div>
        );
    }

    return (
        <div className="ao-container">
            <div className="ao-grades-header">
                <h2>📚 Exams by Grade</h2>
                <span className="ao-grades-count">{grades.length} grade{grades.length !== 1 ? 's' : ''}</span>
            </div>

            {grades.length === 0 ? (
                <div className="ao-empty">
                    <div className="ao-empty-icon">📝</div>
                    <p>No grades found. Create grades to see exams.</p>
                </div>
            ) : (
                <div className="ao-grades-grid">
                    {grades.map(grade => {
                        const isExpanded = expandedGradeId === grade.id;
                        const examCount = grade.exams.length;

                        return (
                            <div key={grade.id} className={`ao-grade-card ${isExpanded ? 'expanded' : ''}`}>
                                <div className="ao-grade-card-header" onClick={() => toggleGrade(grade.id)}>
                                    <div className="ao-grade-name">
                                        <span className="ao-grade-icon">📖</span>
                                        {grade.name}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span className={`ao-chip ${examCount > 0 ? 'blue' : 'gray'}`} style={{ padding: '2px 10px', fontSize: '11px' }}>
                                            {examCount} Exam{examCount !== 1 ? 's' : ''}
                                        </span>
                                        <span className={`ao-expand-arrow ${isExpanded ? 'open' : ''}`}>▾</span>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="ao-grade-details">
                                        {examCount > 0 ? (
                                            <div style={{ overflowX: 'auto', marginTop: 12 }}>
                                                <table className="ad-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Exam Title</th>
                                                            <th>Course</th>
                                                            <th>Creator</th>
                                                            <th>Questions</th>
                                                            <th>Date</th>
                                                            <th>Status</th>
                                                            <th style={{ textAlign: 'center' }}>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {grade.exams.map(exam => (
                                                            <tr key={exam.id}>
                                                                <td style={{ fontWeight: 500, color: '#fff' }}>{exam.title}</td>
                                                                <td>{exam.course.name}</td>
                                                                <td style={{ fontSize: '13px', color: '#818cf8' }}>{exam.creator?.name || 'Unknown'}</td>
                                                                <td>{exam._count.questions} Qs</td>
                                                                <td style={{ fontSize: '13px' }}>{new Date(exam.scheduledDate).toLocaleDateString()}</td>
                                                                <td>
                                                                    <span className={`ad-badge-pill ${exam.resultsReleased ? 'green' : 'amber'}`} style={{ fontSize: '10px' }}>
                                                                        {exam.resultsReleased ? 'Results Released' : 'Pending'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <button
                                                                        className="ad-danger-btn ad-btn-sm"
                                                                        onClick={() => handleDeleteExam(exam.id, exam.title)}
                                                                        title="Delete Exam"
                                                                    >🗑️</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="ao-no-data" style={{ padding: '20px 0', textAlign: 'center' }}>No exams scheduled for this grade yet.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminExams;
