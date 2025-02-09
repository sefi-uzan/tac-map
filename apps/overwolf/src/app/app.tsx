import { Room, User } from '@tac-map/shared-types';
import { useEffect, useState } from 'react';
import { RoomCreation } from './components/room-creation';
import { RoomJoin } from './components/room-join/room-join';
import { SharedCanvas } from './components/shared-canvas/shared-canvas';
import { UserSettingsForm } from './components/user-settings';
import { socketService } from './services/socket.service';

interface WindowInfo {
  name: string;
  id: string;
}

interface Props {
  windowType: string;
}

const STORAGE_KEYS = {
  USER_SETTINGS: 'tacticalMap_userSettings',
  CURRENT_ROOM: 'tacticalMap_currentRoom'
};

export function App({ windowType }: Props) {
  const [currentWindow, setCurrentWindow] = useState<WindowInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load saved user and room data
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    const savedRoom = localStorage.getItem(STORAGE_KEYS.CURRENT_ROOM);

    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);

      // If we have both user and room data, reconnect to the room
      if (savedRoom) {
        const room = JSON.parse(savedRoom);
        socketService.joinRoom(room.id, user)
          .then(room => {
            setCurrentRoom(room);
          })
          .catch(() => {
            // If rejoining fails, clear the saved room
            localStorage.removeItem(STORAGE_KEYS.CURRENT_ROOM);
          });
      }
    }

    // Set up storage event listener to detect changes from other windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.CURRENT_ROOM) {
        if (e.newValue) {
          setCurrentRoom(JSON.parse(e.newValue));
        } else {
          setCurrentRoom(null);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Initialize Overwolf window
  useEffect(() => {
    window.overwolf.windows.getCurrentWindow((result: overwolf.windows.WindowResult) => {
      if (result.success && result.window) {
        setCurrentWindow({
          name: result.window.name,
          id: result.window.id
        });
      }
    });
  }, []);

  // Don't render UI for background window
  if (windowType === 'background') {
    return null;
  }

  const handleDragStart = () => {
    if (currentWindow) {
      window.overwolf.windows.dragMove(currentWindow.id);
    }
  };

  const handleClose = () => {
    if (currentWindow) {
      window.overwolf.windows.close(currentWindow.id);
    }
  };

  const handleMinimize = () => {
    if (currentWindow) {
      window.overwolf.windows.minimize(currentWindow.id);
    }
  };

  const handleUserSubmit = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(user));
  };

  const handleRoomJoined = (room: Room) => {
    setCurrentRoom(room);
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROOM, JSON.stringify(room));
  };

  const handleLeaveRoom = () => {
    if (currentRoom && currentUser) {
      socketService.leaveRoom(currentRoom.id);
      setCurrentRoom(null);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_ROOM);
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 3000);
  };

  // Add extra transparency for in-game window
  const isInGameWindow = windowType === 'inGameWindow';
  const bgClass = isInGameWindow ? 'bg-gray-900/80' : 'bg-gray-900';
  const headerBgClass = isInGameWindow ? 'bg-gray-800/80' : 'bg-gray-800';

  // Show message if no user settings in in-game window
  if (isInGameWindow && !currentUser) {
    return (
      <div className="window-base">
        <div className="window-header draggable" onMouseDown={handleDragStart}>
          <h1>Tactical Map (In-Game)</h1>
          <div className="window-controls no-drag">
            <button onClick={handleClose}>✕</button>
          </div>
        </div>
        <div className="window-content">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-xl">Please set up your profile in the desktop window first.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no room in in-game window
  if (isInGameWindow && !currentRoom) {
    return (
      <div className="window-base">
        <div className="window-header draggable" onMouseDown={handleDragStart}>
          <h1>Tactical Map (In-Game)</h1>
          <div className="window-controls no-drag">
            <button onClick={handleClose}>✕</button>
          </div>
        </div>
        <div className="window-content">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-xl">Please join a room in the desktop window first.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="window-base">
      <div className="window-header draggable" onMouseDown={handleDragStart}>
        <h1>Tactical Map {isInGameWindow ? '(In-Game)' : ''}</h1>
        <div className="window-controls no-drag">
          {currentRoom && (
            <button onClick={handleLeaveRoom}>Leave Room</button>
          )}
          <button onClick={handleMinimize}>_</button>
          <button onClick={handleClose}>✕</button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button className="close-error" onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="window-content">
        {!currentUser ? (
          <div className="flex flex-col items-center justify-center h-full">
            <h2>Welcome to Tactical Map</h2>
            <UserSettingsForm onSave={handleUserSubmit} />
          </div>
        ) : !currentRoom ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <RoomCreation
              userSettings={currentUser}
              onRoomJoined={handleRoomJoined}
              onError={handleError}
            />
            <div className="text-center text-gray-400 my-4">or</div>
            <RoomJoin
              userSettings={currentUser}
              onRoomJoined={handleRoomJoined}
              onError={handleError}
            />
          </div>
        ) : (
          <SharedCanvas
            room={currentRoom}
            userSettings={currentUser}
          />
        )}
      </div>
    </div>
  );
}

export default App;
