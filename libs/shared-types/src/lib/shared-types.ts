export function sharedTypes(): string {
  return 'shared-types';
}

export interface User {
  id: string;
  nickname: string;
  color: string;
}

export interface Room {
  id: string;
  participants: User[];
  maxParticipants: number;
}

export interface DrawingData {
  points: Point[];
  color: string;
  userId: string;
}

export interface Point {
  x: number;
  y: number;
}

export enum WebSocketEvents {
  JOIN_ROOM = 'joinRoom',
  LEAVE_ROOM = 'leaveRoom',
  CREATE_ROOM = 'createRoom',
  ROOM_UPDATED = 'roomUpdated',
  DRAW = 'draw',
  DRAWING_UPDATED = 'drawingUpdated',
  ERROR = 'error'
}

export interface WebSocketPayloads {
  [WebSocketEvents.JOIN_ROOM]: {
    roomId: string;
    user: User;
  };
  [WebSocketEvents.LEAVE_ROOM]: {
    roomId: string;
    userId: string;
  };
  [WebSocketEvents.CREATE_ROOM]: {
    user: User;
  };
  [WebSocketEvents.ROOM_UPDATED]: {
    room: Room;
  };
  [WebSocketEvents.DRAW]: {
    roomId: string;
    drawingData: DrawingData;
  };
  [WebSocketEvents.DRAWING_UPDATED]: {
    roomId: string;
    drawingData: DrawingData;
  };
  [WebSocketEvents.ERROR]: {
    message: string;
  };
}
