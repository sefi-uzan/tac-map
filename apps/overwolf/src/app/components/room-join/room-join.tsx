import React, { useState } from 'react';
import { Room, User } from '../../types';
import { socketService } from '../../services/socket.service';
import './styles.css';

interface Props {
    userSettings: User;
    onRoomJoined: (room: Room) => void;
    onError: (error: string) => void;
}

export const RoomJoin: React.FC<Props> = ({ userSettings, onRoomJoined, onError }) => {
    const [roomId, setRoomId] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    const handleJoinRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomId.trim()) {
            onError('Please enter a room ID');
            return;
        }

        try {
            setIsJoining(true);
            const room = await socketService.joinRoom(roomId, userSettings);
            onRoomJoined(room);
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Failed to join room');
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="join-room">
            <form onSubmit={handleJoinRoom}>
                <div className="form-group">
                    <label htmlFor="roomId">Room ID</label>
                    <input
                        type="text"
                        id="roomId"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        placeholder="Enter room ID"
                        disabled={isJoining}
                        className="room-input"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isJoining || !roomId.trim()}
                    className="join-button"
                >
                    {isJoining ? 'Joining...' : 'Join Room'}
                </button>
            </form>
        </div>
    );
}; 