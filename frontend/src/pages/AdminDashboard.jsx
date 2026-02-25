import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Container, Row, Col, Card, Form, Button, Navbar, Nav, Tab, Tabs, Table, Badge, CloseButton, Modal, Alert, ListGroup } from 'react-bootstrap';
import api from '../api/axios';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
    const { user, logout } = useAuth();

    // Teacher State
    const [teacherName, setTeacherName] = useState('');
    const [teacherEmail, setTeacherEmail] = useState('');
    const [teacherPassword, setTeacherPassword] = useState('');

    // Student State
    const [studentName, setStudentName] = useState('');
    const [studentEmail, setStudentEmail] = useState('');
    const [studentPassword, setStudentPassword] = useState('');
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
            await api.post('/admin/create-teacher', {
                name: teacherName,
                email: teacherEmail,
                password: teacherPassword,
            });
            toast.success('Teacher created successfully!');
            setTeacherName('');
            setTeacherEmail('');
            setTeacherPassword('');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create teacher');
        }
    };

    const handleCreateStudent = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/create-student', {
                name: studentName,
                email: studentEmail,
                password: "portal@123",
                studentId,
                rollNumber,
                universityRollNumber: uniRollNumber,
                gradeId: selectedGradeId,
                semester: semester || null
            });
            toast.success('Student created! Default password: portal@123');
            setStudentName('');
            setStudentEmail('');
            setStudentId('');
            setRollNumber('');
            setUniRollNumber('');
            setSelectedGradeId('');
            setSemester('');
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
            setCourseName('');
            setCourseGradeId('');
            fetchGrades();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create course');
        }
    };

    const handleAssignTeacher = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/assign-teacher-grade', {
                teacherId: assignTeacherId,
                gradeId: assignGradeId
            });
            toast.success('Teacher assigned to grade!');
            setAssignTeacherId('');
            setAssignGradeId('');
            fetchTeachers(); // Refresh list to show updated assignments
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to assign teacher');
        }
    };

    const handleDeleteGrade = async (gradeId, gradeName) => {
        if (!window.confirm(`Are you sure you want to delete the grade "${gradeName}"? This will also delete all its courses and exams (if no submissions exist).`)) return;
        try {
            await api.delete(`/admin/grades/${gradeId}`);
            toast.success(`Grade "${gradeName}" deleted successfully!`);
            fetchGrades();
            fetchTeachers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete grade');
        }
    };

    const handleDeleteCourse = async (courseId, courseName) => {
        if (!window.confirm(`Are you sure you want to delete the course "${courseName}"? This will also delete all its exams (if no submissions exist).`)) return;
        try {
            await api.delete(`/admin/courses/${courseId}`);
            toast.success(`Course "${courseName}" deleted successfully!`);
            fetchGrades();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete course');
        }
    };

    const handleRemoveTeacherGrade = async (teacherId, gradeId, teacherName, gradeName) => {
        if (!window.confirm(`Remove grade "${gradeName}" from teacher "${teacherName}"?`)) return;
        try {
            await api.delete(`/admin/teacher/${teacherId}/grade/${gradeId}`);
            toast.success(`Removed "${gradeName}" from ${teacherName}`);
            fetchTeachers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to remove grade from teacher');
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
        const a = document.createElement('a');
        a.href = url;
        a.download = 'student_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleBulkStudentUpload = async () => {
        if (!bulkStudentFile) {
            toast.error('Please select a CSV file');
            return;
        }
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
        <>
            <Navbar bg="dark" variant="dark" expand="lg">
                <Container>
                    <Navbar.Brand href="#">Admin Portal</Navbar.Brand>
                    <Navbar.Toggle />
                    <Navbar.Collapse className="justify-content-end">
                        <Navbar.Text className="me-3">Signed in as: {user?.name}</Navbar.Text>
                        <Button variant="outline-light" size="sm" onClick={logout}>Logout</Button>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container className="mt-4">
                <Tabs defaultActiveKey="users" id="admin-tabs" className="mb-3">

                    <Tab eventKey="users" title="Manage Users">
                        <Row>
                            <Col md={6}>
                                <Card className="mb-4">
                                    <Card.Header as="h5">Create Teacher</Card.Header>
                                    <Card.Body>
                                        <Form onSubmit={handleCreateTeacher}>
                                            <Form.Group className="mb-3"><Form.Label>Name</Form.Label><Form.Control required value={teacherName} onChange={e => setTeacherName(e.target.value)} /></Form.Group>
                                            <Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control type="email" required value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)} /></Form.Group>
                                            <Form.Group className="mb-3"><Form.Label>Password</Form.Label><Form.Control type="password" required value={teacherPassword} onChange={e => setTeacherPassword(e.target.value)} /></Form.Group>
                                            <Button type="submit">Create Teacher</Button>
                                        </Form>
                                    </Card.Body>
                                </Card>
                            </Col>

                            <Col md={6}>
                                <Card className="mb-4">
                                    <Card.Header as="h5">Assign Teacher to Grade</Card.Header>
                                    <Card.Body>
                                        <Form onSubmit={handleAssignTeacher}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Teacher</Form.Label>
                                                <Form.Select required value={assignTeacherId} onChange={e => setAssignTeacherId(e.target.value)}>
                                                    <option value="">Select Teacher</option>
                                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}
                                                </Form.Select>
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Grade</Form.Label>
                                                <Form.Select required value={assignGradeId} onChange={e => setAssignGradeId(e.target.value)}>
                                                    <option value="">Select Grade</option>
                                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                </Form.Select>
                                            </Form.Group>
                                            <Button type="submit" variant="info" className="text-white">Assign Grade</Button>
                                        </Form>
                                    </Card.Body>
                                </Card>

                                <Card className="mb-4">
                                    <Card.Header as="h5">Teacher Assignments</Card.Header>
                                    <Card.Body>
                                        <ul className="list-unstyled">
                                            {teachers.map(t => (
                                                <li key={t.id} className="mb-2">
                                                    <strong>{t.name}</strong>:{' '}
                                                    {t.teachingGrades && t.teachingGrades.length > 0
                                                        ? t.teachingGrades.map(g => (
                                                            <Badge key={g.id} bg="info" className="me-1 align-middle" style={{ fontSize: '0.85em' }}>
                                                                {g.name}
                                                                <CloseButton
                                                                    variant="white"
                                                                    style={{ fontSize: '0.5em', marginLeft: '6px', verticalAlign: 'middle' }}
                                                                    onClick={() => handleRemoveTeacherGrade(t.id, g.id, t.name, g.name)}
                                                                />
                                                            </Badge>
                                                        ))
                                                        : <em className="text-muted">No grades assigned</em>}
                                                </li>
                                            ))}
                                        </ul>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={12}>
                                <Card className="mb-4">
                                    <Card.Header as="h5">Create Student</Card.Header>
                                    <Card.Body>
                                        <Form onSubmit={handleCreateStudent}>
                                            <Row>
                                                <Col><Form.Group className="mb-3"><Form.Label>Name</Form.Label><Form.Control required value={studentName} onChange={e => setStudentName(e.target.value)} /></Form.Group></Col>
                                                <Col><Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control type="email" required value={studentEmail} onChange={e => setStudentEmail(e.target.value)} /></Form.Group></Col>
                                            </Row>
                                            <Row>
                                                <Col><Form.Group className="mb-3"><Form.Label>Student ID</Form.Label><Form.Control required value={studentId} onChange={e => setStudentId(e.target.value)} /></Form.Group></Col>
                                                <Col><Form.Group className="mb-3"><Form.Label>Roll No</Form.Label><Form.Control required value={rollNumber} onChange={e => setRollNumber(e.target.value)} /></Form.Group></Col>
                                            </Row>
                                            <Form.Group className="mb-3"><Form.Label>Univ Roll No</Form.Label><Form.Control required value={uniRollNumber} onChange={e => setUniRollNumber(e.target.value)} /></Form.Group>

                                            <Row>
                                                <Col>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Grade</Form.Label>
                                                        <Form.Select required value={selectedGradeId} onChange={e => setSelectedGradeId(e.target.value)}>
                                                            <option value="">Select Grade</option>
                                                            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                <Col>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Semester</Form.Label>
                                                        <Form.Control type="number" min="1" placeholder="e.g. 1" value={semester} onChange={e => setSemester(e.target.value)} />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <Button variant="success" type="submit">Create Student</Button>
                                            <Button variant="outline-success" className="ms-2" onClick={openBulkStudentUpload}>
                                                📤 Bulk Upload Students
                                            </Button>
                                        </Form>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </Tab>

                    <Tab eventKey="structure" title="Manage Structure">
                        <Row>
                            <Col md={6}>
                                <Card className="mb-4">
                                    <Card.Header>Add Grade</Card.Header>
                                    <Card.Body>
                                        <Form onSubmit={handleCreateGrade}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Grade Name (e.g., BTech, BSc)</Form.Label>
                                                <Form.Control required value={gradeName} onChange={e => setGradeName(e.target.value)} />
                                            </Form.Group>
                                            <Button type="submit">Add Grade</Button>
                                        </Form>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={6}>
                                <Card className="mb-4">
                                    <Card.Header>Add Course</Card.Header>
                                    <Card.Body>
                                        <Form onSubmit={handleCreateCourse}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Course Name (e.g., Java, Python)</Form.Label>
                                                <Form.Control required value={courseName} onChange={e => setCourseName(e.target.value)} />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Assign to Grade</Form.Label>
                                                <Form.Select required value={courseGradeId} onChange={e => setCourseGradeId(e.target.value)}>
                                                    <option value="">Select Grade</option>
                                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                </Form.Select>
                                            </Form.Group>
                                            <Button type="submit">Add Course</Button>
                                        </Form>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        <Card>
                            <Card.Header>Current Structure</Card.Header>
                            <Card.Body>
                                <Table striped bordered hover>
                                    <thead>
                                        <tr>
                                            <th>Grade</th>
                                            <th>Courses</th>
                                            <th style={{ width: '80px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {grades.map(g => (
                                            <tr key={g.id}>
                                                <td>{g.name}</td>
                                                <td>
                                                    {g.courses && g.courses.length > 0
                                                        ? g.courses.map(c => (
                                                            <Badge key={c.id} bg="secondary" className="me-1" style={{ fontSize: '0.85em' }}>
                                                                {c.name}
                                                                <CloseButton
                                                                    variant="white"
                                                                    style={{ fontSize: '0.5em', marginLeft: '6px', verticalAlign: 'middle' }}
                                                                    onClick={() => handleDeleteCourse(c.id, c.name)}
                                                                />
                                                            </Badge>
                                                        ))
                                                        : <span className="text-muted">No courses</span>
                                                    }
                                                </td>
                                                <td className="text-center">
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleDeleteGrade(g.id, g.name)}
                                                        title={`Delete grade ${g.name}`}
                                                    >
                                                        🗑️
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    </Tab>
                </Tabs>
            </Container>

            {/* Bulk Student Upload Modal */}
            <Modal show={showBulkStudentModal} onHide={() => setShowBulkStudentModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>📤 Bulk Upload Students (CSV)</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="info">
                        <strong>CSV Format:</strong> <code>name,email,studentId,rollNumber,universityRollNumber,grade,semester</code><br />
                        Use the <strong>grade name</strong> (e.g., "BTech", "BSc") — not the ID.<br />
                        All students get <strong>default password: portal@123</strong>
                    </Alert>

                    <div className="d-flex align-items-center mb-3">
                        <Button variant="outline-secondary" size="sm" onClick={downloadStudentTemplate}>
                            ⬇️ Download Template
                        </Button>
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label>Select CSV File</Form.Label>
                        <Form.Control
                            type="file"
                            accept=".csv"
                            onChange={e => setBulkStudentFile(e.target.files[0])}
                        />
                    </Form.Group>

                    <Button
                        variant="primary"
                        onClick={handleBulkStudentUpload}
                        disabled={bulkStudentLoading || !bulkStudentFile}
                    >
                        {bulkStudentLoading ? 'Uploading...' : 'Upload & Create Students'}
                    </Button>

                    {bulkStudentResult && bulkStudentResult.success && (
                        <Alert variant="success" className="mt-3">
                            ✅ {bulkStudentResult.message}
                        </Alert>
                    )}

                    {bulkStudentResult && !bulkStudentResult.success && (
                        <Alert variant="danger" className="mt-3">
                            <strong>❌ {bulkStudentResult.error}</strong>
                            {bulkStudentResult.details && (
                                <>
                                    <p className="mt-2 mb-1">Errors in {bulkStudentResult.errorCount} of {bulkStudentResult.totalRows} rows:</p>
                                    <ListGroup variant="flush" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {bulkStudentResult.details.map((d, idx) => (
                                            <ListGroup.Item key={idx} className="py-1 px-2" style={{ fontSize: '0.85em' }}>
                                                <strong>Row {d.row}:</strong> {d.errors.join('; ')}
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                </>
                            )}
                        </Alert>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
};

export default AdminDashboard;
