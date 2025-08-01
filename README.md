# StudyBuddy - AI Learning Partner

![StudyBuddy Screenshot](https://ibb.co/N6MHDk3w)

**Live Demo:** [https://study-buddy-ai-app.netlify.app/](https://study-buddy-ai-app.netlify.app/)

## Introduction

StudyBuddy is an interactive web application designed to help students with their studies. It acts as a personal AI tutor that makes the learning process engaging and effective. Users can paste their study notes, and the application will generate questions based on that content. The student can answer verbally, and the AI will evaluate their response and provide constructive feedback.

This project demonstrates the power of active recall and personalized feedback, which are proven techniques for learning and information retention.

## Key Features

- **AI-Powered Question Generation**: Utilizes Google's Gemini model to generate relevant questions from any given text.
- **Voice-to-Text Transcription**: Uses the Web Speech API to capture and transcribe the user's spoken answers.
- **Intelligent Answer Evaluation**: Analyzes the accuracy of the student's answer and provides encouraging, constructive feedback for improvement.
- **Text-to-Speech**: Reads the AI's feedback aloud for a fully interactive experience.
- **Modern & Responsive Design**: Built with React and Tailwind CSS for a seamless experience on all devices.

## Technology Stack

- **Frontend**: React, Vite, Tailwind CSS
- **AI & Machine Learning**: Google Gemini API
- **Web APIs**: Web Speech API (SpeechRecognition), Web Speech API (SpeechSynthesis)
- **Deployment**: Netlify

## Local Setup and Installation

To run this project on your local machine, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/lohith261/study-buddy-app.git](https://github.com/lohith261/study-buddy-app.git)
    cd study-buddy-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    -   Create a file named `.env.local` in the root of the project.
    -   Add your Google Gemini API key in the following format:
        ```
        VITE_GEMINI_API_KEY=YOUR_ACTUAL_API_KEY_GOES_HERE
        ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## Deployment

This project is configured for continuous deployment on Netlify. Any push to the `main` branch will automatically trigger a new build and deployment.

To deploy on Netlify, ensure you set the following environment variable in your site settings:
- **Key**: `VITE_GEMINI_API_KEY`
- **Value**: Your Google Gemini API Key

---