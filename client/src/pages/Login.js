import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formError, setFormError] = useState('');
  
  const { email, password } = formData;
  const { login, isAuthenticated, error, clearError } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
    
    if (error) {
      setFormError(error);
      clearError();
    }
  }, [isAuthenticated, error, clearError, navigate]);

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setFormError('Please enter all fields');
      return;
    }
    
    try {
      await login({ email, password });
    } catch (err) {
      // Error handling is done through context
    }
  };

  return (
    <div className="login-page">
      <h1 className="text-center">Login</h1>
      <p className="lead text-center">Sign in to your account</p>

      <form className="form" onSubmit={onSubmit}>
        {formError && <div className="alert alert-danger">{formError}</div>}
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            name="email"
            id="email"
            value={email}
            onChange={onChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            value={password}
            onChange={onChange}
            required
          />
        </div>
        
        <input type="submit" value="Login" className="btn btn-primary btn-block" />
      </form>
      
      <p className="text-center my-1">
        Don't have an account? <Link to="/register">Sign Up</Link>
      </p>
    </div>
  );
};

export default Login; 