import { socketService } from '../services/socket.service';
import { Room, User } from '../types';

export class TacticalMapComponent {
    public roomId: string | null = null;
    public currentRoom: Room | null = null;

    constructor() {
        // Update room ID when room is created or joined
        socketService.addListener('roomUpdated', ({ room }: { room: Room }) => {
            this.roomId = room.id;
            this.currentRoom = room;
        });
    }

    template = `
        <div class="flex flex-col h-full bg-gray-900 text-white">
            <div class="flex justify-between items-center p-4 bg-gray-800">
                <div class="text-xl font-bold">Tactical Map</div>
                ${this.roomId ? `
                    <div class="flex items-center space-x-4">
                        <div class="bg-gray-700 rounded px-4 py-2">
                            <span class="text-gray-400">Room ID: </span>
                            <span class="font-mono select-all">${this.roomId}</span>
                        </div>
                        <button class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded" onclick="this.leaveRoom()">
                            Leave Room
                        </button>
                    </div>
                ` : ''}
            </div>
            
            <div class="flex-1 p-4">
                <canvas id="canvas" class="w-full h-full bg-black rounded"></canvas>
            </div>

            <div class="p-4 bg-gray-800">
                <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                        <label class="text-sm">Line Width:</label>
                        <input type="range" min="1" max="10" value="2" class="w-32"
                            onchange="this.handleLineWidthChange(event)">
                    </div>
                    
                    <div class="flex-1"></div>
                    
                    <div class="text-sm text-gray-400">
                        Room Participants:
                        <div class="mt-1">
                            ${this.currentRoom?.participants.map((participant: User) => `
                                <div class="flex items-center space-x-2">
                                    <span class="w-2 h-2 rounded-full bg-red-500"></span>
                                    <span>${participant.id}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
} 