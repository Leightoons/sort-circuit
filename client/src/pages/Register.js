import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: ''
  });
  const [formError, setFormError] = useState('');
  
  const { username, email, password, password2 } = formData;
  const { register, isAuthenticated, error, clearError } = useContext(AuthContext);
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
    
    if (!username || !email || !password) {
      setFormError('Please enter all fields');
      return;
    }
    
    if (password !== password2) {
      setFormError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    
    try {
      await register({
        username,
        email,
        password
      });
    } catch (err) {
      // Error handling is done through context
    }
  };

  return (
    <div className="register-page">
      <h1 className="text-center">Sign Up</h1>
      <p className="lead text-center">Create your Sort Circuit account</p>

      <form className="form" onSubmit={onSubmit}>
        {formError && <div className="alert alert-danger">{formError}</div>}
        
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            name="username"
            id="username"
            value={username}
            onChange={onChange}
            required
          />
        </div>
        
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
            minLength="6"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password2">Confirm Password</label>
          <input
            type="password"
            name="password2"
            id="password2"
            value={password2}
            onChange={onChange}
            required
            minLength="6"
          />
        </div>
        
        <input type="submit" value="Register" className="btn btn-primary btn-block" />
      </form>
      
      <p className="text-center my-1">
        Already have an account? <Link to="/login">Sign In</Link>
      </p>
    </div>
  );
};

export default Register; 