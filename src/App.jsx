import React, { useState, useEffect, useCallback, useMemo } from 'react';

// --- Helper Components ---

// Microphone Icon Component
const MicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
);

// Speaker Icon Component
const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    </svg>
);

// Loading Overlay Component
const LoadingOverlay = ({ text }) => (
    <div className="fixed inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center z-50">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-semibold">{text}</p>
    </div>
);

// Error Modal Component
const ErrorModal = ({ message, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full text-center">
            <h3 className="text-xl font-bold text-red-600">An Error Occurred</h3>
            <p className="mt-2 text-slate-600">{message}</p>
            <button onClick={onClose} className="mt-4 bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600">
                Close
            </button>
        </div>
    </div>
);


// --- Main App Component ---
export default function App() {
    // --- State Management ---
    const [view, setView] = useState('initial'); // 'initial', 'quiz', 'complete'
    const [context, setContext] = useState('');
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [feedback, setFeedback] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState({ isActive: false, text: '' });
    const [error, setError] = useState('');

    // --- Speech Recognition Setup ---
    const recognition = useMemo(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
            return null;
        }
        const instance = new SpeechRecognition();
        instance.continuous = false;
        instance.lang = 'en-US';
        instance.interimResults = false;
        return instance;
    }, []);

    // --- API Communication ---
    const callGemini = useCallback(async (chatHistory, responseSchema = null) => {
        // *** THIS IS THE IMPORTANT CHANGE ***
        // It now reads the API key from your environment variables
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            setError("API Key is missing. Please add it to your .env.local file.");
            return;
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const payload = { contents: chatHistory };
        if (responseSchema) {
            payload.generationConfig = {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            };
        }

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error("API Error Response:", errorBody);
                throw new Error(`API request failed with status ${response.status}.`);
            }

            const result = await response.json();
            
            if (result.candidates?.[0]?.content?.parts?.[0]) {
                return result.candidates[0].content.parts[0].text;
            } else {
                console.error("Unexpected API response structure:", result);
                if (result.promptFeedback?.blockReason) {
                     throw new Error(`Request was blocked: ${result.promptFeedback.blockReason}`);
                }
                throw new Error("The AI returned an empty or invalid response.");
            }
        } catch (err) {
            console.error("Error calling Gemini API:", err);
            throw err;
        }
    }, []);

    // --- Core Logic Functions ---
    const generateQuestions = useCallback(async () => {
        if (context.length < 50) {
            setError("Please paste a more substantial amount of text (at least 50 characters) for better question generation.");
            return;
        }
        setLoading({ isActive: true, text: "Generating questions from your notes..." });
        const prompt = `Based on the following text, generate exactly 5 diverse questions that a student could be asked in an exam. Include a mix of "what is," "how does," and "why is" questions. Do not generate multiple-choice questions.\n\nText: "${context}"`;
        const schema = { type: "OBJECT", properties: { questions: { type: "ARRAY", items: { type: "STRING" } } }, required: ["questions"] };
        const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];

        try {
            const responseText = await callGemini(chatHistory, schema);
            const parsedResponse = JSON.parse(responseText);
            if (parsedResponse.questions?.length > 0) {
                setQuestions(parsedResponse.questions);
                setCurrentQuestionIndex(0);
                setView('quiz');
            } else {
                throw new Error("The AI failed to generate questions in the expected format.");
            }
        } catch (err) {
            setError(`Failed to generate questions. ${err.message}`);
        } finally {
            setLoading({ isActive: false, text: '' });
        }
    }, [context, callGemini]);
    
    const evaluateAnswer = useCallback(async (userAnswer) => {
        setLoading({ isActive: true, text: "Evaluating your answer..." });
        const currentQuestion = questions[currentQuestionIndex];
        const prompt = `You are a helpful and encouraging tutor. A student is answering questions based on a text they studied.\n\nOriginal Text: "${context}"\n\nQuestion: "${currentQuestion}"\n\nStudent's Answer: "${userAnswer}"\n\nPlease evaluate the student's answer.\n1. Start by stating if the answer is "Correct", "Partially Correct", or "Incorrect".\n2. Provide a brief, clear, and encouraging explanation for your evaluation.\n3. If the answer is not perfect, provide a suggestion for how to improve it, referencing the original text if helpful. Keep the tone positive.`;
        const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        
        try {
            const feedbackText = await callGemini(chatHistory);
            const lowerFeedback = feedbackText.toLowerCase();
            let feedbackType = 'incorrect';
            if (lowerFeedback.startsWith('correct')) feedbackType = 'correct';
            else if (lowerFeedback.startsWith('partially correct')) feedbackType = 'partially';
            setFeedback({ text: feedbackText, type: feedbackType });
        } catch (err) {
            setError(`Failed to evaluate the answer. ${err.message}`);
            setFeedback({ text: 'Could not evaluate answer.', type: 'error' }); // Show error but don't block
        } finally {
            setLoading({ isActive: false, text: '' });
        }
    }, [questions, currentQuestionIndex, context, callGemini]);


    // --- Speech Recognition Event Handlers ---
    useEffect(() => {
        if (!recognition) return;

        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        recognition.onerror = (event) => {
            if (event.error === 'no-speech') {
                setError("I didn't hear anything. Please try speaking again.");
            } else {
                setError(`Speech recognition error: ${event.error}`);
            }
        };
        recognition.onresult = (event) => {
            const newTranscript = event.results[0][0].transcript;
            setTranscript(newTranscript);
            evaluateAnswer(newTranscript);
        };
        
        // Cleanup function to prevent memory leaks
        return () => {
            recognition.onstart = null;
            recognition.onend = null;
            recognition.onerror = null;
            recognition.onresult = null;
        };
    }, [recognition, evaluateAnswer]);

    // --- UI Event Handlers ---
    const handleRecordClick = () => {
        if (!recognition) return;
        if (isRecording) {
            recognition.stop();
        } else {
            // Reset state for new recording
            setTranscript('');
            setFeedback({ text: '', type: '' });
            recognition.start();
        }
    };
    
    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setTranscript('');
            setFeedback({ text: '', type: '' });
        } else {
            setView('complete');
        }
    };

    const handleRestart = () => {
        setView('initial');
        setContext('');
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setTranscript('');
        setFeedback({ text: '', type: '' });
    };

    const speakFeedback = () => {
        if ('speechSynthesis' in window && feedback.text) {
            const utterance = new SpeechSynthesisUtterance(feedback.text);
            utterance.lang = 'en-US';
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        } else {
            setError("Text-to-speech is not supported or there is no feedback to read.");
        }
    };

    // --- Dynamic Styles ---
    const feedbackStyles = {
        correct: 'border-green-500 bg-green-50',
        partially: 'border-yellow-500 bg-yellow-50',
        incorrect: 'border-red-500 bg-red-50',
        error: 'border-slate-500 bg-slate-50'
    };

    // --- Render Logic ---
    return (
        <div className="bg-slate-50 text-slate-800 flex items-center justify-center min-h-screen">
            <div className="w-full max-w-2xl mx-auto p-4 md:p-8">
                {loading.isActive && <LoadingOverlay text={loading.text} />}
                {error && <ErrorModal message={error} onClose={() => setError('')} />}

                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 transition-all duration-500">
                    {view === 'initial' && (
                        <div>
                            <div className="text-center mb-6">
                                <h1 className="text-3xl md:text-4xl font-bold text-green-700">StudyBuddy</h1>
                                <p className="text-slate-500 mt-2">Your personal AI learning partner.</p>
                            </div>
                            <div>
                                <label htmlFor="context-input" className="block text-sm font-medium text-slate-700 mb-2">Paste your lesson notes here:</label>
                                <textarea
                                    id="context-input"
                                    rows="12"
                                    value={context}
                                    onChange={(e) => setContext(e.target.value)}
                                    className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                                    placeholder="e.g., Photosynthesis is the process used by plants, algae, and certain bacteria..."
                                ></textarea>
                                <button onClick={generateQuestions} className="mt-4 w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300">
                                    Start Learning Session
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'quiz' && questions.length > 0 && (
                        <div>
                            <div className="text-center">
                                <p className="text-sm text-slate-400 font-medium mb-2">Question {currentQuestionIndex + 1} of {questions.length}</p>
                                <h2 className="text-xl md:text-2xl font-semibold text-slate-800">{questions[currentQuestionIndex]}</h2>
                            </div>

                            <div className="mt-8 flex flex-col items-center">
                                <button onClick={handleRecordClick} className={`w-24 h-24 text-white rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-green-300 ${isRecording ? 'bg-red-600 pulse' : 'bg-green-600'}`}>
                                    <MicIcon />
                                </button>
                                <p className="mt-4 text-slate-500 h-5">{isRecording ? "Listening..." : "Click the mic to answer"}</p>
                            </div>

                            {transcript && (
                                <div className="mt-6 p-4 bg-slate-100 rounded-lg min-h-[80px]">
                                    <p className="text-sm font-medium text-slate-600">Here's what I heard:</p>
                                    <p className="text-slate-800 mt-1">{transcript}</p>
                                </div>
                            )}

                            {feedback.text && (
                                <div className={`mt-6 p-4 border-l-4 rounded-r-lg ${feedbackStyles[feedback.type]}`}>
                                    <h3 className="font-bold text-lg">Feedback:</h3>
                                    <p className="mt-2">{feedback.text}</p>
                                    <button onClick={speakFeedback} className="mt-3 text-green-600 hover:text-green-800 flex items-center gap-2">
                                        <SpeakerIcon /> Read Aloud
                                    </button>
                                </div>
                            )}

                            {feedback.text && !loading.isActive && (
                                <div className="mt-8 text-center">
                                    <button onClick={handleNextQuestion} className="bg-slate-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-slate-300">
                                        {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'complete' && (
                        <div className="text-center py-8">
                            <h2 className="text-3xl font-bold text-green-700">Great Job!</h2>
                            <p className="text-slate-600 mt-3">You've completed all the questions for this topic.</p>
                            <button onClick={handleRestart} className="mt-8 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300">
                                Start a New Topic
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
