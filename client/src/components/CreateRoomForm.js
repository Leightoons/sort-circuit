import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CreateRoomForm = ({ createRoom }) => {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }
    
    createRoom(username);
  };

  return (
    <form className="create-room-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="username">Your Name</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your name"
          required
        />
      </div>
      
      <button type="submit" className="btn btn-primary">
        Create Room
      </button>
    </form>
  );
};

export default CreateRoomForm; 