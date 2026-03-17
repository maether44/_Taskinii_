import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
    const navigate = useNavigate();

    return (
        <section style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: '6rem 2rem 2rem',
            background: 'radial-gradient(circle at 50% 30%, rgba(111, 75, 242, 0.4) 0%, rgba(36, 28, 64, 1) 70%)',
            overflow: 'hidden'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                style={{ maxWidth: '800px' }}
            >
                <span style={{
                    color: 'var(--color-accent-lime)',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    marginBottom: '1rem',
                    display: 'block'
                }}>
                    Elevate Your Fitness
                </span>

                <h1 style={{
                    fontSize: 'clamp(3rem, 5vw, 5rem)',
                    lineHeight: 1.1,
                    fontWeight: 800,
                    marginBottom: '1.5rem',
                    background: 'linear-gradient(to right, #fff, #A38DF2)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Your Personal <br />
                    <span style={{ color: 'transparent', WebkitTextStroke: '1px var(--color-accent-lime)' }}>Pocket Gym</span>
                </h1>

                <p style={{
                    fontSize: '1.2rem',
                    color: '#ccc',
                    marginBottom: '3rem',
                    maxWidth: '600px',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                }}>
                    Tailored routines, AI coaching, and smart nutrition tracking.
                    Everything you need to sculpt your best self.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/register')}
                        style={{
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            padding: '1rem 2rem',
                            borderRadius: '50px',
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            border: 'none',
                            boxShadow: '0 10px 30px rgba(111, 75, 242, 0.5)'
                        }}
                    >
                        Start Your Journey <ArrowRight size={20} />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            backgroundColor: 'transparent',
                            color: 'white',
                            padding: '1rem 2rem',
                            borderRadius: '50px',
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            border: '2px solid rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                        }}
                    >
                        <Play size={20} fill="white" /> See Demo
                    </motion.button>
                </div>
            </motion.div>

            {/* Decorative Elements */}
            <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    position: 'absolute',
                    top: '20%',
                    left: '10%',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'none',
                    border: '4px solid var(--color-accent-lime)',
                    opacity: 0.5,
                    zIndex: -1
                }}
            />

            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                style={{
                    position: 'absolute',
                    bottom: '10%',
                    right: '5%',
                    width: '100px',
                    height: '100px',
                    borderRadius: '30%',
                    background: 'var(--color-primary)',
                    opacity: 0.2,
                    filter: 'blur(40px)',
                    zIndex: -1
                }}
            />
        </section>
    );
};

export default Hero;