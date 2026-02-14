import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Container, Navbar, Nav, Button, Card, Row, Col, Form, Alert, Modal } from 'react-bootstrap';
import api from '../api/axios';
import { toast } from 'react-toastify';

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const [exams, setExams] = useState([]);
    const [activeExam, setActiveExam] = useState(null);
    const [answers, setAnswers] = useState({}); // { questionId: optionId }
    const [submissionResult, setSubmissionResult] = useState(null);
    const [viewingResult, setViewingResult] = useState(null);

    // Password Verification State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [examPassword, setExamPassword] = useState('');

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const response = await api.get('/exams');
            setExams(response.data);
        } catch (err) {
            console.error(err);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                // Token invalid or expired
                // AuthContext should handle logout, but we can force it
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
            // Verify password and eligibility
            await api.post('/student/verify-exam', {
                examId: selectedExamId,
                password: examPassword
            });

            // If success, fetch full exam (with questions)
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
        setAnswers(prev => ({
            ...prev,
            [questionId]: optionId
        }));
    };

    const handleSubmitExam = async () => {
        // Format answers for backend
        const formattedAnswers = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
            questionId,
            selectedOptionId
        }));

        try {
            const response = await api.post('/student/submit-exam', {
                examId: activeExam.id,
                answers: formattedAnswers
            });
            setSubmissionResult(response.data);
            setSubmissionResult(response.data);
            toast.success(`Exam submitted! Results will be available once released by the teacher.`);
            setActiveExam(null); // Go back to list or show result view
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit exam');
        }
    };

    return (
        <>
            <Navbar bg="success" variant="dark" expand="lg">
                <Container>
                    <Navbar.Brand href="#">Student Dashboard</Navbar.Brand>
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
                {submissionResult && (
                    <Alert variant="success" onClose={() => setSubmissionResult(null)} dismissible>
                        <Alert.Heading>Exam Submitted Successfully!</Alert.Heading>
                        <p>
                            Your answers have been recorded. Please wait for the teacher to release the results.
                        </p>
                    </Alert>
                )}

                {!activeExam ? (
                    <Row>
                        <h3>Available Exams</h3>
                        {exams.length === 0 && <p className="text-muted">No exams available for your grade.</p>}
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
                                            Duration: {exam.durationMinutes} mins
                                        </Card.Text>
                                        <div className="d-flex gap-2">
                                            <Button variant="primary" onClick={() => initiateExamStart(exam.id)}>
                                                Take Exam
                                            </Button>
                                            {exam.resultsReleased && (
                                                <Button variant="outline-info" onClick={() => handleViewResult(exam.id)}>
                                                    View Result
                                                </Button>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <Card>
                        <Card.Header as="h4">
                            {activeExam.title}
                            {/* Cancel button removed per requirements */}
                        </Card.Header>
                        <Card.Body>
                            {activeExam.questions.map((q, idx) => (
                                <div key={q.id} className="mb-4">
                                    <h5>{idx + 1}. {q.questionText} <small className="text-muted">({q.marks} marks)</small></h5>
                                    {q.options.map(opt => (
                                        <Form.Check
                                            key={opt.id}
                                            type="radio"
                                            name={`question-${q.id}`}
                                            label={opt.optionText}
                                            id={`opt-${opt.id}`}
                                            onChange={() => handleOptionSelect(q.id, opt.id)}
                                            checked={answers[q.id] === opt.id}
                                            className="mb-2"
                                        />
                                    ))}
                                </div>
                            ))}
                            <Button variant="success" size="lg" onClick={handleSubmitExam}>Submit Exam</Button>
                        </Card.Body>
                    </Card>
                )}
            </Container>

            {/* Password Verification Modal */}
            <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Enter Exam Password</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleVerifyAndStart}>
                        <Form.Text className="text-muted d-block mb-3">
                            Check with your teacher for the exam password. You can only attempt this exam once.
                        </Form.Text>
                        <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                required
                                value={examPassword}
                                onChange={e => setExamPassword(e.target.value)}
                                autoFocus
                            />
                        </Form.Group>
                        <Button type="submit" variant="success">Start Exam</Button>
                    </Form>
                </Modal.Body>
            </Modal>
            {/* View Result Modal */}
            <Modal show={!!viewingResult} onHide={() => setViewingResult(null)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Exam Result</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <h4>Total Score: {viewingResult?.totalScore}</h4>
                    <hr />
                    {viewingResult?.answers?.map((ans, idx) => (
                        <div key={ans.id} className="mb-3">
                            <p><strong>Q{idx + 1}: {ans.question.questionText}</strong> ({ans.question.marks} marks)</p>
                            <p>
                                Your Answer: <span className={ans.selectedOption?.isCorrect ? "text-success" : "text-danger"}>
                                    {ans.selectedOption?.optionText || "Unanswered"}
                                </span>
                                {ans.selectedOption?.isCorrect ? " (Correct)" : " (Incorrect)"}
                            </p>
                        </div>
                    ))}
                </Modal.Body>
            </Modal>
        </>
    );
};

export default StudentDashboard;
