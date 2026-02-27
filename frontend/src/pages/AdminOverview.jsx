import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './AdminOverview.css';

const AdminOverview = ({ isVisible = true }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);
    const [expandedGradeId, setExpandedGradeId] = useState(null);

    // Teacher management state
    const [allTeachers, setAllTeachers] = useState([]);
    const [teacherSearch, setTeacherSearch] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('');

    useEffect(() => {
        fetchOverview();
        fetchAllTeachers();
    }, []);

    // Re-fetch when tab becomes visible (catches new teachers created on Dashboard)
    useEffect(() => {
        if (isVisible && !initialLoad) {
            fetchOverview();
            fetchAllTeachers();
        }
        if (initialLoad) setInitialLoad(false);
    }, [isVisible]);

    const fetchOverview = async () => {
        try {
            const res = await api.get('/admin/overview');
            setData(res.data);
        } catch (err) {
            toast.error('Failed to load overview');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllTeachers = async () => {
        try {
            const res = await api.get('/admin/teachers');
            setAllTeachers(res.data);
        } catch (err) {
            // silent
        }
    };

    const toggleGrade = (gradeId) => {
        setExpandedGradeId(prev => prev === gradeId ? null : gradeId);
        setTeacherSearch('');
        setSelectedTeacherId('');
    };

    const handleRemoveTeacher = async (teacherId, gradeId, tName, gName) => {
        if (!window.confirm(`Remove "${tName}" from "${gName}"?`)) return;
        try {
            await api.delete(`/admin/teacher/${teacherId}/grade/${gradeId}`);
            toast.success(`Removed ${tName} from ${gName}`);
            fetchOverview();
            fetchAllTeachers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to remove');
        }
    };

    const handleAddTeacher = async (gradeId) => {
        if (!selectedTeacherId) { toast.error('Select a teacher first'); return; }
        try {
            await api.post('/admin/assign-teacher-grade', { teacherId: selectedTeacherId, gradeId });
            toast.success('Teacher assigned!');
            setSelectedTeacherId('');
            setTeacherSearch('');
            fetchOverview();
            fetchAllTeachers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to assign');
        }
    };

    // Filter teachers not already assigned to this grade
    const getAvailableTeachers = (grade) => {
        const assignedIds = new Set(grade.teachers.map(t => t.id));
        return allTeachers.filter(t => !assignedIds.has(t.id));
    };

    const filteredTeachers = useMemo(() => {
        if (!expandedGradeId || !data) return [];
        const grade = data.grades.find(g => g.id === expandedGradeId);
        if (!grade) return [];
        const available = getAvailableTeachers(grade);
        if (!teacherSearch.trim()) return available;
        const q = teacherSearch.toLowerCase();
        return available.filter(t =>
            t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
        );
    }, [expandedGradeId, data, allTeachers, teacherSearch]);

    if (loading) {
        return (
            <div className="ao-loading">
                <div className="ao-spinner"></div>
                <p>Loading overview...</p>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="ao-container">


            {/* Stat Cards */}
            <div className="ao-stats-row">
                <div className="ao-stat-card">
                    <div className="ao-stat-icon teachers">👨‍🏫</div>
                    <div className="ao-stat-info">
                        <span className="ao-stat-count">{data.totalTeachers}</span>
                        <span className="ao-stat-label">Total Teachers</span>
                    </div>
                </div>
                <div className="ao-stat-card">
                    <div className="ao-stat-icon students">🎓</div>
                    <div className="ao-stat-info">
                        <span className="ao-stat-count">{data.totalStudents}</span>
                        <span className="ao-stat-label">Total Students</span>
                    </div>
                </div>
                <div className="ao-stat-card">
                    <div className="ao-stat-icon grades">📚</div>
                    <div className="ao-stat-info">
                        <span className="ao-stat-count">{data.totalGrades}</span>
                        <span className="ao-stat-label">Total Grades</span>
                    </div>
                </div>
            </div>

            {/* Grade Cards */}
            <div className="ao-grades-header">
                <h2>Grades</h2>
                <span className="ao-grades-count">{data.grades.length} grade{data.grades.length !== 1 ? 's' : ''}</span>
            </div>

            {data.grades.length === 0 ? (
                <div className="ao-empty">
                    <div className="ao-empty-icon">🏛️</div>
                    <p>No grades created yet. Create grades from the Dashboard.</p>
                </div>
            ) : (
                <div className="ao-grades-grid">
                    {data.grades.map(grade => {
                        const isExpanded = expandedGradeId === grade.id;
                        return (
                            <div key={grade.id} className={`ao-grade-card ${isExpanded ? 'expanded' : ''}`}>
                                <div className="ao-grade-card-header" onClick={() => toggleGrade(grade.id)}>
                                    <div className="ao-grade-name">
                                        <span className="ao-grade-icon">📚</span>
                                        {grade.name}
                                    </div>
                                    <span className={`ao-expand-arrow ${isExpanded ? 'open' : ''}`}>▾</span>
                                </div>

                                {isExpanded && (
                                    <div className="ao-grade-details">
                                        {/* Stat chips */}
                                        <div className="ao-chip-row">
                                            <span className="ao-chip blue">🎓 {grade.studentCount} Student{grade.studentCount !== 1 ? 's' : ''}</span>
                                            <span className="ao-chip purple">👨‍🏫 {grade.teacherCount} Teacher{grade.teacherCount !== 1 ? 's' : ''}</span>
                                            <span className="ao-chip green">📖 {grade.courseCount} Course{grade.courseCount !== 1 ? 's' : ''}</span>
                                            <span className="ao-chip amber">📝 {grade.examCount} Exam{grade.examCount !== 1 ? 's' : ''}</span>
                                        </div>

                                        {/* Courses list */}
                                        {grade.courses.length > 0 && (
                                            <div className="ao-detail-section">
                                                <div className="ao-detail-label">Courses</div>
                                                <div className="ao-course-pills">
                                                    {grade.courses.map(c => (
                                                        <span key={c.id} className="ao-course-pill">{c.name}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Assigned Teachers */}
                                        <div className="ao-detail-section">
                                            <div className="ao-detail-label">Assigned Teachers</div>
                                            {grade.teachers.length > 0 ? (
                                                <div className="ao-teacher-list">
                                                    {grade.teachers.map(t => (
                                                        <div key={t.id} className="ao-teacher-item">
                                                            <div className="ao-teacher-avatar">{t.name.charAt(0).toUpperCase()}</div>
                                                            <div className="ao-teacher-info">
                                                                <span className="ao-teacher-name">{t.name}</span>
                                                                <span className="ao-teacher-email">{t.email}</span>
                                                            </div>
                                                            <button
                                                                className="ao-remove-btn"
                                                                onClick={(e) => { e.stopPropagation(); handleRemoveTeacher(t.id, grade.id, t.name, grade.name); }}
                                                            >✕</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="ao-no-data">No teachers assigned</p>
                                            )}
                                        </div>

                                        {/* Add Teacher */}
                                        <div className="ao-detail-section">
                                            <div className="ao-detail-label">Add Teacher</div>
                                            <div className="ao-add-teacher-row">
                                                <div className="ao-search-select">
                                                    <input
                                                        className="ao-search-input"
                                                        type="text"
                                                        placeholder="Search teachers..."
                                                        value={teacherSearch}
                                                        onChange={e => { setTeacherSearch(e.target.value); setSelectedTeacherId(''); }}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                    {(teacherSearch || !selectedTeacherId) && filteredTeachers.length > 0 && teacherSearch && (
                                                        <div className="ao-search-dropdown">
                                                            {filteredTeachers.map(t => (
                                                                <div
                                                                    key={t.id}
                                                                    className="ao-search-option"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedTeacherId(t.id);
                                                                        setTeacherSearch(t.name);
                                                                    }}
                                                                >
                                                                    <span>{t.name}</span>
                                                                    <span className="ao-search-email">{t.email}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {teacherSearch && filteredTeachers.length === 0 && (
                                                        <div className="ao-search-dropdown">
                                                            <div className="ao-search-empty">No matching teachers</div>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    className="ao-add-btn"
                                                    onClick={(e) => { e.stopPropagation(); handleAddTeacher(grade.id); }}
                                                    disabled={!selectedTeacherId}
                                                >Add</button>
                                            </div>
                                        </div>
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

export default AdminOverview;
