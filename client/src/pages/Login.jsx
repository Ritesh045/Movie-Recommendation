import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Film, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';
import '../styles/auth.css';

const Login = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isSignup = location.pathname === '/signup' || initialMode === 'signup';
  const [showPassword, setShowPassword] = useState(false);
  const [tiltStyle, setTiltStyle] = useState({});

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup Form State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  const { login, signup } = useAuth();
  const fromPath = location.state?.from?.pathname || '/';

  // Dynamic Password Strength Meter
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'transparent' };
    if (pass.length < 6) return { score: 1, label: 'Weak (min 6 characters)', color: '#ff4d4d' };
    if (pass.length < 9) return { score: 2, label: 'Medium Strength', color: '#ffa500' };
    return { score: 3, label: 'Strong Password', color: '#00e676' };
  };

  const passStrength = getPasswordStrength(signupPassword);

  // 3D Mouse Tilt Effect
  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`,
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    });
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Submit Sign In
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter both email address and password.');
      return;
    }

    if (!validateEmail(loginEmail)) {
      setLoginError('Please enter a valid email address (e.g., name@example.com).');
      return;
    }

    if (loginPassword.length < 6) {
      setLoginError('Password must be at least 6 characters in length.');
      return;
    }

    try {
      setLoginLoading(true);
      await login(loginEmail, loginPassword);
      navigate(fromPath, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid email or password credentials.';
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  // Submit Create Account
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');

    if (!signupName || !signupEmail || !signupPassword) {
      setSignupError('All fields are required.');
      return;
    }

    if (!validateEmail(signupEmail)) {
      setSignupError('Please enter a valid email address.');
      return;
    }

    if (signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setSignupLoading(true);
      await signup(signupName, signupEmail, signupPassword);
      navigate(fromPath, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create account. Please try again.';
      setSignupError(msg);
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      {/* Background Animated Blobs */}
      <div className="auth-blob auth-blob-1"></div>
      <div className="auth-blob auth-blob-2"></div>

      <div className="auth-3d-wrapper">
        <div
          className="auth-card-flipper"
          style={tiltStyle}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {isSignup ? (
            /* CREATE ACCOUNT (SIGN UP) CARD */
            <div className="auth-glass-card">
              <div className="auth-brand-logo">
                <Film size={32} color="#e50914" />
                <span>CineSphere</span>
              </div>

              <h2 className="auth-header-title">Create Account</h2>
              <p className="auth-header-subtitle">
                Join CineSphere to unlock personalized AI movie recommendations.
              </p>

              {/* Feature Badges */}
              <div className="auth-perks-badges">
                <span className="auth-perk-pill">
                  <Zap size={12} /> Unlimited Recommendations
                </span>
                <span className="auth-perk-pill">
                  <ShieldCheck size={12} /> 100% Free Access
                </span>
              </div>

              {signupError && (
                <div className="auth-error-alert">
                  <AlertCircle size={16} />
                  <span>{signupError}</span>
                </div>
              )}

              <form onSubmit={handleSignupSubmit}>
                <div className="auth-input-group">
                  <label className="auth-input-label">Full Name</label>
                  <div className="auth-input-wrapper">
                    <input
                      type="text"
                      className="auth-input-field"
                      placeholder="John Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                    <UserIcon size={18} className="auth-input-icon" />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-input-label">Email Address</label>
                  <div className="auth-input-wrapper">
                    <input
                      type="email"
                      className="auth-input-field"
                      placeholder="name@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                    <Mail size={18} className="auth-input-icon" />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-input-label">Password</label>
                  <div className="auth-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input-field"
                      placeholder="At least 6 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                    <Lock size={18} className="auth-input-icon" />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {signupPassword && (
                    <div className="auth-password-meter">
                      <div className="auth-meter-bar-track">
                        <div
                          className="auth-meter-bar-fill"
                          style={{
                            width: `${(passStrength.score / 3) * 100}%`,
                            backgroundColor: passStrength.color
                          }}
                        />
                      </div>
                      <span className="auth-meter-label" style={{ color: passStrength.color }}>
                        {passStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                <button type="submit" className="auth-btn-submit" disabled={signupLoading}>
                  {signupLoading ? (
                    <span>Creating Account...</span>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <Sparkles size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="auth-switch-text">
                Already have an account?
                <Link to="/login" className="auth-switch-link">
                  Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* SIGN IN CARD */
            <div className="auth-glass-card">
              <div className="auth-brand-logo">
                <Film size={32} color="#e50914" />
                <span>CineSphere</span>
              </div>

              <h2 className="auth-header-title">Sign In</h2>
              <p className="auth-header-subtitle">
                Enter your credentials to access your streaming recommendations.
              </p>

              {loginError && (
                <div className="auth-error-alert">
                  <AlertCircle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit}>
                <div className="auth-input-group">
                  <label className="auth-input-label">Email Address</label>
                  <div className="auth-input-wrapper">
                    <input
                      type="email"
                      className="auth-input-field"
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                    <Mail size={18} className="auth-input-icon" />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-input-label">Password</label>
                  <div className="auth-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input-field"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <Lock size={18} className="auth-input-icon" />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="auth-btn-submit" disabled={loginLoading}>
                  {loginLoading ? (
                    <span>Signing In...</span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="auth-switch-text">
                New to CineSphere?
                <Link to="/signup" className="auth-switch-link">
                  Sign up now
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
