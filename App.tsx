import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import ChatRoom from './components/ChatRoom';
import { User, ServerConfig } from './types';
import { BROADCAST_CHANNEL_NAME } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentServer, setCurrentServer] = useState<ServerConfig | null>(null);
  const [existingNicknames, setExistingNicknames] = useState<string[]>([]);

  // Listen for other users to help uniqueness validation in Login
  // Note: This only detects users in the default lobby or broadcasting globally.
  // With node isolation, this might only catch users on the same channel if updated.
  useEffect(() => {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    
    // Ask who is online when mounting app (even in login screen)
    channel.postMessage({ type: 'REQUEST_USERS', requesterId: 'guest' });

    channel.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'HEARTBEAT' || data.type === 'USER_JOIN') {
        setExistingNicknames(prev => {
          if (prev.includes(data.user.nickname)) return prev;
          return [...prev, data.user.nickname];
        });
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  const handleLogin = (nickname: string, server: ServerConfig) => {
    // Generate a random avatar from picsum based on nickname hash or random
    const avatarId = Math.floor(Math.random() * 70) + 1; // 1-70
    
    const newUser: User = {
      id: Date.now().toString(), // Simple ID generation
      nickname,
      avatar: `https://picsum.photos/id/${avatarId}/200/200`,
      isOnline: true,
      lastSeen: Date.now(),
    };
    
    // Simulate connection delay for effect
    setTimeout(() => {
      setCurrentServer(server);
      setCurrentUser(newUser);
    }, 500);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentServer(null);
  };

  return (
    <>
      {!currentUser || !currentServer ? (
        <Login onLogin={handleLogin} existingNicknames={existingNicknames} />
      ) : (
        <ChatRoom 
          currentUser={currentUser} 
          serverConfig={currentServer} 
          onLogout={handleLogout} 
        />
      )}
    </>
  );
};

export default App;