import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import YaraAssistant from './YaraAssistant';

const Questionnaire = ({ onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({});

    const questions = [
        {
            id: 1,
            question: "What is your age?",
            subtitle: "Used to adjust workout intensity and recovery.",
            type: "number",
            placeholder: "Enter your age"
        },
        {
            id: 2,
            question: "What is your gender?",
            type: "options",
            options: ["Male", "Female", "Non-binary", "Prefer not to say"]
        },
        {
            id: 3,
            question: "What is your height and weight?",
            subtitle: "Needed to estimate calories, BMI, and training load.",
            type: "measurements"
        },
        {
            id: 4,
            question: "What is your main fitness goal?",
            type: "options",
            options: ["Lose fat", "Gain muscle", "Maintain fitness", "Improve endurance", "Build healthy habits"]
        },
        {
            id: 5,
            question: "What is your current fitness level?",
            type: "options",
            options: ["Beginner", "Intermediate", "Advanced"]
        },
        {
            id: 6,
            question: "Where will you mostly train?",
            type: "options",
            options: ["Home", "Gym"]
        },
        {
            id: 7,
            question: "How many days per week can you work out?",
            subtitle: "Determines weekly workout schedule.",
            type: "options",
            options: ["2-3 days", "4-5 days", "6-7 days"]
        },
        {
            id: 8,
            question: "How long should each workout session be?",
            type: "options",
            options: ["15–30 min", "30–45 min", "45–60 min"]
        },
        {
            id: 9,
            question: "Do you have any injuries or limitations?",
            subtitle: "Ensures safe exercise selection.",
            type: "textarea",
            placeholder: "Describe any limitations or type 'None'"
        },
        {
            id: 10,
            question: "What type of training do you prefer?",
            type: "options",
            options: ["Strength", "Cardio", "Mixed", "Stretching / mobility"]
        }
    ];

    const handleAnswer = (answer) => {
        const newAnswers = { ...answers, [questions[currentStep].id]: answer };
        setAnswers(newAnswers);

        if (currentStep < questions.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            console.log("Workout Profile:", newAnswers);
            onClose();
        }
    };

    const progress = ((currentStep + 1) / questions.length) * 100;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.9)',
                backdropFilter: 'blur(10px)',
                zIndex: 2000,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px'
            }}
        >
            <motion.div
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                style={{
                    background: 'var(--color-background)',
                    border: '2px solid var(--color-primary)',
                    borderRadius: '24px',
                    padding: '40px',
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    position: 'relative'
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: 'white',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        fontSize: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    ×
                </button>

                <YaraAssistant message={`Question ${currentStep + 1} of ${questions.length}: ${questions[currentStep].question}`} />

                <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '3px',
                    margin: '20px 0',
                    overflow: 'hidden'
                }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent-lime))'
                        }}
                    />
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h2 style={{
                            fontSize: '28px',
                            fontWeight: 600,
                            marginBottom: '10px',
                            color: 'white'
                        }}>
                            {questions[currentStep].question}
                        </h2>
                        
                        {questions[currentStep].subtitle && (
                            <p style={{
                                color: 'var(--color-accent-light)',
                                fontSize: '14px',
                                marginBottom: '30px'
                            }}>
                                {questions[currentStep].subtitle}
                            </p>
                        )}

                        <QuestionInput 
                            question={questions[currentStep]} 
                            onAnswer={handleAnswer}
                        />
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
};

const QuestionInput = ({ question, onAnswer }) => {
    const [value, setValue] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');

    if (question.type === 'options') {
        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                marginTop: '20px'
            }}>
                {question.options.map((option, index) => (
                    <motion.button
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onAnswer(option)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '16px',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '16px',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}
                    >
                        {option}
                    </motion.button>
                ))}
            </div>
        );
    }

    if (question.type === 'measurements') {
        return (
            <div style={{ marginTop: '20px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '20px'
                }}>
                    <input
                        type="number"
                        placeholder="Height (cm)"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '16px',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '16px'
                        }}
                    />
                    <input
                        type="number"
                        placeholder="Weight (kg)"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '16px',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '16px'
                        }}
                    />
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onAnswer({ height, weight })}
                    disabled={!height || !weight}
                    style={{
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent-light))',
                        color: 'white',
                        padding: '16px',
                        borderRadius: '50px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        width: '100%',
                        cursor: 'pointer',
                        opacity: (!height || !weight) ? 0.5 : 1
                    }}
                >
                    Next →
                </motion.button>
            </div>
        );
    }

    if (question.type === 'textarea') {
        return (
            <div style={{ marginTop: '20px' }}>
                <textarea
                    placeholder={question.placeholder}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    rows="4"
                    style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '16px',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '16px',
                        marginBottom: '16px',
                        resize: 'vertical'
                    }}
                />
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onAnswer(value)}
                    disabled={!value}
                    style={{
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent-light))',
                        color: 'white',
                        padding: '16px',
                        borderRadius: '50px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        width: '100%',
                        cursor: 'pointer',
                        opacity: !value ? 0.5 : 1
                    }}
                >
                    Next →
                </motion.button>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '20px' }}>
            <input
                type="number"
                placeholder={question.placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '16px',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '16px',
                    marginBottom: '16px'
                }}
            />
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onAnswer(value)}
                disabled={!value}
                style={{
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent-light))',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '50px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    width: '100%',
                    cursor: 'pointer',
                    opacity: !value ? 0.5 : 1
                }}
            >
                Next →
            </motion.button>
        </div>
    );
};

export default Questionnaire;