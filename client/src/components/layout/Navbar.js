import { Link } from 'react-router-dom';
import ConnectionStatus from './ConnectionStatus';

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
        <li className="connection-status-container">
          <ConnectionStatus />
        </li>
      </ul>
    </nav>
  );
};

export default Navbar; 