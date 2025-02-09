export interface UserSettings {
    nickname: string;
    color: string;
}

export interface Room {
    id: string;
    participants: Participant[];
    maxParticipants: number;
}

export interface Participant {
    nickname: string;
    color: string;
}

export interface Point {
    x: number;
    y: number;
}

export interface DrawEvent {
    points: Point[];
    color: string;
    lineWidth: number;
}

export const STORAGE_KEYS = {
    USER_SETTINGS: 'tacticalMap_userSettings',
    CURRENT_ROOM: 'tacticalMap_currentRoom'
} as const; 