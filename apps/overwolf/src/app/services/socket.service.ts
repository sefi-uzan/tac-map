import { io, Socket } from 'socket.io-client';
import { Room, User } from '../types';
import { environment } from '../../environments/environment';

type SocketCallback = (...args: any[]) => void;

export class SocketService {
    private static instance: SocketService;
    private socket: Socket | null = null;
    private currentRoom: Room | null = null;
    private listeners: Map<string, SocketCallback[]> = new Map();

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
            });
            this.setupListeners();
        }
        return this.socket;
    }

    public disconnect() {
        if (this.socket) {
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
        }
    }

    private setupListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        this.socket.on('error', (error: { message: string }) => {
            console.error('Socket error:', error.message);
        });
    }

    public createRoom(user: User): Promise<Room> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                this.socket = this.connect();
            }

            this.socket.emit('createRoom', { user });

            this.socket.once('roomUpdated', ({ room }: { room: Room }) => {
                this.currentRoom = room;
                resolve(room);
            });

            this.socket.once('error', (error: { message: string }) => {
                reject(new Error(error.message));
            });
        });
    }

    public joinRoom(roomId: string, user: User): Promise<Room> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                this.socket = this.connect();
            }

            this.socket.emit('joinRoom', { roomId, user });

            this.socket.once('roomUpdated', ({ room }: { room: Room }) => {
                this.currentRoom = room;
                resolve(room);
            });

            this.socket.once('error', (error: { message: string }) => {
                reject(new Error(error.message));
            });
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