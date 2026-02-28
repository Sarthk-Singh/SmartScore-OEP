import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './AdminDashboard.css';

const UserManagement = () => {
    const [activeTab, setActiveTab] = useState('teachers');
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const [teacherRes, studentRes] = await Promise.all([
                api.get('/admin/teachers'),
                api.get('/admin/students')
            ]);
            setTeachers(teacherRes.data);
            setStudents(studentRes.data);
        } catch (err) {
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await api.delete(`/admin/user/${deleteTarget.id}`);
            toast.success(res.data.message);
            setDeleteTarget(null);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete user');
        } finally {
            setDeleting(false);
        }
    };

    const handleRemoveGrade = async (teacherId, gradeId, teacherName, gradeName) => {
        if (!window.confirm(`Remove "${gradeName}" from ${teacherName}?`)) return;
        try {
            await api.delete(`/admin/teacher/${teacherId}/grade/${gradeId}`);
            toast.success(`Removed ${gradeName} from ${teacherName}`);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to remove grade');
        }
    };

    const filteredTeachers = useMemo(() => {
        if (!search.trim()) return teachers;
        const q = search.toLowerCase();
        return teachers.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.email.toLowerCase().includes(q)
        );
    }, [teachers, search]);

    const filteredStudents = useMemo(() => {
        if (!search.trim()) return students;
        const q = search.toLowerCase();
        return students.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            (s.studentId && s.studentId.toLowerCase().includes(q)) ||
            (s.universityRollNumber && s.universityRollNumber.toLowerCase().includes(q)) ||
            (s.grade?.name && s.grade.name.toLowerCase().includes(q))
        );
    }, [students, search]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 60, color: '#8b8fa3' }}>
                <div className="ao-spinner" style={{ margin: '0 auto 16px' }}></div>
                <p>Loading users...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Tab bar + search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        className={activeTab === 'teachers' ? 'ad-primary-btn' : 'ad-secondary-btn'}
                        onClick={() => { setActiveTab('teachers'); setSearch(''); }}
                    >
                        👨‍🏫 Teachers ({teachers.length})
                    </button>
                    <button
                        className={activeTab === 'students' ? 'ad-primary-btn' : 'ad-secondary-btn'}
                        onClick={() => { setActiveTab('students'); setSearch(''); }}
                    >
                        🎓 Students ({students.length})
                    </button>
                </div>
                <div style={{ position: 'relative', minWidth: 260 }}>
                    <input
                        className="ad-input"
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: 36 }}
                    />
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
                </div>
            </div>

            {/* Teachers Table */}
            {activeTab === 'teachers' && (
                <div className="ad-section">
                    <div className="ad-section-header">
                        <div className="ad-section-title"><span className="icon">👨‍🏫</span> All Teachers</div>
                        <span style={{ fontSize: 13, color: '#8b8fa3' }}>
                            {filteredTeachers.length} of {teachers.length} shown
                        </span>
                    </div>
                    {filteredTeachers.length > 0 ? (
                        <table className="ad-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Assigned Grades</th>
                                    <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTeachers.map(t => (
                                    <tr key={t.id}>
                                        <td style={{ fontWeight: 500, color: '#fff' }}>{t.name}</td>
                                        <td>{t.email}</td>
                                        <td>
                                            {t.teachingGrades && t.teachingGrades.length > 0
                                                ? t.teachingGrades.map(g => (
                                                    <span key={g.id} className="ad-badge-pill" style={{ marginRight: 4 }}>
                                                        {g.name}
                                                        <button className="ad-badge-remove" onClick={() => handleRemoveGrade(t.id, g.id, t.name, g.name)}>✕</button>
                                                    </span>
                                                ))
                                                : <span className="ad-no-data">None</span>
                                            }
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                className="ad-danger-btn ad-btn-sm"
                                                onClick={() => setDeleteTarget({ ...t, role: 'TEACHER' })}
                                            >🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 32, color: '#8b8fa3' }}>
                            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>👨‍🏫</div>
                            <p>{search ? 'No teachers match your search' : 'No teachers found'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Students Table */}
            {activeTab === 'students' && (
                <div className="ad-section">
                    <div className="ad-section-header">
                        <div className="ad-section-title"><span className="icon">🎓</span> All Students</div>
                        <span style={{ fontSize: 13, color: '#8b8fa3' }}>
                            {filteredStudents.length} of {students.length} shown
                        </span>
                    </div>
                    {filteredStudents.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="ad-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Student ID</th>
                                        <th>Uni Roll No</th>
                                        <th>Grade</th>
                                        <th>Sem</th>
                                        <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map(s => (
                                        <tr key={s.id}>
                                            <td style={{ fontWeight: 500, color: '#fff' }}>{s.name}</td>
                                            <td>{s.email}</td>
                                            <td>{s.studentId || '—'}</td>
                                            <td>{s.universityRollNumber || '—'}</td>
                                            <td>
                                                {s.grade
                                                    ? <span className="ad-badge-pill">{s.grade.name}</span>
                                                    : <span className="ad-no-data">None</span>
                                                }
                                            </td>
                                            <td>{s.semester || '—'}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    className="ad-danger-btn ad-btn-sm"
                                                    onClick={() => setDeleteTarget({ ...s, role: 'STUDENT' })}
                                                >🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 32, color: '#8b8fa3' }}>
                            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>🎓</div>
                            <p>{search ? 'No students match your search' : 'No students found'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="ad-modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
                    <div className="ad-modal" onClick={e => e.stopPropagation()}>
                        <div className="ad-modal-title">
                            <span>⚠️ Delete {deleteTarget.role === 'TEACHER' ? 'Teacher' : 'Student'}</span>
                            <button className="ad-modal-close" onClick={() => !deleting && setDeleteTarget(null)}>✕</button>
                        </div>

                        <div className="ad-alert danger">
                            <span>
                                This action is <strong>irreversible</strong>. All data associated with this user
                                (including exam submissions and answers) will be permanently deleted.
                            </span>
                        </div>

                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 10,
                            padding: 16,
                            marginBottom: 20
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px 12px', fontSize: 14 }}>
                                <span style={{ color: '#8b8fa3' }}>Name</span>
                                <span style={{ color: '#fff', fontWeight: 500 }}>{deleteTarget.name}</span>
                                <span style={{ color: '#8b8fa3' }}>Email</span>
                                <span style={{ color: '#e4e6ef' }}>{deleteTarget.email}</span>
                                <span style={{ color: '#8b8fa3' }}>Role</span>
                                <span style={{ color: '#e4e6ef' }}>{deleteTarget.role}</span>
                                {deleteTarget.role === 'STUDENT' && deleteTarget.grade && (
                                    <>
                                        <span style={{ color: '#8b8fa3' }}>Grade</span>
                                        <span style={{ color: '#e4e6ef' }}>{deleteTarget.grade.name}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                                className="ad-secondary-btn"
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                            >Cancel</button>
                            <button
                                className="ad-danger-btn"
                                onClick={handleDelete}
                                disabled={deleting}
                                style={{ opacity: deleting ? 0.5 : 1 }}
                            >{deleting ? 'Deleting...' : '🗑️ Delete Permanently'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
