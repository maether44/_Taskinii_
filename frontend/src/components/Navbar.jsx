import React from 'react';
import { Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();

    return (
        <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.5rem 5%',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            zIndex: 1000,
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(36, 28, 64, 0.8)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-accent-lime)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                BodyQ
            </div>

            {/* Desktop Menu */}
            <div style={{ gap: '2rem', display: 'none' }} className="desktop-menu">
                <a href="#features" style={{ color: 'white', fontWeight: 500 }}>Features</a>
                <a href="#preview" style={{ color: 'white', fontWeight: 500 }}>App View</a>
                <a href="#" style={{ color: 'white', fontWeight: 500 }}>Testimonials</a>
            </div>

            {/* Buttons group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                {/* Sign In — subtle ghost */}
                <button
                    onClick={() => navigate('/login')}
                    style={{
                        backgroundColor: 'transparent',
                        color: 'white',
                        padding: '0.8rem 1.5rem',
                        borderRadius: '50px',
                        fontWeight: '500',
                        border: '1.5px solid rgba(255,255,255,0.25)',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        transition: 'border-color 0.2s ease, transform 0.2s ease',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    Sign In
                </button>

                {/* Sign Up — lime filled, most prominent */}
                <button
                    onClick={() => navigate('/register')}
                    style={{
                        backgroundColor: 'var(--color-accent-lime)',
                        color: 'var(--color-background)',
                        padding: '0.8rem 1.5rem',
                        borderRadius: '50px',
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        transition: 'transform 0.2s ease, opacity 0.2s ease',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.opacity = '1';
                    }}
                >
                    Sign Up
                </button>

                {/* Install App — lime outline */}
                <button style={{
                    backgroundColor: 'transparent',
                    color: 'var(--color-accent-lime)',
                    padding: '0.8rem 1.5rem',
                    borderRadius: '50px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    border: '1.5px solid var(--color-accent-lime)',
                    fontSize: '0.95rem',
                    transition: 'background 0.2s ease, transform 0.2s ease',
                }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(200, 240, 77, 0.12)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    <Download size={18} />
                    Install App
                </button>
            </div>

            <style>{`
        @media (min-width: 768px) {
          .desktop-menu { display: flex !important; }
        }
        @media (max-width: 640px) {
          .hide-mobile { display: none !important; }
        }
      `}</style>
        </nav>
    );
};

export default Navbar;
