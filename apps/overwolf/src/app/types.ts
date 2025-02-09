export interface Room {
    id: string;
    participants: User[];
    maxParticipants: number;
}

export interface User {
    id: string;
    nickname: string;
    color: string;
}

export interface UserSettings {
    userId: string;
    nickname: string;
    color: string;
}

export interface DrawEvent {
    userId: string;
    color: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

export const STORAGE_KEYS = {
    USER_SETTINGS: 'tacticalMap_userSettings',
    CURRENT_ROOM: 'tacticalMap_currentRoom'
} as const; 