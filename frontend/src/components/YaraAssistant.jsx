import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribe as subscribeYara } from '../yaraController';

// Imperative API ref exported for other components

const YaraAssistant = ({ 
    // Props for external control
    externalMessage = null,
    externalEmotion = null,
    externalCoachStyle = null,
    externalTyping = null,
    externalDownloadPrompt = null,
    
    // Callbacks
    onMessageComplete,
    onActionClick,
    
    // Auto mode - for internal state management
    autoMode = true
}) => {
    // Internal state (used when autoMode is true)
    const [internalState, setInternalState] = useState({
        message: "Hi! I'm Yara, your personal AI fitness assistant! 🌟 Ready to start your journey?",
        emotion: 'happy',
        coachStyle: 'motivational',
        isTyping: false,
        showDownloadPrompt: false,
        onboardingComplete: false,
        userName: '',
        userGoal: '',
        workoutReadiness: 0
    });

    // Use either external props or internal state
    const message = externalMessage !== null ? externalMessage : internalState.message;
    const emotion = externalEmotion !== null ? externalEmotion : internalState.emotion;
    const coachStyle = externalCoachStyle !== null ? externalCoachStyle : internalState.coachStyle;
    const isTyping = externalTyping !== null ? externalTyping : internalState.isTyping;
    const showDownloadPrompt = externalDownloadPrompt !== null ? externalDownloadPrompt : internalState.showDownloadPrompt;

    const [displayMessage, setDisplayMessage] = useState('');
    const [pulseEnergy, setPulseEnergy] = useState(1);
    const [isListening, setIsListening] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [messageQueue, setMessageQueue] = useState([]);
    const messageRef = useRef(null);

    // Coach personalities with unique traits
    const coachPersonalities = {
        motivational: {
            name: 'YARA',
            title: '🔥 MOTIVATIONAL COACH',
            badgeColor: '#CDF27E',
            accentColor: '#6F4BF2',
            voiceTone: 'energetic',
            catchphrases: ['YOU GOT THIS!', 'LETS GO!', 'CRUSH IT!', 'BELIEVE!'],
            animationIntensity: 1.2,
            greeting: "Hey champ! Ready to transform? 💪",
            style: 'motivational'
        },
        strict: {
            name: 'COACH YARA',
            title: '⚡ STRICT TRAINER',
            badgeColor: '#FF3B3B',
            accentColor: '#FF6B6B',
            voiceTone: 'powerful',
            catchphrases: ['NO EXCUSES!', 'PUSH HARDER!', 'ONE MORE!', 'EARN IT!'],
            animationIntensity: 1.4,
            greeting: "No days off. You ready to work? 🔥",
            style: 'strict'
        },
        calm: {
            name: 'YARA',
            title: '🧘 MINDFUL GUIDE',
            badgeColor: '#6F4BF2',
            accentColor: '#A38DF2',
            voiceTone: 'calm',
            catchphrases: ['Breathe...', 'You got this', 'Stay present', 'Progress'],
            animationIntensity: 0.8,
            greeting: "Let's begin this journey mindfully 🌿",
            style: 'calm'
        },
        energetic: {
            name: 'YARA',
            title: '🎉 ENERGY COACH',
            badgeColor: '#FFA500',
            accentColor: '#FFB52E',
            voiceTone: 'hyped',
            catchphrases: ['LETS GOOO!', 'WOOO!', 'AMAZING!', 'ENERGY!'],
            animationIntensity: 1.5,
            greeting: "GET READY! We're about to have FUN! 🎉",
            style: 'energetic'
        }
    };

    // Emotion animations (Rive-like 2D effects)
    const emotions = {
        neutral: {
            eyes: '👀',
            mouth: '👄',
            pose: '🏃',
            bgGradient: 'linear-gradient(145deg, #6F4BF2, #8A6DF2)',
            animation: {
                scale: [1, 1.02, 1],
                rotate: [0, 1, -1, 0],
                transition: { duration: 3, repeat: Infinity }
            }
        },
        happy: {
            eyes: '😊',
            mouth: '😄',
            pose: '🤸',
            bgGradient: 'linear-gradient(145deg, #CDF27E, #A0E05E)',
            animation: {
                y: [0, -5, 0],
                rotate: [0, 2, -2, 0],
                transition: { duration: 2, repeat: Infinity }
            }
        },
        excited: {
            eyes: '🤩',
            mouth: '😮',
            pose: '🏋️',
            bgGradient: 'linear-gradient(145deg, #FFA500, #FFB52E)',
            animation: {
                scale: [1, 1.15, 1],
                rotate: [0, 5, -5, 0],
                transition: { duration: 0.8, repeat: Infinity }
            }
        },
        thinking: {
            eyes: '🤔',
            mouth: '💭',
            pose: '🧘',
            bgGradient: 'linear-gradient(145deg, #A38DF2, #B69EF5)',
            animation: {
                rotate: [0, -5, 5, -5, 0],
                transition: { duration: 4, repeat: Infinity }
            }
        },
        encouraging: {
            eyes: '💪',
            mouth: '😤',
            pose: '🏆',
            bgGradient: 'linear-gradient(145deg, #FF6B6B, #FF8A8A)',
            animation: {
                scale: [1, 1.05, 1],
                y: [0, -3, 0],
                transition: { duration: 1.2, repeat: Infinity }
            }
        },
        proud: {
            eyes: '🥹',
            mouth: '✨',
            pose: '🌟',
            bgGradient: 'linear-gradient(145deg, #FFD700, #FFE55C)',
            animation: {
                y: [0, -2, 0],
                rotate: [0, 1, -1, 0],
                transition: { duration: 3, repeat: Infinity }
            }
        },
        celebrating: {
            eyes: '🎉',
            mouth: '🥳',
            pose: '🎊',
            bgGradient: 'linear-gradient(145deg, #CDF27E, #FFD700)',
            animation: {
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
                transition: { duration: 0.5, repeat: 5 }
            }
        },
        hyped: {
            eyes: '⚡',
            mouth: '🔥',
            pose: '💫',
            bgGradient: 'linear-gradient(145deg, #FF4500, #FFA500)',
            animation: {
                scale: [1, 1.3, 1],
                rotate: [0, 15, -15, 0],
                transition: { duration: 0.4, repeat: 3 }
            }
        },
        listening: {
            eyes: '👂',
            mouth: '🎧',
            pose: '🎵',
            bgGradient: 'linear-gradient(145deg, #50C878, #7DD181)',
            animation: {
                rotate: [0, 10, -10, 0],
                transition: { duration: 2, repeat: Infinity }
            }
        }
    };

    const currentPersonality = coachPersonalities[coachStyle] || coachPersonalities.motivational;
    const currentEmotion = emotions[emotion] || emotions.neutral;

    // Message queue system for natural conversation
    useEffect(() => {
        if (message && isTyping) {
            setDisplayMessage('');
            let i = 0;
            const typingInterval = setInterval(() => {
                if (i < message.length) {
                    setDisplayMessage(prev => prev + message.charAt(i));
                    i++;
                } else {
                    clearInterval(typingInterval);
                    if (onMessageComplete) onMessageComplete();
                    
                    // Auto-advance message queue
                    if (messageQueue.length > 0) {
                        setTimeout(() => {
                            const nextMessage = messageQueue[0];
                            setMessageQueue(prev => prev.slice(1));
                            setInternalState(prev => ({
                                ...prev,
                                message: nextMessage.text,
                                emotion: nextMessage.emotion || prev.emotion,
                                isTyping: true
                            }));
                        }, 1000);
                    }
                }
            }, 30);
            return () => clearInterval(typingInterval);
        } else {
            setDisplayMessage(message);
        }
    }, [message, isTyping, messageQueue]);

    // Energy pulse effect
    useEffect(() => {
        const interval = setInterval(() => {
            setPulseEnergy(prev => prev === 1 ? 1.1 : 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // PUBLIC METHODS - For external control (to be called from onboarding)
    const yaraAPI = {
        // Initialize onboarding
        startOnboarding: (userName = '') => {
            setInternalState(prev => ({
                ...prev,
                userName,
                isTyping: true,
                emotion: 'happy'
            }));
            
            setMessageQueue([
                {
                    text: userName 
                        ? `Hey ${userName}! 🎉 I'm so excited to meet you! I'm Yara, your personal AI fitness coach.`
                        : "Hey there! 🎉 I'm Yara, your personal AI fitness coach!",
                    emotion: 'happy'
                },
                {
                    text: "I'm going to ask you a few questions to create your PERFECT personalized workout plan!",
                    emotion: 'excited'
                },
                {
                    text: "Ready to transform your fitness? Let's do this! 💪",
                    emotion: 'encouraging'
                }
            ]);
        },

        // Handle question answered
        questionAnswered: (questionId, answer, userData) => {
            const { userName, primaryGoal, fitnessLevel } = userData;
            
            // Update internal state with user data
            setInternalState(prev => ({
                ...prev,
                userName: userName || prev.userName,
                userGoal: primaryGoal || prev.userGoal,
                workoutReadiness: fitnessLevel === 'advanced' ? 100 : fitnessLevel === 'intermediate' ? 60 : 30
            }));

            // Dynamic responses based on answers
            const responses = {
                name: {
                    text: `Great to meet you, ${answer}! 🌟 That's a strong name for a future athlete!`,
                    emotion: 'happy'
                },
                goal: {
                    'lose weight': {
                        text: "🔥 Awesome! Let's torch those calories and reveal the lean you! I've got the perfect fat-burning plan!",
                        emotion: 'excited'
                    },
                    'gain muscle': {
                        text: "💪 YES! Time to build that muscle! We're going to get you SWOLE (in a healthy way)!",
                        emotion: 'encouraging'
                    },
                    'stay fit': {
                        text: "✨ Perfect! Maintenance is key to long-term success. I'll keep you on track!",
                        emotion: 'happy'
                    },
                    'improve health': {
                        text: "❤️ Love this! Health first, always. I'll make sure every workout nourishes your body!",
                        emotion: 'proud'
                    }
                },
                fitnessLevel: {
                    beginner: {
                        text: "🌱 Every master was once a beginner! I'm so proud of you for starting. We'll go at YOUR pace!",
                        emotion: 'encouraging'
                    },
                    intermediate: {
                        text: "🌿 Nice! You've got foundation. Now let's build on it and break through plateaus!",
                        emotion: 'excited'
                    },
                    advanced: {
                        text: "🔥 OH YEAH! Advanced athlete! I'm going to PUSH you to new limits! Ready?",
                        emotion: 'hyped'
                    }
                },
                coachStyle: {
                    motivational: {
                        text: "🎯 Perfect choice! I'll be your biggest cheerleader! Let's get those gains!",
                        emotion: 'happy'
                    },
                    strict: {
                        text: "⚡ STRICT MODE ACTIVATED! No excuses, just results! You asked for it!",
                        emotion: 'encouraging'
                    },
                    calm: {
                        text: "🧘 Peaceful and mindful. I love it! We'll build strength with intention.",
                        emotion: 'neutral'
                    },
                    energetic: {
                        text: "🎉 LET'S GOOO! HIGH ENERGY MODE! This is going to be FUN!",
                        emotion: 'excited'
                    }
                }
            };

            // Find the appropriate response
            let responseText = "Thanks! Let's keep going! 🎯";
            let responseEmotion = 'happy';

            if (questionId === 'fullName' && responses.name) {
                responseText = responses.name.text;
            } else if (questionId === 'primaryGoal' && responses.goal[answer]) {
                responseText = responses.goal[answer].text;
                responseEmotion = responses.goal[answer].emotion;
            } else if (questionId === 'fitnessLevel' && responses.fitnessLevel[answer]) {
                responseText = responses.fitnessLevel[answer].text;
                responseEmotion = responses.fitnessLevel[answer].emotion;
            } else if (questionId === 'coachPersonality' && responses.coachStyle[answer]) {
                responseText = responses.coachStyle[answer].text;
                responseEmotion = responses.coachStyle[answer].emotion;
                // Update coach style
                setInternalState(prev => ({ ...prev, coachStyle: answer }));
            }

            // Queue the response
            setMessageQueue([{ text: responseText, emotion: responseEmotion }]);
        },

        // Onboarding complete
        completeOnboarding: (userData) => {
            const { fullName, primaryGoal, coachPersonality } = userData;
            
            setInternalState(prev => ({
                ...prev,
                onboardingComplete: true,
                userName: fullName || prev.userName,
                userGoal: primaryGoal || prev.userGoal,
                coachStyle: coachPersonality || prev.coachStyle,
                showDownloadPrompt: true
            }));

            setMessageQueue([
                {
                    text: `🎉🎉🎉 AMAZING WORK ${fullName?.toUpperCase()}! 🎉🎉🎉`,
                    emotion: 'celebrating'
                },
                {
                    text: `I've analyzed EVERYTHING and created your PERFECT ${primaryGoal?.toUpperCase()} workout plan!`,
                    emotion: 'excited'
                },
                {
                    text: "This plan is 100% tailored to YOU - your goals, your schedule, your equipment!",
                    emotion: 'proud'
                },
                {
                    text: "📱 NOW for the BEST part! Download our mobile app to access your workouts ANYWHERE!",
                    emotion: 'hyped'
                },
                {
                    text: "Track progress, get reminders, and I'll be with you every step of the way!",
                    emotion: 'encouraging'
                },
                {
                    text: "Ready to start your transformation? Download now and let's CRUSH IT! 🔥",
                    emotion: 'excited'
                }
            ]);
        },

        // Achievement unlocked
        achievementUnlocked: (achievement) => {
            const achievements = {
                firstWorkout: {
                    text: "FIRST WORKOUT COMPLETE! 🎉 That's step one on your journey! Proud of you!",
                    emotion: 'proud'
                },
                weekStreak: {
                    text: "7 DAY STREAK! 🔥 You're UNSTOPPABLE! This is how legends are made!",
                    emotion: 'hyped'
                },
                monthStreak: {
                    text: "30 DAYS! 🏆 LEGEND STATUS UNLOCKED! You've transformed!",
                    emotion: 'celebrating'
                },
                weightGoal: {
                    text: "🎯 YOU HIT YOUR WEIGHT GOAL! This is HUGE! Celebrate this win!",
                    emotion: 'celebrating'
                },
                prAchieved: {
                    text: "NEW PERSONAL RECORD! 💪 That's my athlete! Keep pushing!",
                    emotion: 'excited'
                }
            };

            const ach = achievements[achievement] || {
                text: "ACHIEVEMENT UNLOCKED! 🏆 You're crushing it!",
                emotion: 'excited'
            };

            setMessageQueue([ach]);
        },

        // Motivational message
        sendMotivation: (type) => {
            const messages = {
                morning: "Good morning, champion! 🌅 Today's another chance to get better!",
                evening: "Killed it today? Great! Tomorrow we go even harder! 💪",
                missedWorkout: "Hey! Missed you yesterday. Let's get back on track TODAY! 🔥",
                plateau: "Hitting a plateau? That's just your body asking for MORE! Let's switch it up!",
                tired: "Feeling tired? That's how progress feels! One more rep, you GOT THIS!",
                sore: "Soreness = gains! Rest up, but don't stop moving! 🧘"
            };

            setMessageQueue([{
                text: messages[type] || "You're doing AMAZING! Keep going! 🔥",
                emotion: 'encouraging'
            }]);
        },

        // Download app reminder
        promptDownload: () => {
            setInternalState(prev => ({ ...prev, showDownloadPrompt: true }));
            setMessageQueue([
                {
                    text: "📱 Don't forget to download our app! Take your workouts anywhere!",
                    emotion: 'happy'
                },
                {
                    text: "Track progress, join challenges, and never miss a workout!",
                    emotion: 'excited'
                }
            ]);
        },

        // Clear state
        reset: () => {
            setInternalState({
                message: "Hi! I'm Yara, your personal AI fitness assistant! 🌟 Ready to start your journey?",
                emotion: 'happy',
                coachStyle: 'motivational',
                isTyping: false,
                showDownloadPrompt: false,
                onboardingComplete: false,
                userName: '',
                userGoal: '',
                workoutReadiness: 0
            });
            setMessageQueue([]);
        },

        // Get current state (for debugging)
        getState: () => internalState
    };

    // Expose API via exported yaraRef and subscribe to controller
    React.useEffect(() => {
        yaraRef.current = yaraAPI;
        const unsub = subscribeYara((state) => {
            setInternalState(prev => ({ ...prev, ...state }));
        });

        return () => {
            yaraRef.current = null;
            unsub();
        };
    }, []);

    // Handle download button clicks
    const handleDownload = (platform) => {
        if (onActionClick) {
            onActionClick('download', platform);
        }
        // Track download intent
        console.log(`User wants to download on ${platform}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 100, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 100, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 9999,
                maxWidth: '400px',
                cursor: 'pointer'
            }}
        >
            {/* Energy Aura */}
            <motion.div
                animate={{
                    scale: [1, pulseEnergy * 1.3, 1],
                    opacity: [0.2, 0.5, 0.2]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                    position: 'absolute',
                    inset: -20,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${currentPersonality.accentColor}40 0%, transparent 70%)`,
                    filter: 'blur(30px)',
                    zIndex: -1
                }}
            />

            {/* Speech Bubble */}
            <AnimatePresence mode="wait">
                {(displayMessage || isTyping) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        style={{
                            background: 'linear-gradient(135deg, #1A1330, #241C40)',
                            border: `3px solid ${currentPersonality.accentColor}`,
                            borderRadius: '24px 24px 4px 24px',
                            padding: '20px 24px',
                            marginBottom: '15px',
                            position: 'relative',
                            boxShadow: `0 20px 40px ${currentPersonality.accentColor}40`,
                            backdropFilter: 'blur(10px)',
                        }}
                    >
                        {/* Header with coach style */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '12px'
                        }}>
                            <span style={{
                                background: currentPersonality.accentColor,
                                padding: '4px 12px',
                                borderRadius: '30px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: '#1A1330',
                                letterSpacing: '0.5px'
                            }}>
                                {currentPersonality.title}
                            </span>
                            
                            {/* Readiness indicator */}
                            {internalState.workoutReadiness > 0 && (
                                <div style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '20px',
                                    padding: '2px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <span style={{ fontSize: '10px', color: '#CDF27E' }}>
                                        READY {internalState.workoutReadiness}%
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Message */}
                        <motion.p
                            animate={isTyping ? { opacity: [1, 0.8, 1] } : {}}
                            style={{
                                color: 'white',
                                fontSize: '15px',
                                margin: 0,
                                lineHeight: 1.6,
                                fontFamily: 'Outfit, sans-serif',
                                fontWeight: coachStyle === 'strict' ? 600 : 400
                            }}
                        >
                            {displayMessage}
                            {isTyping && (
                                <motion.span
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    style={{ marginLeft: '4px', color: currentPersonality.accentColor }}
                                >
                                    ▊
                                </motion.span>
                            )}
                        </motion.p>

                        {/* Catchphrase */}
                        {!isTyping && displayMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    marginTop: '12px',
                                    color: currentPersonality.accentColor,
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}
                            >
                                {currentPersonality.catchphrases[Math.floor(Math.random() * currentPersonality.catchphrases.length)]}
                            </motion.div>
                        )}

                        {/* Speech tail */}
                        <div style={{
                            position: 'absolute',
                            bottom: '-12px',
                            right: '15px',
                            width: '24px',
                            height: '24px',
                            background: '#1A1330',
                            borderRight: `3px solid ${currentPersonality.accentColor}`,
                            borderBottom: `3px solid ${currentPersonality.accentColor}`,
                            borderRadius: '0 0 4px 0',
                            transform: 'rotate(45deg)'
                        }} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Avatar */}
            <motion.div
                animate={{
                    scale: isHovered ? 1.05 : 1,
                    y: isHovered ? -5 : 0
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    justifyContent: 'flex-end'
                }}
            >
                {/* Fitness decorations */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            style={{
                                display: 'flex',
                                gap: '8px',
                                background: 'rgba(255,255,255,0.05)',
                                padding: '8px 12px',
                                borderRadius: '30px',
                                backdropFilter: 'blur(5px)'
                            }}
                        >
                            <span style={{ fontSize: '18px' }}>🏋️</span>
                            <span style={{ fontSize: '18px' }}>⚡</span>
                            <span style={{ fontSize: '18px' }}>💪</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main avatar card */}
                <motion.div
                    animate={{
                        ...currentEmotion.animation,
                        boxShadow: isHovered ? `0 15px 40px ${currentPersonality.accentColor}80` : `0 10px 30px ${currentPersonality.accentColor}40`
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        if (internalState.onboardingComplete && !showDownloadPrompt) {
                            yaraAPI.promptDownload();
                        }
                    }}
                    style={{
                        background: currentEmotion.bgGradient,
                        borderRadius: '40px 40px 40px 15px',
                        padding: '16px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: `0 10px 30px ${currentPersonality.accentColor}60`,
                        border: '1px solid rgba(255,255,255,0.2)',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer'
                    }}
                >
                    {/* Animated background pattern */}
                    <motion.div
                        animate={{
                            x: [0, -30, 0],
                            opacity: [0.1, 0.2, 0.1]
                        }}
                        transition={{ duration: 8, repeat: Infinity }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `repeating-linear-gradient(45deg, ${currentPersonality.accentColor}20 0px, ${currentPersonality.accentColor}20 10px, transparent 10px, transparent 20px)`,
                            opacity: 0.1
                        }}
                    />

                    {/* Avatar icon */}
                    <motion.div
                        animate={{
                            rotate: isListening ? [0, 10, -10, 0] : 0,
                            scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                            fontSize: '36px',
                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
                            position: 'relative',
                            zIndex: 2
                        }}
                    >
                        {isListening ? '🎤' : currentEmotion.pose}
                    </motion.div>

                    {/* Coach info */}
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <span style={{ 
                            color: 'white', 
                            fontWeight: 'bold',
                            fontSize: '18px',
                            display: 'block',
                            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }}>
                            {currentPersonality.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px' }}>
                                {currentEmotion.pose}
                            </span>
                            <motion.span
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                style={{ fontSize: '18px' }}
                            >
                                {currentEmotion.eyes}
                            </motion.span>
                        </div>
                    </div>

                    {/* User goal indicator */}
                    {internalState.userGoal && (
                        <div style={{
                            position: 'absolute',
                            top: '5px',
                            right: '10px',
                            fontSize: '16px'
                        }}>
                            {internalState.userGoal === 'lose weight' && '🔥'}
                            {internalState.userGoal === 'gain muscle' && '💪'}
                            {internalState.userGoal === 'stay fit' && '✨'}
                            {internalState.userGoal === 'improve health' && '❤️'}
                        </div>
                    )}
                </motion.div>

                {/* Voice button */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    animate={isListening ? { rotate: 360 } : {}}
                    transition={{ duration: 2, repeat: isListening ? Infinity : 0, ease: "linear" }}
                    onClick={() => setIsListening(!isListening)}
                    style={{
                        background: isListening ? '#50C878' : 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white',
                        fontSize: '18px',
                        backdropFilter: 'blur(5px)',
                        boxShadow: isListening ? '0 0 20px #50C878' : 'none'
                    }}
                >
                    {isListening ? '⏹️' : '🎤'}
                </motion.button>
            </motion.div>

            {/* Download Prompt */}
            <AnimatePresence>
                {showDownloadPrompt && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        style={{
                            position: 'absolute',
                            bottom: '100%',
                            right: '0',
                            marginBottom: '20px',
                            background: 'linear-gradient(135deg, #6F4BF2, #A38DF2)',
                            borderRadius: '20px',
                            padding: '20px',
                            minWidth: '280px',
                            boxShadow: '0 20px 40px rgba(111, 75, 242, 0.5)',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setInternalState(prev => ({ ...prev, showDownloadPrompt: false }))}
                            style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                fontSize: '18px',
                                cursor: 'pointer',
                                opacity: 0.7
                            }}
                        >
                            ×
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                            <span style={{ fontSize: '40px' }}>📱</span>
                            <div>
                                <h4 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                                    Get the BodyQ App!
                                </h4>
                                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', margin: '4px 0 0' }}>
                                    {internalState.userName 
                                        ? `${internalState.userName}, your workouts are waiting!` 
                                        : 'Take your workouts anywhere'}
                                </p>
                            </div>
                        </div>

                        {/* App store buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDownload('ios')}
                                style={downloadButtonStyle}
                            >
                                <span style={{ fontSize: '20px', marginRight: '6px' }}>🍎</span>
                                App Store
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDownload('android')}
                                style={downloadButtonStyle}
                            >
                                <span style={{ fontSize: '20px', marginRight: '6px' }}>📱</span>
                                Google Play
                            </motion.button>
                        </div>

                        {/* QR code placeholder */}
                        <div style={{
                            marginTop: '15px',
                            padding: '10px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            textAlign: 'center',
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.8)'
                        }}>
                            ⬇️ Scan QR code to download
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Online indicator */}
            <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#4CAF50',
                    border: '2px solid #1A1330',
                    boxShadow: '0 0 10px #4CAF50'
                }}
            />
        </motion.div>
    );
};

// Download button styles
const downloadButtonStyle = {
    flex: 1,
    padding: '10px',
    background: 'rgba(255,255,255,0.2)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

// Create ref for parent components
export const yaraRef = React.createRef();

export default YaraAssistant;