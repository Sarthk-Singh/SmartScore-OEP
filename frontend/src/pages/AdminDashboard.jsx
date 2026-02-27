import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { user, logout } = useAuth();

    // Teacher State
    const [teacherName, setTeacherName] = useState('');
    const [teacherEmail, setTeacherEmail] = useState('');
    const [teacherPassword, setTeacherPassword] = useState('');

    // Student State
    const [studentName, setStudentName] = useState('');
    const [studentEmail, setStudentEmail] = useState('');
    const [studentId, setStudentId] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [uniRollNumber, setUniRollNumber] = useState('');
    const [selectedGradeId, setSelectedGradeId] = useState('');
    const [semester, setSemester] = useState('');

    // Grade & Course State
    const [gradeName, setGradeName] = useState('');
    const [courseName, setCourseName] = useState('');
    const [courseGradeId, setCourseGradeId] = useState('');

    // Teacher Assignment State
    const [teachers, setTeachers] = useState([]);
    const [assignTeacherId, setAssignTeacherId] = useState('');
    const [assignGradeId, setAssignGradeId] = useState('');

    // Data Lists
    const [grades, setGrades] = useState([]);

    // Bulk Student Upload State
    const [showBulkStudentModal, setShowBulkStudentModal] = useState(false);
    const [bulkStudentFile, setBulkStudentFile] = useState(null);
    const [bulkStudentLoading, setBulkStudentLoading] = useState(false);
    const [bulkStudentResult, setBulkStudentResult] = useState(null);

    // Sidebar
    const [activeTab, setActiveTab] = useState('users');

    useEffect(() => {
        fetchGrades();
        fetchTeachers();
    }, []);

    const fetchGrades = async () => {
        try {
            const response = await api.get('/admin/grades');
            setGrades(response.data);
        } catch (err) {
            toast.error('Failed to fetch grades');
        }
    };

    const fetchTeachers = async () => {
        try {
            const response = await api.get('/admin/teachers');
            setTeachers(response.data);
        } catch (err) {
            toast.error('Failed to fetch teachers');
        }
    };

    const handleCreateTeacher = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/create-teacher', { name: teacherName, email: teacherEmail, password: teacherPassword });
            toast.success('Teacher created successfully!');
            setTeacherName(''); setTeacherEmail(''); setTeacherPassword('');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create teacher');
        }
    };

    const handleCreateStudent = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/create-student', {
                name: studentName, email: studentEmail, password: "portal@123",
                studentId, rollNumber, universityRollNumber: uniRollNumber,
                gradeId: selectedGradeId, semester: semester || null
            });
            toast.success('Student created! Default password: portal@123');
            setStudentName(''); setStudentEmail(''); setStudentId('');
            setRollNumber(''); setUniRollNumber(''); setSelectedGradeId(''); setSemester('');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create student');
        }
    };

    const handleCreateGrade = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/grades', { name: gradeName });
            toast.success('Grade created!');
            setGradeName('');
            fetchGrades();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create grade');
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/courses', { name: courseName, gradeId: courseGradeId });
            toast.success('Course created!');
            setCourseName(''); setCourseGradeId('');
            fetchGrades();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create course');
        }
    };

    const handleAssignTeacher = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/assign-teacher-grade', { teacherId: assignTeacherId, gradeId: assignGradeId });
            toast.success('Teacher assigned to grade!');
            setAssignTeacherId(''); setAssignGradeId('');
            fetchTeachers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to assign teacher');
        }
    };

    const handleDeleteGrade = async (gradeId, name) => {
        if (!window.confirm(`Delete grade "${name}"? This deletes all courses and exams (if no submissions).`)) return;
        try {
            await api.delete(`/admin/grades/${gradeId}`);
            toast.success(`Grade "${name}" deleted!`);
            fetchGrades(); fetchTeachers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete grade');
        }
    };

    const handleDeleteCourse = async (courseId, name) => {
        if (!window.confirm(`Delete course "${name}"? This deletes all exams (if no submissions).`)) return;
        try {
            await api.delete(`/admin/courses/${courseId}`);
            toast.success(`Course "${name}" deleted!`);
            fetchGrades();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete course');
        }
    };

    const handleRemoveTeacherGrade = async (teacherId, gradeId, tName, gName) => {
        if (!window.confirm(`Remove "${gName}" from "${tName}"?`)) return;
        try {
            await api.delete(`/admin/teacher/${teacherId}/grade/${gradeId}`);
            toast.success(`Removed "${gName}" from ${tName}`);
            fetchTeachers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to remove grade');
        }
    };

    const openBulkStudentUpload = () => {
        setBulkStudentFile(null);
        setBulkStudentResult(null);
        setShowBulkStudentModal(true);
    };

    const downloadStudentTemplate = () => {
        const template = 'name,email,studentId,rollNumber,universityRollNumber,grade,semester\n"John Doe",john@exam.com,STU001,101,UNI001,BTech,1\n';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'student_template.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const handleBulkStudentUpload = async () => {
        if (!bulkStudentFile) { toast.error('Please select a CSV file'); return; }
        setBulkStudentLoading(true);
        setBulkStudentResult(null);
        try {
            const formData = new FormData();
            formData.append('file', bulkStudentFile);
            const response = await api.post('/admin/bulk-upload-students', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBulkStudentResult({ success: true, message: response.data.message, count: response.data.count });
            toast.success(response.data.message);
        } catch (err) {
            const data = err.response?.data;
            if (data?.details) {
                setBulkStudentResult({ success: false, error: data.error, details: data.details, totalRows: data.totalRows, errorCount: data.errorCount });
            } else {
                setBulkStudentResult({ success: false, error: data?.error || 'Upload failed' });
            }
            toast.error(data?.error || 'Bulk upload failed');
        } finally {
            setBulkStudentLoading(false);
        }
    };

    return (
        <div className="ad-wrapper">
            {/* Sidebar */}
            <div className="ad-sidebar">
                <div className="ad-sidebar-logo">SS</div>
                <div className={`ad-sidebar-item ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')} title="Manage Users">👥</div>
                <div className={`ad-sidebar-item ${activeTab === 'structure' ? 'active' : ''}`}
                    onClick={() => setActiveTab('structure')} title="Manage Structure">🏗️</div>
                <div className="ad-sidebar-bottom">
                    <div className="ad-sidebar-item" onClick={logout} title="Logout">🚪</div>
                </div>
            </div>

            <div className="ad-main">
                {/* Header */}
                <div className="ad-header">
                    <div className="ad-header-left">
                        <h1>Admin Portal 🛡️</h1>
                        <p>Manage users, grades, and courses</p>
                    </div>
                    <div className="ad-header-right">
                        <span className="ad-badge">🔑 {user?.name}</span>
                        <button className="ad-logout-btn" onClick={logout}>Logout</button>
                    </div>
                </div>

                {/* ========== USERS TAB ========== */}
                {activeTab === 'users' && (
                    <>
                        <div className="ad-content-grid">
                            {/* Create Teacher */}
                            <div className="ad-section">
                                <div className="ad-section-header">
                                    <div className="ad-section-title"><span className="icon">👨‍🏫</span> Create Teacher</div>
                                </div>
                                <form onSubmit={handleCreateTeacher}>
                                    <div className="ad-input-group" style={{ marginBottom: 12 }}>
                                        <label>Name</label>
                                        <input className="ad-input" required value={teacherName} onChange={e => setTeacherName(e.target.value)} />
                                    </div>
                                    <div className="ad-input-group" style={{ marginBottom: 12 }}>
                                        <label>Email</label>
                                        <input className="ad-input" type="email" required value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)} />
                                    </div>
                                    <div className="ad-input-group" style={{ marginBottom: 16 }}>
                                        <label>Password</label>
                                        <input className="ad-input" type="password" required value={teacherPassword} onChange={e => setTeacherPassword(e.target.value)} />
                                    </div>
                                    <button type="submit" className="ad-primary-btn">Create Teacher</button>
                                </form>
                            </div>

                            {/* Assign Teacher + Assignments */}
                            <div>
                                <div className="ad-section">
                                    <div className="ad-section-header">
                                        <div className="ad-section-title"><span className="icon">🔗</span> Assign Teacher to Grade</div>
                                    </div>
                                    <form onSubmit={handleAssignTeacher}>
                                        <div className="ad-input-group" style={{ marginBottom: 12 }}>
                                            <label>Teacher</label>
                                            <select className="ad-select" required value={assignTeacherId} onChange={e => setAssignTeacherId(e.target.value)}>
                                                <option value="">Select Teacher</option>
                                                {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}
                                            </select>
                                        </div>
                                        <div className="ad-input-group" style={{ marginBottom: 16 }}>
                                            <label>Grade</label>
                                            <select className="ad-select" required value={assignGradeId} onChange={e => setAssignGradeId(e.target.value)}>
                                                <option value="">Select Grade</option>
                                                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                            </select>
                                        </div>
                                        <button type="submit" className="ad-info-btn">Assign Grade</button>
                                    </form>
                                </div>

                                <div className="ad-section">
                                    <div className="ad-section-header">
                                        <div className="ad-section-title"><span className="icon">📋</span> Teacher Assignments</div>
                                    </div>
                                    {teachers.map(t => (
                                        <div key={t.id} className="ad-assignment-item">
                                            <span className="ad-assignment-name">{t.name}</span>
                                            <div className="ad-assignment-badges">
                                                {t.teachingGrades && t.teachingGrades.length > 0
                                                    ? t.teachingGrades.map(g => (
                                                        <span key={g.id} className="ad-badge-pill">
                                                            {g.name}
                                                            <button className="ad-badge-remove" onClick={() => handleRemoveTeacherGrade(t.id, g.id, t.name, g.name)}>✕</button>
                                                        </span>
                                                    ))
                                                    : <span className="ad-no-data">No grades assigned</span>
                                                }
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Create Student */}
                        <div className="ad-section">
                            <div className="ad-section-header">
                                <div className="ad-section-title"><span className="icon">🎓</span> Create Student</div>
                            </div>
                            <form onSubmit={handleCreateStudent}>
                                <div className="ad-form-grid">
                                    <div className="ad-input-group">
                                        <label>Name</label>
                                        <input className="ad-input" required value={studentName} onChange={e => setStudentName(e.target.value)} />
                                    </div>
                                    <div className="ad-input-group">
                                        <label>Email</label>
                                        <input className="ad-input" type="email" required value={studentEmail} onChange={e => setStudentEmail(e.target.value)} />
                                    </div>
                                    <div className="ad-input-group">
                                        <label>Student ID</label>
                                        <input className="ad-input" required value={studentId} onChange={e => setStudentId(e.target.value)} />
                                    </div>
                                    <div className="ad-input-group">
                                        <label>Roll Number</label>
                                        <input className="ad-input" required value={rollNumber} onChange={e => setRollNumber(e.target.value)} />
                                    </div>
                                    <div className="ad-input-group full-width">
                                        <label>University Roll Number</label>
                                        <input className="ad-input" required value={uniRollNumber} onChange={e => setUniRollNumber(e.target.value)} />
                                    </div>
                                    <div className="ad-input-group">
                                        <label>Grade</label>
                                        <select className="ad-select" required value={selectedGradeId} onChange={e => setSelectedGradeId(e.target.value)}>
                                            <option value="">Select Grade</option>
                                            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="ad-input-group">
                                        <label>Semester</label>
                                        <input className="ad-input" type="number" min="1" placeholder="e.g. 1" value={semester} onChange={e => setSemester(e.target.value)} />
                                    </div>
                                </div>
                                <div className="ad-btn-row">
                                    <button type="submit" className="ad-success-btn">Create Student</button>
                                    <button type="button" className="ad-secondary-btn" onClick={openBulkStudentUpload}>📤 Bulk Upload Students</button>
                                </div>
                            </form>
                        </div>
                    </>
                )}

                {/* ========== STRUCTURE TAB ========== */}
                {activeTab === 'structure' && (
                    <>
                        <div className="ad-content-grid">
                            {/* Add Grade */}
                            <div className="ad-section">
                                <div className="ad-section-header">
                                    <div className="ad-section-title"><span className="icon">📚</span> Add Grade</div>
                                </div>
                                <form onSubmit={handleCreateGrade}>
                                    <div className="ad-input-group" style={{ marginBottom: 16 }}>
                                        <label>Grade Name (e.g., BTech, BSc)</label>
                                        <input className="ad-input" required value={gradeName} onChange={e => setGradeName(e.target.value)} />
                                    </div>
                                    <button type="submit" className="ad-primary-btn">Add Grade</button>
                                </form>
                            </div>

                            {/* Add Course */}
                            <div className="ad-section">
                                <div className="ad-section-header">
                                    <div className="ad-section-title"><span className="icon">📖</span> Add Course</div>
                                </div>
                                <form onSubmit={handleCreateCourse}>
                                    <div className="ad-input-group" style={{ marginBottom: 12 }}>
                                        <label>Course Name (e.g., Java, Python)</label>
                                        <input className="ad-input" required value={courseName} onChange={e => setCourseName(e.target.value)} />
                                    </div>
                                    <div className="ad-input-group" style={{ marginBottom: 16 }}>
                                        <label>Assign to Grade</label>
                                        <select className="ad-select" required value={courseGradeId} onChange={e => setCourseGradeId(e.target.value)}>
                                            <option value="">Select Grade</option>
                                            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                    </div>
                                    <button type="submit" className="ad-primary-btn">Add Course</button>
                                </form>
                            </div>
                        </div>

                        {/* Current Structure Table */}
                        <div className="ad-section">
                            <div className="ad-section-header">
                                <div className="ad-section-title"><span className="icon">🏛️</span> Current Structure</div>
                            </div>
                            {grades.length > 0 ? (
                                <table className="ad-table">
                                    <thead>
                                        <tr>
                                            <th>Grade</th>
                                            <th>Courses</th>
                                            <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {grades.map(g => (
                                            <tr key={g.id}>
                                                <td style={{ fontWeight: 500, color: '#fff' }}>{g.name}</td>
                                                <td>
                                                    {g.courses && g.courses.length > 0
                                                        ? g.courses.map(c => (
                                                            <span key={c.id} className="ad-badge-pill secondary">
                                                                {c.name}
                                                                <button className="ad-badge-remove" onClick={() => handleDeleteCourse(c.id, c.name)}>✕</button>
                                                            </span>
                                                        ))
                                                        : <span className="ad-no-data">No courses</span>
                                                    }
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button className="ad-danger-btn ad-btn-sm" onClick={() => handleDeleteGrade(g.id, g.name)}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="ad-empty">
                                    <div className="ad-empty-icon">🏛️</div>
                                    <p>No grades created yet.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Bulk Student Upload Modal */}
            {showBulkStudentModal && (
                <div className="ad-modal-overlay" onClick={() => setShowBulkStudentModal(false)}>
                    <div className="ad-modal lg" onClick={e => e.stopPropagation()}>
                        <div className="ad-modal-title">
                            <span>📤 Bulk Upload Students (CSV)</span>
                            <button className="ad-modal-close" onClick={() => setShowBulkStudentModal(false)}>✕</button>
                        </div>

                        <div className="ad-alert info">
                            <span>
                                <strong>CSV Format:</strong> <code>name,email,studentId,rollNumber,universityRollNumber,grade,semester</code><br />
                                Use the <strong>grade name</strong> (e.g., "BTech", "BSc") — not the ID.<br />
                                All students get <strong>default password: portal@123</strong>
                            </span>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <button className="ad-secondary-btn" onClick={downloadStudentTemplate}>⬇️ Download Template</button>
                        </div>

                        <div className="ad-input-group" style={{ marginBottom: 16 }}>
                            <label>Select CSV File</label>
                            <input type="file" accept=".csv" className="ad-file-input" onChange={e => setBulkStudentFile(e.target.files[0])} />
                        </div>

                        <button
                            className="ad-primary-btn"
                            onClick={handleBulkStudentUpload}
                            disabled={bulkStudentLoading || !bulkStudentFile}
                            style={{ opacity: (bulkStudentLoading || !bulkStudentFile) ? 0.5 : 1 }}
                        >
                            {bulkStudentLoading ? 'Uploading...' : 'Upload & Create Students'}
                        </button>

                        {bulkStudentResult && bulkStudentResult.success && (
                            <div className="ad-alert success" style={{ marginTop: 16 }}>✅ {bulkStudentResult.message}</div>
                        )}

                        {bulkStudentResult && !bulkStudentResult.success && (
                            <div className="ad-alert danger" style={{ marginTop: 16, flexDirection: 'column' }}>
                                <strong>❌ {bulkStudentResult.error}</strong>
                                {bulkStudentResult.details && (
                                    <>
                                        <p style={{ margin: '8px 0 4px' }}>Errors in {bulkStudentResult.errorCount} of {bulkStudentResult.totalRows} rows:</p>
                                        <div className="ad-error-list">
                                            {bulkStudentResult.details.map((d, idx) => (
                                                <div key={idx} className="ad-error-item">
                                                    <strong>Row {d.row}:</strong> {d.errors.join('; ')}
                                                </div>
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

export default AdminDashboard;
