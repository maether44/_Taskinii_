import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, Calendar, Heart, Activity, Target, Clock, 
    Home, Dumbbell, ArrowRight, ArrowLeft, Check, Camera, Award,
    Shield, Moon, Sun, Coffee, Zap, Brain, Sparkles
} from 'lucide-react';
import YaraAssistant, { yaraRef } from './YaraAssistant';
import { setYaraState as emitYaraState } from '../yaraController';

const OnboardingFlow = ({ onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        // Basic Info
        fullName: '',
        dateOfBirth: '',
        age: '',
        gender: '',
        height: '',
        weight: '',
        medicalConditions: '',
        
        // Avatar & Identity
        avatarType: '',
        avatarStyle: '',
        coachPersonality: '',
        
        // Fitness Background
        fitnessLevel: '',
        experience: '',
        pastWorkouts: [],
        
        // Goals
        primaryGoal: '',
        secondaryGoals: [],
        targetDate: '',
        focusAreas: [],
        motivation: '',
        
        // Lifestyle
        daysAvailable: '',
        sessionDuration: '',
        workoutEnvironment: '',
        availableEquipment: [],
        preferredTime: '',
        sleepQuality: '',
        stressLevel: '',
        hydrationHabits: ''
    });

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    useEffect(() => {
        // Start onboarding via Yara imperative API if available
        if (yaraRef.current && yaraRef.current.startOnboarding) {
            yaraRef.current.startOnboarding();
        } else {
            // fallback to controller if ref not ready
            emitYaraState({
                message: "Hi! I'm Yara, your personal AI fitness assistant! 🌟 I'm so excited to help you transform your fitness journey. Ready to get started?",
                emotion: 'happy',
                isTyping: true
            });
        }
    }, []);

    const sections = [
        {
            id: 'welcome',
            title: "Welcome Aboard! 🚀",
            icon: <Sparkles />,
            yaraMessage: "Welcome to BodyQ! I'll be your personal AI fitness guide. Let's start with some basic info to get to know you better!",
            questions: [
                {
                    id: 'basicInfo',
                    type: 'profile-card',
                    title: "Tell me about yourself",
                    layout: 'grid',
                    fields: [
                        { 
                            id: 'fullName', 
                            label: 'Your Name', 
                            type: 'text', 
                            placeholder: 'Enter your full name',
                            icon: <User />,
                            required: true,
                            colSpan: 2
                        },
                        { 
                            id: 'dateOfBirth', 
                            label: 'Date of Birth', 
                            type: 'date', 
                            icon: <Calendar />,
                            required: true
                        },
                        { 
                            id: 'age', 
                            label: 'Age', 
                            type: 'number', 
                            placeholder: 'Years',
                            icon: <Calendar />,
                            required: true
                        },
                        { 
                            id: 'gender', 
                            label: 'Gender', 
                            type: 'pill-select',
                            options: ['Female', 'Male', 'Non-binary', 'Prefer not to say'],
                            icon: <Heart />
                        }
                    ]
                },
                {
                    id: 'bodyMetrics',
                    type: 'metrics-card',
                    title: "Your Body Metrics",
                    subtitle: "This helps me calculate your perfect workout intensity",
                    fields: [
                        { 
                            id: 'height', 
                            label: 'Height (cm)', 
                            type: 'range',
                            min: 140,
                            max: 220,
                            icon: <Activity />
                        },
                        { 
                            id: 'weight', 
                            label: 'Weight (kg)', 
                            type: 'range',
                            min: 40,
                            max: 150,
                            icon: <Activity />
                        }
                    ]
                },
                {
                    id: 'medicalConditions',
                    type: 'health-card',
                    title: "Health & Safety First",
                    subtitle: "Any conditions I should know about?",
                    icon: <Shield />,
                    fields: [
                        {
                            id: 'medicalConditions',
                            type: 'smart-textarea',
                            placeholder: "Tell me so I can keep you safe... (or type 'None')",
                            suggestions: ['None', 'Back pain', 'Knee issues', 'Asthma', 'High blood pressure']
                        }
                    ]
                }
            ]
        },
        {
            id: 'personality',
            title: "Your Fitness Identity 🎨",
            icon: <Brain />,
            yaraMessage: "Now for the fun part! Let's create your fitness persona! How should I talk to you?",
            questions: [
                {
                    id: 'coachPersonality',
                    type: 'personality-cards',
                    title: "Choose Your Coach Style",
                    options: [
                        { 
                            value: 'friendly', 
                            label: 'Friendly Motivator', 
                            emoji: '💫',
                            desc: 'Encouraging and supportive, like a friend',
                            color: '#CDF27E',
                            traits: ['Gentle', 'Encouraging', 'Positive']
                        },
                        { 
                            value: 'strict', 
                            label: '🔥 Strict Trainer', 
                            emoji: '⚡',
                            desc: 'No excuses, push harder! Military style',
                            color: '#FF6B6B',
                            traits: ['Disciplined', 'Intense', 'Direct']
                        },
                        { 
                            value: 'calm', 
                            label: '🧘 Calm Guide', 
                            emoji: '🌿',
                            desc: 'Peaceful and mindful approach',
                            color: '#6F4BF2',
                            traits: ['Patient', 'Mindful', 'Balanced']
                        },
                        { 
                            value: 'energetic', 
                            label: '⚡ Energetic Coach', 
                            emoji: '🎉',
                            desc: 'High energy hype person!',
                            color: '#FFA500',
                            traits: ['Enthusiastic', 'High-energy', 'Fun']
                        }
                    ]
                },
                {
                    id: 'avatarStyle',
                    type: 'avatar-creator',
                    title: "Create Your Avatar",
                    subtitle: "This is your fitness twin!",
                    options: [
                        { value: 'upload', label: 'Upload Photo', icon: <Camera /> },
                        { value: 'create', label: 'Custom Avatar', icon: <Award /> }
                    ]
                }
            ]
        },
        {
            id: 'fitness',
            title: "Your Fitness Journey 💪",
            icon: <Zap />,
            yaraMessage: "I want to understand where you're starting from. This helps me challenge you just right!",
            questions: [
                {
                    id: 'fitnessLevel',
                    type: 'level-selector',
                    title: "Current Fitness Level",
                    options: [
                        { 
                            level: 'beginner', 
                            label: '🌱 Beginner', 
                            desc: 'New to fitness or returning after a break',
                            xp: '0-6 months',
                            intensity: 'Low to Medium'
                        },
                        { 
                            level: 'intermediate', 
                            label: '🌿 Intermediate', 
                            desc: 'Work out regularly, know basic exercises',
                            xp: '6 months - 2 years',
                            intensity: 'Medium to High'
                        },
                        { 
                            level: 'advanced', 
                            label: '🔥 Advanced', 
                            desc: 'Experienced, ready for intense challenges',
                            xp: '2+ years',
                            intensity: 'High to Very High'
                        }
                    ]
                },
                {
                    id: 'experience',
                    type: 'experience-timeline',
                    title: "Your Fitness History",
                    fields: [
                        {
                            id: 'pastWorkouts',
                            type: 'multi-select-grid',
                            label: "What have you tried?",
                            options: [
                                { emoji: '🏃', label: 'Running' },
                                { emoji: '🏋️', label: 'Weight Training' },
                                { emoji: '🧘', label: 'Yoga' },
                                { emoji: '💪', label: 'HIIT' },
                                { emoji: '🏊', label: 'Swimming' },
                                { emoji: '🚴', label: 'Cycling' },
                                { emoji: '💃', label: 'Dancing' },
                                { emoji: '🤸', label: 'Calisthenics' }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: 'goals',
            title: "Your Dreams & Goals ✨",
            icon: <Target />,
            yaraMessage: "This is the most important part! What are we working towards?",
            questions: [
                {
                    id: 'primaryGoal',
                    type: 'goal-wheel',
                    title: "What's your main goal?",
                    options: [
                        { 
                            value: 'lose weight', 
                            label: 'Lose Weight', 
                            emoji: '🔥',
                            desc: 'Burn fat, get lean',
                            color: '#FF6B6B'
                        },
                        { 
                            value: 'gain muscle', 
                            label: 'Gain Muscle', 
                            emoji: '💪',
                            desc: 'Build strength and size',
                            color: '#6F4BF2'
                        },
                        { 
                            value: 'stay fit', 
                            label: 'Stay Fit', 
                            emoji: '✨',
                            desc: 'Maintain current fitness',
                            color: '#CDF27E'
                        },
                        { 
                            value: 'improve health', 
                            label: 'Improve Health', 
                            emoji: '❤️',
                            desc: 'Better overall wellness',
                            color: '#FFA500'
                        }
                    ]
                },
                {
                    id: 'focusAreas',
                    type: 'body-focus',
                    title: "Target Areas",
                    subtitle: "Select areas to focus on",
                    bodyParts: [
                        { id: 'arms', label: '💪 Arms', category: 'upper' },
                        { id: 'chest', label: '🏋️ Chest', category: 'upper' },
                        { id: 'back', label: '🔙 Back', category: 'upper' },
                        { id: 'abs', label: '🔥 Abs', category: 'core' },
                        { id: 'legs', label: '🦵 Legs', category: 'lower' },
                        { id: 'glutes', label: '🍑 Glutes', category: 'lower' },
                        { id: 'fullBody', label: '👤 Full Body', category: 'full' }
                    ]
                },
                {
                    id: 'motivation',
                    type: 'motivation-board',
                    title: "What drives you?",
                    options: [
                        { value: 'results', label: 'Seeing Results', emoji: '📈', icon: '📊' },
                        { value: 'fun', label: 'Having Fun', emoji: '🎮', icon: '🎯' },
                        { value: 'competition', label: 'Competition', emoji: '🏆', icon: '⚔️' },
                        { value: 'health', label: 'Better Health', emoji: '🌿', icon: '❤️' },
                        { value: 'confidence', label: 'Confidence', emoji: '🦋', icon: '✨' },
                        { value: 'stress', label: 'Stress Relief', emoji: '🧘', icon: '🌊' }
                    ]
                }
            ]
        },
        {
            id: 'lifestyle',
            title: "Your Lifestyle ⏰",
            icon: <Clock />,
            yaraMessage: "Let's make this fit YOUR life! Tell me about your routine...",
            questions: [
                {
                    id: 'schedule',
                    type: 'schedule-builder',
                    title: "Your Weekly Schedule",
                    fields: [
                        {
                            id: 'daysAvailable',
                            type: 'day-picker',
                            label: "Available days",
                            options: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                        },
                        {
                            id: 'sessionDuration',
                            type: 'duration-slider',
                            label: "Session length",
                            min: 15,
                            max: 90,
                            step: 15,
                            marks: ['15 min', '30 min', '45 min', '60 min', '75 min', '90 min']
                        }
                    ]
                },
                {
                    id: 'environment',
                    type: 'environment-selector',
                    title: "Your Training Environment",
                    options: [
                        { 
                            value: 'home', 
                            label: '🏠 Home', 
                            desc: 'Privacy & convenience',
                            equipment: ['Basic', 'Bodyweight']
                        },
                        { 
                            value: 'gym', 
                            label: '🏋️ Gym', 
                            desc: 'Full equipment access',
                            equipment: ['Full Gym']
                        },
                        { 
                            value: 'outdoor', 
                            label: '🌳 Outdoor', 
                            desc: 'Fresh air fitness',
                            equipment: ['Minimal']
                        },
                        { 
                            value: 'mixed', 
                            label: '🔄 Mixed', 
                            desc: 'Combination of locations',
                            equipment: ['Varied']
                        }
                    ]
                },
                {
                    id: 'equipment',
                    type: 'equipment-grid',
                    title: "Available Equipment",
                    options: [
                        { emoji: '🆓', label: 'No Equipment' },
                        { emoji: '🏋️', label: 'Dumbbells' },
                        { emoji: '⚡', label: 'Resistance Bands' },
                        { emoji: '🔧', label: 'Pull-up Bar' },
                        { emoji: '🏋️‍♂️', label: 'Kettlebell' },
                        { emoji: '🏛️', label: 'Full Gym Access' },
                        { emoji: '🧘', label: 'Yoga Mat' },
                        { emoji: '🔄', label: 'TRX' }
                    ]
                },
                {
                    id: 'wellness',
                    type: 'wellness-check',
                    title: "Wellness Check",
                    fields: [
                        {
                            id: 'sleepQuality',
                            type: 'rating',
                            label: 'Sleep Quality',
                            emoji: '😴',
                            options: ['Poor', 'Fair', 'Good', 'Great']
                        },
                        {
                            id: 'stressLevel',
                            type: 'rating',
                            label: 'Stress Level',
                            emoji: '🌊',
                            options: ['Low', 'Moderate', 'High', 'Very High']
                        },
                        {
                            id: 'hydrationHabits',
                            type: 'rating',
                            label: 'Hydration',
                            emoji: '💧',
                            options: ['Poor', 'Fair', 'Good', 'Great']
                        }
                    ]
                }
            ]
        }
    ];

    useEffect(() => {
        // Yara speaks when section changes
        const timer = setTimeout(() => {
            emitYaraState({
                message: sections[currentStep].yaraMessage,
                emotion: 'happy',
                isTyping: true
            });
            
            setTimeout(() => {
                emitYaraState({ isTyping: false });
            }, sections[currentStep].yaraMessage.length * 30);
        }, 500);
        
        return () => clearTimeout(timer);
    }, [currentStep]);

    const handleNext = (answers) => {
        const updatedForm = { ...formData, ...answers };
        setFormData(updatedForm);

        // Let Yara respond to this answer via imperative API when available
        if (yaraRef.current && yaraRef.current.questionAnswered) {
            const questionId = sections[currentStep].questions[currentQuestionIndex]?.id;
            if (questionId && answers) {
                yaraRef.current.questionAnswered(questionId, answers, updatedForm);
            }
        }

        const questionsInSection = sections[currentStep].questions.length;
        if (currentQuestionIndex < questionsInSection - 1) {
            // advance to next question in same section
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            return;
        }

        // reset question index for next section
        setCurrentQuestionIndex(0);

        if (currentStep < sections.length - 1) {
            emitYaraState({
                message: "Great progress! Let's continue... 🎉",
                emotion: 'excited',
                isTyping: true
            });

            setTimeout(() => {
                setCurrentStep(currentStep + 1);
            }, 1500);
        } else {
            // Complete onboarding using Yara API if available
            if (yaraRef.current && yaraRef.current.completeOnboarding) {
                yaraRef.current.completeOnboarding(updatedForm);
            } else {
                emitYaraState({
                    message: "AMAZING! 🎉 I've got everything I need! Creating your personalized plan now...",
                    emotion: 'proud',
                    isTyping: true
                });
            }

            setTimeout(() => {
                console.log("🎉 FINAL ONBOARDING DATA:", updatedForm);
                onClose();
            }, 8000); // Give Yara time to speak
        }
    };

    const renderQuestion = (question) => {
        switch (question.type) {
            case 'profile-card':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={styles.profileCard}
                    >
                        <div style={styles.cardHeader}>
                            <h3>{question.title}</h3>
                        </div>
                        <div style={styles.grid2}>
                            {question.fields.map(field => (
                                <div key={field.id} style={field.colSpan === 2 ? styles.fullWidth : {}}>
                                    <label style={styles.fieldLabel}>
                                        <span style={styles.fieldIcon}>{field.icon}</span>
                                        {field.label}
                                    </label>
                                    {field.type === 'pill-select' ? (
                                        <div style={styles.pillGroup}>
                                            {field.options.map(opt => (
                                                <motion.button
                                                    key={opt}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setFormData({ ...formData, [field.id]: opt })}
                                                    style={{
                                                        ...styles.pill,
                                                        background: formData[field.id] === opt ? 'linear-gradient(135deg, #6F4BF2, #A38DF2)' : 'rgba(255,255,255,0.05)'
                                                    }}
                                                >
                                                    {opt}
                                                </motion.button>
                                            ))}
                                        </div>
                                    ) : (
                                        <input
                                            type={field.type}
                                            placeholder={field.placeholder}
                                            value={formData[field.id] || ''}
                                            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                                            style={styles.input}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                );

            case 'metrics-card':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={styles.metricsCard}
                    >
                        <h3>{question.title}</h3>
                        <p style={styles.subtitle}>{question.subtitle}</p>
                        <div style={styles.metricsContainer}>
                            {question.fields.map(field => (
                                <div key={field.id} style={styles.metricItem}>
                                    <div style={styles.metricHeader}>
                                        <span style={styles.metricIcon}>{field.icon}</span>
                                        <span>{field.label}</span>
                                        <span style={styles.metricValue}>
                                            {formData[field.id] || field.min}
                                            {field.id === 'height' ? 'cm' : 'kg'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={field.min}
                                        max={field.max}
                                        value={formData[field.id] || field.min}
                                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                                        style={styles.rangeInput}
                                    />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                );

            case 'health-card':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={styles.healthCard}
                    >
                        <div style={styles.healthHeader}>
                            <span style={styles.healthIcon}>{question.icon}</span>
                            <div>
                                <h3>{question.title}</h3>
                                <p style={styles.subtitle}>{question.subtitle}</p>
                            </div>
                        </div>
                        <div style={styles.suggestionChips}>
                            {question.fields[0].suggestions.map(suggestion => (
                                <motion.button
                                    key={suggestion}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setFormData({ ...formData, medicalConditions: suggestion })}
                                    style={{
                                        ...styles.chip,
                                        background: formData.medicalConditions === suggestion ? '#6F4BF2' : 'rgba(255,255,255,0.05)'
                                    }}
                                >
                                    {suggestion}
                                </motion.button>
                            ))}
                        </div>
                        <textarea
                            placeholder={question.fields[0].placeholder}
                            value={formData.medicalConditions}
                            onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                            style={styles.textarea}
                            rows={3}
                        />
                    </motion.div>
                );

            case 'personality-cards':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={styles.personalityGrid}
                    >
                        {question.options.map(coach => (
                            <motion.button
                                key={coach.value}
                                whileHover={{ scale: 1.05, y: -5 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setFormData({ ...formData, coachPersonality: coach.value })}
                                style={{
                                    ...styles.personalityCard,
                                    borderColor: formData.coachPersonality === coach.value ? coach.color : 'rgba(255,255,255,0.1)',
                                    background: formData.coachPersonality === coach.value ? `${coach.color}20` : 'rgba(255,255,255,0.05)'
                                }}
                            >
                                <span style={{ fontSize: '48px', marginBottom: '10px' }}>{coach.emoji}</span>
                                <h3 style={{ color: coach.color }}>{coach.label}</h3>
                                <p style={styles.coachDesc}>{coach.desc}</p>
                                <div style={styles.traitContainer}>
                                    {coach.traits.map(trait => (
                                        <span key={trait} style={styles.trait}>{trait}</span>
                                    ))}
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>
                );

            case 'level-selector':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={styles.levelContainer}
                    >
                        {question.options.map(level => (
                            <motion.button
                                key={level.level}
                                whileHover={{ scale: 1.02, x: 10 }}
                                onClick={() => setFormData({ ...formData, fitnessLevel: level.level })}
                                style={{
                                    ...styles.levelCard,
                                    borderColor: formData.fitnessLevel === level.level ? '#6F4BF2' : 'rgba(255,255,255,0.1)'
                                }}
                            >
                                <div style={styles.levelHeader}>
                                    <h3>{level.label}</h3>
                                    <div style={styles.levelBadges}>
                                        <span style={styles.xpBadge}>{level.xp}</span>
                                        <span style={styles.intensityBadge}>{level.intensity}</span>
                                    </div>
                                </div>
                                <p>{level.desc}</p>
                            </motion.button>
                        ))}
                    </motion.div>
                );

            case 'goal-wheel':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={styles.goalWheel}
                    >
                        {question.options.map(goal => (
                            <motion.button
                                key={goal.value}
                                whileHover={{ scale: 1.05, rotate: 1 }}
                                onClick={() => setFormData({ ...formData, primaryGoal: goal.value })}
                                style={{
                                    ...styles.goalCard,
                                    background: formData.primaryGoal === goal.value ? `linear-gradient(135deg, ${goal.color}, ${goal.color}80)` : 'rgba(255,255,255,0.05)'
                                }}
                            >
                                <span style={styles.goalEmoji}>{goal.emoji}</span>
                                <h3>{goal.label}</h3>
                                <p>{goal.desc}</p>
                            </motion.button>
                        ))}
                    </motion.div>
                );

            case 'body-focus':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={styles.bodyFocusContainer}
                    >
                        <div style={styles.bodyMap}>
                            <div style={styles.bodySection}>
                                <h4>Upper Body</h4>
                                <div style={styles.bodyPartGrid}>
                                    {question.bodyParts.filter(p => p.category === 'upper').map(part => (
                                        <motion.button
                                            key={part.id}
                                            whileHover={{ scale: 1.05 }}
                                            onClick={() => {
                                                const current = formData.focusAreas || [];
                                                const updated = current.includes(part.id)
                                                    ? current.filter(i => i !== part.id)
                                                    : [...current, part.id];
                                                setFormData({ ...formData, focusAreas: updated });
                                            }}
                                            style={{
                                                ...styles.bodyPart,
                                                background: formData.focusAreas?.includes(part.id) ? '#6F4BF2' : 'rgba(255,255,255,0.05)'
                                            }}
                                        >
                                            {part.label}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                            {/* Similar for core, lower, full body */}
                        </div>
                    </motion.div>
                );

            case 'schedule-builder':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={styles.scheduleBuilder}
                    >
                        <div style={styles.dayPicker}>
                            <h4>Available Days</h4>
                            <div style={styles.dayGrid}>
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <motion.button
                                        key={day}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            // Toggle day selection
                                        }}
                                        style={styles.dayButton}
                                    >
                                        {day}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                        <div style={styles.durationSlider}>
                            <h4>Session Length</h4>
                            <input
                                type="range"
                                min="15"
                                max="90"
                                step="15"
                                value={formData.sessionDuration || 45}
                                onChange={(e) => setFormData({ ...formData, sessionDuration: e.target.value })}
                                style={styles.slider}
                            />
                            <div style={styles.sliderLabels}>
                                <span>15 min</span>
                                <span>30</span>
                                <span>45</span>
                                <span>60</span>
                                <span>75</span>
                                <span>90 min</span>
                            </div>
                        </div>
                    </motion.div>
                );

            default:
                return null;
        }
    };

    const progress = ((currentStep + 1) / sections.length) * 100;

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={styles.overlay}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={styles.modal}
                >
                    {/* Progress Bar */}
                    <div style={styles.progressContainer}>
                        <motion.div 
                            style={styles.progressBar}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                        <div style={styles.stepsIndicator}>
                            {sections.map((section, index) => (
                                <motion.div
                                    key={section.id}
                                    animate={{
                                        scale: index === currentStep ? 1.2 : 1,
                                        backgroundColor: index <= currentStep ? '#6F4BF2' : 'rgba(255,255,255,0.2)'
                                    }}
                                    style={styles.stepDot}
                                />
                            ))}
                        </div>
                        <div style={styles.sectionTitle}>
                            <span style={styles.sectionIcon}>{sections[currentStep].icon}</span>
                            <h3>{sections[currentStep].title}</h3>
                        </div>
                    </div>

                    {/* Questions */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                            style={styles.questionsContainer}
                        >
                            {sections[currentStep].questions.map((question, index) => (
                                <div key={question.id}>
                                    {renderQuestion(question)}
                                </div>
                            ))}

                            {/* Navigation Buttons */}
                            <div style={styles.navButtons}>
                                {currentStep > 0 && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setCurrentStep(currentStep - 1)}
                                        style={styles.navButtonSecondary}
                                    >
                                        <ArrowLeft size={20} /> Previous
                                    </motion.button>
                                )}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleNext({})}
                                    style={styles.navButtonPrimary}
                                >
                                    {currentStep === sections.length - 1 ? 'Complete' : 'Continue'} 
                                    <ArrowRight size={20} />
                                </motion.button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </motion.div>

            {/* Yara Assistant */}
            <YaraAssistant />
        </>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(10px)',
        zIndex: 2000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
    },
    modal: {
        background: '#1A1330',
        border: '2px solid #6F4BF2',
        borderRadius: '32px',
        padding: '40px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(111, 75, 242, 0.3)'
    },
    progressContainer: {
        marginBottom: '40px'
    },
    progressBar: {
        height: '4px',
        background: 'linear-gradient(90deg, #6F4BF2, #CDF27E)',
        borderRadius: '2px',
        marginBottom: '15px'
    },
    stepsIndicator: {
        display: 'flex',
        gap: '8px',
        marginBottom: '15px'
    },
    stepDot: {
        width: '8px',
        height: '8px',
        borderRadius: '4px',
        transition: 'all 0.3s ease'
    },
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: 'white'
    },
    sectionIcon: {
        color: '#CDF27E'
    },
    questionsContainer: {
        minHeight: '400px'
    },
    profileCard: {
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '24px',
        padding: '30px',
        marginBottom: '20px'
    },
    cardHeader: {
        marginBottom: '20px'
    },
    grid2: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
    },
    fullWidth: {
        gridColumn: 'span 2'
    },
    fieldLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#CDF27E',
        marginBottom: '8px',
        fontSize: '14px'
    },
    fieldIcon: {
        fontSize: '16px'
    },
    input: {
        width: '100%',
        padding: '14px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        color: 'white',
        fontSize: '16px',
        outline: 'none'
    },
    pillGroup: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
    },
    pill: {
        padding: '10px 20px',
        borderRadius: '30px',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'white',
        cursor: 'pointer',
        fontSize: '14px'
    },
    metricsCard: {
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '24px',
        padding: '30px',
        marginBottom: '20px'
    },
    subtitle: {
        color: '#A38DF2',
        fontSize: '14px',
        marginBottom: '20px'
    },
    metricsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    metricItem: {
        width: '100%'
    },
    metricHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '10px',
        color: 'white'
    },
    metricIcon: {
        color: '#CDF27E'
    },
    metricValue: {
        marginLeft: 'auto',
        color: '#CDF27E',
        fontWeight: 'bold'
    },
    rangeInput: {
        width: '100%',
        height: '6px',
        borderRadius: '3px',
        background: 'linear-gradient(90deg, #6F4BF2, #CDF27E)',
        outline: 'none'
    },
    healthCard: {
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '24px',
        padding: '30px',
        marginBottom: '20px'
    },
    healthHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '20px'
    },
    healthIcon: {
        fontSize: '32px',
        color: '#CDF27E'
    },
    suggestionChips: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        marginBottom: '20px'
    },
    chip: {
        padding: '8px 16px',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'white',
        cursor: 'pointer',
        fontSize: '13px'
    },
    textarea: {
        width: '100%',
        padding: '14px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        color: 'white',
        fontSize: '16px',
        resize: 'vertical',
        outline: 'none'
    },
    personalityGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '20px'
    },
    personalityCard: {
        padding: '25px',
        background: 'rgba(255,255,255,0.03)',
        border: '2px solid',
        borderRadius: '20px',
        color: 'white',
        cursor: 'pointer',
        textAlign: 'center'
    },
    coachDesc: {
        fontSize: '14px',
        color: 'rgba(255,255,255,0.7)',
        margin: '10px 0'
    },
    traitContainer: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        flexWrap: 'wrap'
    },
    trait: {
        fontSize: '12px',
        padding: '4px 8px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '12px',
        color: 'rgba(255,255,255,0.8)'
    },
    levelContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        marginBottom: '20px'
    },
    levelCard: {
        padding: '20px',
        background: 'rgba(255,255,255,0.03)',
        border: '2px solid',
        borderRadius: '16px',
        color: 'white',
        cursor: 'pointer',
        textAlign: 'left'
    },
    levelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
    },
    levelBadges: {
        display: 'flex',
        gap: '10px'
    },
    xpBadge: {
        padding: '4px 8px',
        background: 'rgba(111, 75, 242, 0.2)',
        borderRadius: '12px',
        fontSize: '12px'
    },
    intensityBadge: {
        padding: '4px 8px',
        background: 'rgba(205, 242, 126, 0.2)',
        borderRadius: '12px',
        fontSize: '12px'
    },
    goalWheel: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px',
        marginBottom: '20px'
    },
    goalCard: {
        padding: '20px',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'white',
        cursor: 'pointer',
        textAlign: 'center'
    },
    goalEmoji: {
        fontSize: '32px',
        display: 'block',
        marginBottom: '10px'
    },
    bodyFocusContainer: {
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '24px',
        padding: '30px',
        marginBottom: '20px'
    },
    bodyMap: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    bodySection: {
        marginBottom: '15px'
    },
    bodyPartGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginTop: '10px'
    },
    bodyPart: {
        padding: '12px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        color: 'white',
        cursor: 'pointer',
        fontSize: '14px'
    },
    scheduleBuilder: {
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '24px',
        padding: '30px',
        marginBottom: '20px'
    },
    dayPicker: {
        marginBottom: '30px'
    },
    dayGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '10px',
        marginTop: '10px'
    },
    dayButton: {
        padding: '12px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        color: 'white',
        cursor: 'pointer',
        fontSize: '14px'
    },
    durationSlider: {
        marginTop: '20px'
    },
    slider: {
        width: '100%',
        margin: '15px 0'
    },
    sliderLabels: {
        display: 'flex',
        justifyContent: 'space-between',
        color: 'rgba(255,255,255,0.5)',
        fontSize: '12px'
    },
    navButtons: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '30px',
        gap: '15px'
    },
    navButtonPrimary: {
        flex: 2,
        padding: '16px',
        background: 'linear-gradient(135deg, #6F4BF2, #A38DF2)',
        border: 'none',
        borderRadius: '50px',
        color: 'white',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
    },
    navButtonSecondary: {
        flex: 1,
        padding: '16px',
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '50px',
        color: 'white',
        fontSize: '16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
    }
};

export default OnboardingFlow;