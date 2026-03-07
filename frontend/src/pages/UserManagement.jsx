import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './AdminDashboard.css';

// Small ⋯ action menu component
const ActionMenu = ({ user, onReset, onSetPassword, onDelete }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    color: '#e4e6ef',
                    cursor: 'pointer',
                    fontSize: 16,
                    width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                }}
                title="Actions"
            >⋯</button>
            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: 36,
                    background: '#1e2133',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    zIndex: 200,
                    minWidth: 180,
                    overflow: 'hidden',
                }}>
                    <div
                        onClick={() => { setOpen(false); onReset(user); }}
                        style={{ padding: '10px 16px', fontSize: 13, color: '#facc15', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(234,179,8,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >🔄 Reset Password</div>
                    <div
                        onClick={() => { setOpen(false); onSetPassword(user); }}
                        style={{ padding: '10px 16px', fontSize: 13, color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >🔑 Custom Password</div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
                    <div
                        onClick={() => { setOpen(false); onDelete(user); }}
                        style={{ padding: '10px 16px', fontSize: 13, color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >🗑️ Delete User</div>
                </div>
            )}
        </div>
    );
};

const UserManagement = () => {
    const [activeTab, setActiveTab] = useState('teachers');
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Password management state
    const [resetTarget, setResetTarget] = useState(null);       // { id, name, role }
    const [customPwdTarget, setCustomPwdTarget] = useState(null); // { id, name }
    const [customPwd, setCustomPwd] = useState('');
    const [customPwdConfirm, setCustomPwdConfirm] = useState('');

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

    const handleResetPassword = async () => {
        if (!resetTarget) return;
        try {
            const r = await api.patch(`/admin/users/${resetTarget.id}/reset-password`);
            toast.success(r.data.message || 'Password reset successfully. User has been notified via email.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setResetTarget(null);
        }
    };

    const handleSetCustomPassword = async (e) => {
        e.preventDefault();
        if (customPwd !== customPwdConfirm) { toast.error('Passwords do not match'); return; }
        if (customPwd.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        try {
            const r = await api.patch(`/admin/users/${customPwdTarget.id}/set-password`, { newPassword: customPwd });
            toast.success(r.data.message || 'Password updated successfully. User has been notified via email.');
            setCustomPwdTarget(null); setCustomPwd(''); setCustomPwdConfirm('');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to set password');
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
            (s.section && s.section.toLowerCase().includes(q)) ||
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
                                    <th style={{ width: 60, textAlign: 'center' }}>Actions</th>
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
                                            <ActionMenu
                                                user={{ ...t, role: 'TEACHER' }}
                                                onReset={u => setResetTarget({ id: u.id, name: u.name, role: u.role })}
                                                onSetPassword={u => { setCustomPwdTarget({ id: u.id, name: u.name }); setCustomPwd(''); setCustomPwdConfirm(''); }}
                                                onDelete={u => setDeleteTarget(u)}
                                            />
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
                                        <th>Student ID</th>
                                        <th>Uni Roll No</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Grade</th>
                                        <th>Sem</th>
                                        <th>Section</th>
                                        <th style={{ width: 60, textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map(s => (
                                        <tr key={s.id}>
                                            <td>{s.studentId || '—'}</td>
                                            <td>{s.universityRollNumber || '—'}</td>
                                            <td style={{ fontWeight: 500, color: '#fff' }}>{s.name}</td>
                                            <td>{s.email}</td>
                                            <td>
                                                {s.grade
                                                    ? <span className="ad-badge-pill">{s.grade.name}</span>
                                                    : <span className="ad-no-data">None</span>
                                                }
                                            </td>
                                            <td>{s.semester || '—'}</td>
                                            <td>{s.section || '—'}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <ActionMenu
                                                    user={{ ...s, role: 'STUDENT' }}
                                                    onReset={u => setResetTarget({ id: u.id, name: u.name, role: u.role })}
                                                    onSetPassword={u => { setCustomPwdTarget({ id: u.id, name: u.name }); setCustomPwd(''); setCustomPwdConfirm(''); }}
                                                    onDelete={u => setDeleteTarget(u)}
                                                />
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

            {/* Reset Password Confirmation */}
            {resetTarget && (
                <div className="ad-modal-overlay" onClick={() => setResetTarget(null)}>
                    <div className="ad-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="ad-modal-title">
                            <span>🔄 Reset Password</span>
                            <button className="ad-modal-close" onClick={() => setResetTarget(null)}>✕</button>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--ad-text)', marginBottom: 8 }}>
                            Reset password for <strong>{resetTarget.name}</strong>?
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--ad-text-muted)', marginBottom: 24 }}>
                            Their password will be reset to the default:{' '}
                            <strong style={{ color: '#818cf8' }}>
                                {resetTarget.role === 'TEACHER' ? 'Welcome@123' : 'Portal@123'}
                            </strong>.{' '}
                            They will be notified by email and prompted to change it on next login.
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="ad-warning-btn" style={{ flex: 1 }} onClick={handleResetPassword}>Confirm Reset</button>
                            <button className="ad-secondary-btn" style={{ flex: 1 }} onClick={() => setResetTarget(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Set Custom Password Modal */}
            {customPwdTarget && (
                <div className="ad-modal-overlay" onClick={() => setCustomPwdTarget(null)}>
                    <div className="ad-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="ad-modal-title">
                            <span>🔑 Set Password</span>
                            <button className="ad-modal-close" onClick={() => setCustomPwdTarget(null)}>✕</button>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--ad-text-muted)', marginBottom: 20 }}>
                            Setting password for <strong style={{ color: '#fff' }}>{customPwdTarget.name}</strong>
                        </p>
                        <form onSubmit={handleSetCustomPassword}>
                            <div className="ad-input-group" style={{ marginBottom: 14 }}>
                                <label>New Password</label>
                                <input
                                    className="ad-input"
                                    type="password"
                                    required
                                    minLength={6}
                                    placeholder="Min. 6 characters"
                                    value={customPwd}
                                    onChange={e => setCustomPwd(e.target.value)}
                                />
                            </div>
                            <div className="ad-input-group" style={{ marginBottom: 24 }}>
                                <label>Confirm Password</label>
                                <input
                                    className="ad-input"
                                    type="password"
                                    required
                                    placeholder="Re-enter password"
                                    value={customPwdConfirm}
                                    onChange={e => setCustomPwdConfirm(e.target.value)}
                                    style={customPwdConfirm && customPwd !== customPwdConfirm ? { borderColor: 'rgba(239,68,68,0.6)' } : {}}
                                />
                                {customPwdConfirm && customPwd !== customPwdConfirm && (
                                    <span style={{ fontSize: 12, color: '#f87171', marginTop: 2 }}>Passwords do not match</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="submit" className="ad-primary-btn" style={{ flex: 1 }}>Set Password</button>
                                <button type="button" className="ad-secondary-btn" style={{ flex: 1 }} onClick={() => setCustomPwdTarget(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
