import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
    WebSocketEvents,
    Room,
    User,
    DrawingData,
    WebSocketPayloads,
} from '@tac-map/shared-types';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    transports: ['websocket']
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private rooms: Map<string, Room> = new Map();
    private userSocketMap: Map<string, string> = new Map(); // userId -> socketId
    private socketUserMap: Map<string, string> = new Map(); // socketId -> userId
    private userRoomMap: Map<string, string> = new Map(); // userId -> roomId

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
        const userId = this.socketUserMap.get(client.id);
        if (userId) {
            const roomId = this.userRoomMap.get(userId);
            if (roomId) {
                this.handleUserLeave(userId, roomId);
            }
            this.userSocketMap.delete(userId);
            this.socketUserMap.delete(client.id);
            this.userRoomMap.delete(userId);
        }
    }

    private handleUserLeave(userId: string, roomId: string) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const userIndex = room.participants.findIndex(p => p.id === userId);
        if (userIndex !== -1) {
            room.participants.splice(userIndex, 1);
            if (room.participants.length === 0) {
                this.rooms.delete(roomId);
            } else {
                this.rooms.set(roomId, room);
                this.server.to(roomId).emit(WebSocketEvents.ROOM_UPDATED, { room });
            }
        }
    }

    @SubscribeMessage(WebSocketEvents.CREATE_ROOM)
    handleCreateRoom(
        client: Socket,
        payload: WebSocketPayloads[WebSocketEvents.CREATE_ROOM]
    ) {
        // Check if user is already in a room
        const existingRoomId = this.userRoomMap.get(payload.user.id);
        if (existingRoomId) {
            // Leave existing room
            this.handleUserLeave(payload.user.id, existingRoomId);
            client.leave(existingRoomId);
        }

        const roomId = uuidv4();
        const room: Room = {
            id: roomId,
            participants: [payload.user],
            maxParticipants: 5,
        };

        this.rooms.set(roomId, room);
        this.userSocketMap.set(payload.user.id, client.id);
        this.socketUserMap.set(client.id, payload.user.id);
        this.userRoomMap.set(payload.user.id, roomId);

        client.join(roomId);
        client.emit(WebSocketEvents.ROOM_UPDATED, { room });

        return { roomId };
    }

    @SubscribeMessage(WebSocketEvents.JOIN_ROOM)
    handleJoinRoom(
        client: Socket,
        payload: WebSocketPayloads[WebSocketEvents.JOIN_ROOM]
    ) {
        const room = this.rooms.get(payload.roomId);
        if (!room) {
            client.emit(WebSocketEvents.ERROR, { message: 'Room not found' });
            return;
        }

        if (room.participants.length >= room.maxParticipants) {
            client.emit(WebSocketEvents.ERROR, { message: 'Room is full' });
            return;
        }

        // Check if user is already in this room
        const existingParticipant = room.participants.find(p => p.id === payload.user.id);
        if (existingParticipant) {
            // Update the socket mappings
            this.userSocketMap.set(payload.user.id, client.id);
            this.socketUserMap.set(client.id, payload.user.id);
            client.join(payload.roomId);
            client.emit(WebSocketEvents.ROOM_UPDATED, { room });
            return;
        }

        // Check if user is in another room
        const existingRoomId = this.userRoomMap.get(payload.user.id);
        if (existingRoomId) {
            // Leave existing room
            this.handleUserLeave(payload.user.id, existingRoomId);
            client.leave(existingRoomId);
        }

        room.participants.push(payload.user);
        this.rooms.set(payload.roomId, room);
        this.userSocketMap.set(payload.user.id, client.id);
        this.socketUserMap.set(client.id, payload.user.id);
        this.userRoomMap.set(payload.user.id, payload.roomId);

        client.join(payload.roomId);
        this.server.to(payload.roomId).emit(WebSocketEvents.ROOM_UPDATED, { room });
    }

    @SubscribeMessage(WebSocketEvents.LEAVE_ROOM)
    handleLeaveRoom(
        client: Socket,
        payload: WebSocketPayloads[WebSocketEvents.LEAVE_ROOM]
    ) {
        const userId = this.socketUserMap.get(client.id);
        if (!userId) return;

        this.handleUserLeave(userId, payload.roomId);
        client.leave(payload.roomId);
        this.userRoomMap.delete(userId);
    }

    @SubscribeMessage(WebSocketEvents.DRAW)
    handleDraw(
        client: Socket,
        payload: WebSocketPayloads[WebSocketEvents.DRAW]
    ) {
        const room = this.rooms.get(payload.roomId);
        if (!room) return;

        this.server
            .to(payload.roomId)
            .emit(WebSocketEvents.DRAWING_UPDATED, payload);
    }
} 