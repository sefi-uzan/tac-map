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
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private rooms: Map<string, Room> = new Map();
    private userSocketMap: Map<string, string> = new Map(); // userId -> socketId
    private socketUserMap: Map<string, string> = new Map(); // socketId -> userId

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
        const userId = this.socketUserMap.get(client.id);
        if (userId) {
            this.userSocketMap.delete(userId);
            this.socketUserMap.delete(client.id);

            // Find and remove user from any room they're in
            for (const [roomId, room] of this.rooms.entries()) {
                const userIndex = room.participants.findIndex((p: User) => p.id === userId);
                if (userIndex !== -1) {
                    room.participants.splice(userIndex, 1);
                    if (room.participants.length === 0) {
                        this.rooms.delete(roomId);
                    } else {
                        this.rooms.set(roomId, room);
                        this.server.to(roomId).emit(WebSocketEvents.ROOM_UPDATED, { room });
                    }
                    break;
                }
            }
        }
    }

    @SubscribeMessage(WebSocketEvents.CREATE_ROOM)
    handleCreateRoom(
        client: Socket,
        payload: WebSocketPayloads[WebSocketEvents.CREATE_ROOM]
    ) {
        const roomId = uuidv4();
        const room: Room = {
            id: roomId,
            participants: [payload.user],
            maxParticipants: 5,
        };

        this.rooms.set(roomId, room);
        this.userSocketMap.set(payload.user.id, client.id);
        this.socketUserMap.set(client.id, payload.user.id);

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

        room.participants.push(payload.user);
        this.rooms.set(payload.roomId, room);
        this.userSocketMap.set(payload.user.id, client.id);
        this.socketUserMap.set(client.id, payload.user.id);

        client.join(payload.roomId);
        this.server.to(payload.roomId).emit(WebSocketEvents.ROOM_UPDATED, { room });
    }

    @SubscribeMessage(WebSocketEvents.LEAVE_ROOM)
    handleLeaveRoom(
        client: Socket,
        payload: WebSocketPayloads[WebSocketEvents.LEAVE_ROOM]
    ) {
        const room = this.rooms.get(payload.roomId);
        if (!room) return;

        const userIndex = room.participants.findIndex((p: User) => p.id === payload.userId);
        if (userIndex !== -1) {
            room.participants.splice(userIndex, 1);
            if (room.participants.length === 0) {
                this.rooms.delete(payload.roomId);
            } else {
                this.rooms.set(payload.roomId, room);
                client.leave(payload.roomId);
                this.server.to(payload.roomId).emit(WebSocketEvents.ROOM_UPDATED, { room });
            }
        }
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