import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Container, Navbar, Nav, Button, Card, Row, Col, Form, Modal, Table } from 'react-bootstrap';
import api from '../api/axios';
import { toast } from 'react-toastify';

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
    const [subject, setSubject] = useState('');
    // const [subject, setSubject] = useState(''); // Replaced by Grade/Course
    const [selectedGradeId, setSelectedGradeId] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [durationMinutes, setDurationMinutes] = useState('');
    const [password, setPassword] = useState('');
    const [deletePassword, setDeletePassword] = useState('');

    const [myGrades, setMyGrades] = useState([]);

    // Get courses for selected grade
    const availableCourses = myGrades.find(g => g.id === selectedGradeId)?.courses || [];

    // Question Form State
    const [questionText, setQuestionText] = useState('');
    const [marks, setMarks] = useState(1);
    const [option1, setOption1] = useState('');
    const [option2, setOption2] = useState('');
    const [option3, setOption3] = useState('');
    const [option4, setOption4] = useState('');
    const [correctOptionIndex, setCorrectOptionIndex] = useState(0);

    const fetchExams = async () => {
        try {
            const response = await api.get('/exams');
            setExams(response.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch exams');
        }
    };

    const fetchMyGrades = async () => {
        try {
            const response = await api.get('/teacher/my-grades');
            setMyGrades(response.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch your assigned grades');
        }
    };

    useEffect(() => {
        fetchExams();
        fetchMyGrades();
    }, []);

    const handleCreateExam = async (e) => {
        e.preventDefault();
        try {
            await api.post('/teacher/create-exam', {
                title,
                gradeId: selectedGradeId,
                courseId: selectedCourseId,
                scheduledDate,
                durationMinutes: parseInt(durationMinutes),
                password
            });
            toast.success('Exam created!');
            setShowCreateExamModal(false);
            fetchExams();
            setTitle('');
            setSelectedGradeId('');
            setSelectedCourseId('');
            setScheduledDate('');
            setDurationMinutes('');
            setPassword('');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create exam');
        }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        try {
            const optionsData = [
                { optionText: option1, isCorrect: correctOptionIndex === 0 },
                { optionText: option2, isCorrect: correctOptionIndex === 1 },
                { optionText: option3, isCorrect: correctOptionIndex === 2 },
                { optionText: option4, isCorrect: correctOptionIndex === 3 },
            ];

            await api.post('/teacher/add-question', {
                examId: selectedExamId,
                type: 'MCQ',
                questionText,
                marks: parseInt(marks),
                options: optionsData
            });
            toast.success('Question added!');
            // Don't close modal to allow adding more questions? Or close it.
            // Let's keep it open for convenience or reset form
            setQuestionText('');
            setOption1('');
            setOption2('');
            setOption3('');
            setOption4('');
            setCorrectOptionIndex(0);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add question');
        }
    };

    const openAddQuestion = (examId) => {
        setSelectedExamId(examId);
        setShowAddQuestionModal(true);
    };

    const openManageExam = async (examId) => {
        setSelectedExamId(examId);
        try {
            const response = await api.get(`/teacher/exam/${examId}`);
            setSelectedExamDetails(response.data);
            setShowManageModal(true);
        } catch (err) {
            toast.error("Failed to load exam details");
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (!window.confirm("Are you sure you want to delete this question?")) return;
        try {
            await api.delete(`/teacher/question/${questionId}`);
            toast.success("Question deleted");
            // Refresh details
            const response = await api.get(`/teacher/exam/${selectedExamId}`);
            setSelectedExamDetails(response.data);
            fetchExams(); // Update count in list
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete question");
        }
    };

    const handleDeleteExam = async () => {
        if (!deletePassword) {
            toast.error("Please enter the password to delete");
            return;
        }
        if (!window.confirm("Are you sure? This will delete the exam and all its questions permanently.")) return;

        try {
            await api.delete(`/teacher/exam/${selectedExamId}`, {
                data: { password: deletePassword }
            });
            toast.success("Exam deleted successfully");
            setShowManageModal(false);
            setDeletePassword('');
            fetchExams();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete exam");
        }
    };

    const openResults = async (exam) => {
        setSelectedExamId(exam.id);
        setCurrentExamResultsReleased(exam.resultsReleased);
        try {
            const response = await api.get(`/teacher/exam/${exam.id}/submissions`);
            setExamSubmissions(response.data);
            setShowResultsModal(true);
        } catch (err) {
            toast.error("Failed to load submissions");
        }
    };

    const toggleReleaseResults = async () => {
        try {
            const response = await api.patch(`/teacher/exam/${selectedExamId}/toggle-release`);
            setCurrentExamResultsReleased(response.data.resultsReleased);
            toast.success(`Results ${response.data.resultsReleased ? 'Released' : 'Unpublished'}`);
            fetchExams(); // Update list to reflect status
        } catch (err) {
            toast.error("Failed to toggle results");
        }
    };

    return (
        <>
            <Navbar bg="primary" variant="dark" expand="lg">
                <Container>
                    <Navbar.Brand href="#">Teacher Dashboard</Navbar.Brand>
                    <Navbar.Toggle />
                    <Navbar.Collapse className="justify-content-end">
                        <Navbar.Text className="me-3 text-white">
                            Signed in as: {user?.name}
                        </Navbar.Text>
                        <Button variant="light" size="sm" onClick={logout}>Logout</Button>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3>Your Exams</h3>
                    <Button onClick={() => setShowCreateExamModal(true)}>Create New Exam</Button>
                </div>

                <Row>
                    {exams.map(exam => (
                        <Col md={4} key={exam.id} className="mb-4">
                            <Card>
                                <Card.Body>
                                    <Card.Title>{exam.title}</Card.Title>
                                    <Card.Subtitle className="mb-2 text-muted">
                                        {exam.grade?.name} - {exam.course?.name}
                                    </Card.Subtitle>
                                    <Card.Text>
                                        Date: {new Date(exam.scheduledDate).toLocaleString()}<br />
                                        Duration: {exam.durationMinutes} mins<br />
                                        Questions: {exam._count?.questions || 0}
                                    </Card.Text>
                                    <Button variant="outline-primary" size="sm" onClick={() => openAddQuestion(exam.id)} className="me-2">
                                        Add Questions
                                    </Button>
                                    <Button variant="outline-secondary" size="sm" onClick={() => openManageExam(exam.id)} className="me-2">
                                        Manage
                                    </Button>
                                    <Button variant="info" size="sm" onClick={() => openResults(exam)}>
                                        Results
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Container>

            {/* Create Exam Modal */}
            <Modal show={showCreateExamModal} onHide={() => setShowCreateExamModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Create Exam</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleCreateExam}>
                        <Form.Group className="mb-3">
                            <Form.Label>Title</Form.Label>
                            <Form.Control required value={title} onChange={e => setTitle(e.target.value)} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Grade</Form.Label>
                            <Form.Select required value={selectedGradeId} onChange={e => {
                                setSelectedGradeId(e.target.value);
                                setSelectedCourseId(''); // Reset course when grade changes
                            }}>
                                <option value="">Select Grade</option>
                                {myGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Course</Form.Label>
                            <Form.Select required value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} disabled={!selectedGradeId}>
                                <option value="">Select Course</option>
                                {availableCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Date & Time</Form.Label>
                            <Form.Control type="datetime-local" required value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Duration (Minutes)</Form.Label>
                            <Form.Control type="number" required value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Password (Optional)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter exam password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </Form.Group>
                        <Button type="submit">Create</Button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Add Question Modal */}
            <Modal show={showAddQuestionModal} onHide={() => setShowAddQuestionModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Add Question</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleAddQuestion}>
                        <Form.Group className="mb-3">
                            <Form.Label>Question Text</Form.Label>
                            <Form.Control as="textarea" rows={3} required value={questionText} onChange={e => setQuestionText(e.target.value)} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Marks</Form.Label>
                            <Form.Control type="number" required value={marks} onChange={e => setMarks(e.target.value)} />
                        </Form.Group>

                        <h5>Options</h5>
                        {[option1, option2, option3, option4].map((opt, idx) => (
                            <Form.Group key={idx} className="mb-2">
                                <Form.Check
                                    type="radio"
                                    label={`Option ${idx + 1} is Correct`}
                                    name="correctOption"
                                    checked={correctOptionIndex === idx}
                                    onChange={() => setCorrectOptionIndex(idx)}
                                    className="mb-1"
                                />
                                <Form.Control
                                    type="text"
                                    placeholder={`Option ${idx + 1}`}
                                    value={idx === 0 ? option1 : idx === 1 ? option2 : idx === 2 ? option3 : option4}
                                    onChange={e => {
                                        if (idx === 0) setOption1(e.target.value);
                                        if (idx === 1) setOption2(e.target.value);
                                        if (idx === 2) setOption3(e.target.value);
                                        if (idx === 3) setOption4(e.target.value);
                                    }}
                                    required
                                />
                            </Form.Group>
                        ))}

                        <Button type="submit" className="mt-3">Add Question</Button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Manage Exam Modal */}
            <Modal show={showManageModal} onHide={() => setShowManageModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Manage Exam: {selectedExamDetails?.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <h5>Questions</h5>
                    {selectedExamDetails?.questions?.length === 0 ? (
                        <p className="text-muted">No questions yet.</p>
                    ) : (
                        <Table striped bordered hover size="sm">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Question</th>
                                    <th>Marks</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedExamDetails?.questions?.map((q, idx) => (
                                    <tr key={q.id}>
                                        <td>{idx + 1}</td>
                                        <td>{q.questionText}</td>
                                        <td>{q.marks}</td>
                                        <td>
                                            <Button variant="danger" size="sm" onClick={() => handleDeleteQuestion(q.id)}>
                                                Delete
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}

                    <hr />
                    <h5 className="text-danger">Danger Zone</h5>
                    <Card border="danger" className="p-3">
                        <Form.Group className="mb-3">
                            <Form.Label>Enter Exam Password to Delete</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Exam Password"
                                value={deletePassword}
                                onChange={e => setDeletePassword(e.target.value)}
                            />
                        </Form.Group>
                        <Button variant="danger" onClick={handleDeleteExam}>
                            Delete Entire Exam
                        </Button>
                    </Card>
                </Modal.Body>
            </Modal>

            {/* Results Modal */}
            <Modal show={showResultsModal} onHide={() => setShowResultsModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Exam Results</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5>Submissions: {examSubmissions.length}</h5>
                        <Button
                            variant={currentExamResultsReleased ? "warning" : "success"}
                            onClick={toggleReleaseResults}
                        >
                            {currentExamResultsReleased ? "Unpublish Results" : "Release Results"}
                        </Button>
                    </div>
                    {examSubmissions.length === 0 ? (
                        <p className="text-muted">No submissions yet.</p>
                    ) : (
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                    <th>Student Name</th>
                                    <th>Email</th>
                                    <th>Score</th>
                                    <th>Submitted At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {examSubmissions.map(sub => (
                                    <tr key={sub.id}>
                                        <td>{sub.student.name}</td>
                                        <td>{sub.student.email}</td>
                                        <td>{sub.totalScore}</td>
                                        <td>{new Date(sub.submittedAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
};

export default TeacherDashboard;
