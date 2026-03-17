import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import DashboardPreview from './components/DashboardPreview'
import Footer from './components/Footer'
import Login from './components/Login'
import Register from './components/Register'
import ProtectedRoute from './components/ProtectedRoute'

// Your existing home/landing page
function HomePage() {
    return (
        <div className="app-container">
            <Navbar />
            <Hero />
            <Features />
            <DashboardPreview />
            <Footer />
        </div>
    )
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route path="/"         element={<HomePage />} />
                <Route path="/login"    element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected dashboard — redirects to /login if not signed in */}
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <HomePage />  {/* swap this for a real Dashboard component later */}
                    </ProtectedRoute>
                } />
            </Routes>
        </BrowserRouter>
    )
}

export default App