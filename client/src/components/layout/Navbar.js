import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="navbar">
      <h1>
        <Link to="/">
          <i className="fas fa-sort"></i> Sort Circuit
        </Link>
      </h1>
      <ul>
        <li>
          <Link to="/dashboard">Join/Create Game</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar; 