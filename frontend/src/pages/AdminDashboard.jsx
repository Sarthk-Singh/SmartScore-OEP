import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Container, Row, Col, Card, Form, Button, Navbar, Nav, Tab, Tabs, Table } from 'react-bootstrap';
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
                gradeId: selectedGradeId
            });
            toast.success('Student created! Default password: portal@123');
            setStudentName('');
            setStudentEmail('');
            // setStudentPassword(''); // No longer used
            setStudentId('');
            setRollNumber('');
            setUniRollNumber('');
            setSelectedGradeId('');
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
                                        <ul>
                                            {teachers.map(t => (
                                                <li key={t.id}>
                                                    <strong>{t.name}</strong>: {t.teachingGrades && t.teachingGrades.length > 0
                                                        ? t.teachingGrades.map(g => g.name).join(', ')
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

                                            <Form.Group className="mb-3">
                                                <Form.Label>Grade</Form.Label>
                                                <Form.Select required value={selectedGradeId} onChange={e => setSelectedGradeId(e.target.value)}>
                                                    <option value="">Select Grade</option>
                                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                </Form.Select>
                                            </Form.Group>

                                            <Button variant="success" type="submit">Create Student</Button>
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
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {grades.map(g => (
                                            <tr key={g.id}>
                                                <td>{g.name}</td>
                                                <td>
                                                    {g.courses && g.courses.length > 0
                                                        ? g.courses.map(c => <span key={c.id} className="badge bg-secondary me-1">{c.name}</span>)
                                                        : <span className="text-muted">No courses</span>
                                                    }
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
        </>
    );
};

export default AdminDashboard;
