import { io, Socket } from 'socket.io-client';
import { Room, User } from '../types';
import { environment } from '../../environments/environment';

type SocketCallback = (...args: any[]) => void;

export class SocketService {
    private static instance: SocketService;
    private socket: Socket | null = null;
    private currentRoom: Room | null = null;
    private listeners: Map<string, SocketCallback[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    private constructor() {
        // Private constructor for singleton pattern
    }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public connect() {
        if (!this.socket) {
            this.socket = io(environment.socketUrl, {
                reconnectionDelayMax: 10000,
                reconnectionAttempts: this.maxReconnectAttempts,
                transports: ['websocket'],
                autoConnect: true
            });
            this.setupListeners();
        }
        return this.socket;
    }

    public disconnect() {
        if (this.socket) {
            // Leave current room before disconnecting
            if (this.currentRoom) {
                this.leaveRoom(this.currentRoom.id);
            }

            // Remove all listeners
            this.listeners.forEach((callbacks, event) => {
                callbacks.forEach(callback => {
                    this.socket?.off(event, callback);
                });
            });
            this.listeners.clear();

            this.socket.disconnect();
            this.socket = null;
            this.currentRoom = null;
            this.reconnectAttempts = 0;
        }
    }

    private setupListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.reconnectAttempts = 0;

            // Rejoin room if we were in one
            if (this.currentRoom) {
                const room = this.currentRoom;
                this.currentRoom = null; // Clear it first to avoid duplicate joins
                this.rejoinRoom(room);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        this.socket.on('error', (error: { message: string }) => {
            console.error('Socket error:', error.message);
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
            }
        });

        this.socket.on('roomUpdated', ({ room }: { room: Room }) => {
            this.currentRoom = room;
        });
    }

    private async rejoinRoom(room: Room) {
        try {
            const user = room.participants.find(p => this.socket?.id === p.id);
            if (user) {
                await this.joinRoom(room.id, user);
            }
        } catch (error) {
            console.error('Failed to rejoin room:', error);
        }
    }

    public createRoom(user: User): Promise<Room> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                this.socket = this.connect();
            }

            // Leave current room if any
            if (this.currentRoom) {
                this.leaveRoom(this.currentRoom.id);
            }

            this.socket.emit('createRoom', { user });

            const handleRoomUpdate = ({ room }: { room: Room }) => {
                this.currentRoom = room;
                this.socket?.off('roomUpdated', handleRoomUpdate);
                this.socket?.off('error', handleError);
                resolve(room);
            };

            const handleError = (error: { message: string }) => {
                this.socket?.off('roomUpdated', handleRoomUpdate);
                this.socket?.off('error', handleError);
                reject(new Error(error.message));
            };

            this.socket.once('roomUpdated', handleRoomUpdate);
            this.socket.once('error', handleError);
        });
    }

    public joinRoom(roomId: string, user: User): Promise<Room> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                this.socket = this.connect();
            }

            // Leave current room if any
            if (this.currentRoom) {
                this.leaveRoom(this.currentRoom.id);
            }

            this.socket.emit('joinRoom', { roomId, user });

            const handleRoomUpdate = ({ room }: { room: Room }) => {
                this.currentRoom = room;
                this.socket?.off('roomUpdated', handleRoomUpdate);
                this.socket?.off('error', handleError);
                resolve(room);
            };

            const handleError = (error: { message: string }) => {
                this.socket?.off('roomUpdated', handleRoomUpdate);
                this.socket?.off('error', handleError);
                reject(new Error(error.message));
            };

            this.socket.once('roomUpdated', handleRoomUpdate);
            this.socket.once('error', handleError);
        });
    }

    public leaveRoom(roomId: string): void {
        if (!this.socket || !this.currentRoom) return;

        this.socket.emit('leaveRoom', { roomId });
        this.currentRoom = null;
    }

    public addListener(event: string, callback: SocketCallback): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);

        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    public removeListener(event: string, callback?: SocketCallback): void {
        if (!this.socket) return;

        if (callback) {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index !== -1) {
                    callbacks.splice(index, 1);
                    this.socket.off(event, callback);
                }
            }
        } else {
            this.listeners.delete(event);
            this.socket.removeAllListeners(event);
        }
    }

    public emit(event: string, data: any): void {
        if (!this.socket) {
            this.socket = this.connect();
        }
        this.socket.emit(event, data);
    }

    public onParticipantJoined(callback: (data: { room: Room }) => void) {
        this.addListener('roomUpdated', callback);
    }

    public onParticipantLeft(callback: (data: { room: Room }) => void) {
        this.addListener('roomUpdated', callback);
    }

    public onRoomClosed(callback: (roomId: string) => void) {
        this.addListener('roomClosed', callback);
    }

    public onCanvasUpdate(callback: (drawEvent: any) => void) {
        this.addListener('drawingUpdated', callback);
    }

    public getCurrentRoom(): Room | null {
        return this.currentRoom;
    }
}

export const socketService = SocketService.getInstance(); 