import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import { useNotification } from '../contexts/NotificationContext';
import './login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { addNotification } = useNotification();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Basic validations
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setLoading(true);

        try {
            const res = await axiosInstance.post('/api/auth/login', { email, password });
            if (res.data.token) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('userId', res.data.user.id);
                window.dispatchEvent(new Event('authChange'));
                addNotification('Success', 'Logged in successfully', 'success');
                navigate('/portfolio');
            }
        } catch (err) {
            setError(err.response?.data?.message || "Login failed");
            addNotification('Error', 'Invalid credentials', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-background-effects">
                <div className="auth-glow"></div>
                <div className="auth-grid"></div>
            </div>

            <div className="auth-card animate-fade-in">
                <div className="auth-header">
                    <h2>Welcome Back</h2>
                    <p>Enter your credentials to access your global portfolio.</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-input-group">
                        <Mail className="auth-icon" size={20} />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="auth-input-group">
                        <Lock className="auth-icon" size={20} />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button 
                            type="button" 
                            className="auth-icon-btn" 
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={18} />
                    </button>
                </form>



                <p className="auth-footer">
                    Don't have an account? <Link to="/signup" className="auth-link">Sign up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
