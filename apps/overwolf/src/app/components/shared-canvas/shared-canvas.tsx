import React, { useRef, useEffect, useState } from 'react';
import { Room, User } from '@tac-map/shared-types';
import { socketService } from '../../services/socket.service';
import './styles.css';

interface Props {
    room: Room;
    userSettings: User;
}

interface Point {
    x: number;
    y: number;
}

interface DrawEvent {
    points: Point[];
    color: string;
    lineWidth: number;
}

export const SharedCanvas: React.FC<Props> = ({ room, userSettings }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);
    const [lineWidth, setLineWidth] = useState(2);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set up canvas with fixed dimensions
        canvas.width = 800;
        canvas.height = 600;

        const context = canvas.getContext('2d');
        if (!context) return;

        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = userSettings.color;
        context.lineWidth = lineWidth;
        contextRef.current = context;

        // Set up socket listener for drawing events
        socketService.onCanvasUpdate((event: DrawEvent) => {
            drawPath(event.points, event.color, event.lineWidth);
        });

        return () => {
            socketService.removeListener('drawingUpdated');
        };
    }, [userSettings.color]);

    const drawPath = (points: Point[], color: string, width: number) => {
        const context = contextRef.current;
        if (!context || points.length < 2) return;

        const originalStyle = context.strokeStyle;
        const originalWidth = context.lineWidth;

        context.strokeStyle = color;
        context.lineWidth = width;
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            context.lineTo(points[i].x, points[i].y);
        }

        context.stroke();
        context.strokeStyle = originalStyle;
        context.lineWidth = originalWidth;
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        setIsDrawing(true);
        setCurrentPath([point]);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        setCurrentPath(prev => {
            const newPath = [...prev, point];
            drawPath(newPath, userSettings.color, lineWidth);
            return newPath;
        });
    };

    const stopDrawing = () => {
        if (!isDrawing) return;

        // Emit the complete path to other participants
        socketService.emit('draw', {
            roomId: room.id,
            drawingData: {
                userId: userSettings.id,
                color: userSettings.color,
                points: currentPath,
                lineWidth
            }
        });

        setIsDrawing(false);
        setCurrentPath([]);
    };

    return (
        <div className="canvas-container">
            {/* Room Info Bar */}
            <div className="room-info-bar">
                <div className="room-id">
                    <span className="label">Room ID:</span>
                    <span className="value" onClick={() => navigator.clipboard.writeText(room.id)}>
                        {room.id}
                        <span className="copy-hint">Click to copy</span>
                    </span>
                </div>
                <div className="participants">
                    <span className="label">Participants:</span>
                    <div className="participant-list">
                        {room.participants.map((participant) => (
                            <div
                                key={participant.id}
                                className="participant"
                                style={{
                                    '--participant-color': participant.color
                                } as React.CSSProperties}
                            >
                                <span className="participant-indicator"></span>
                                <span className="participant-name">
                                    {participant.nickname}
                                    {participant.id === userSettings.id && ' (You)'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Drawing Controls */}
            <div className="drawing-controls">
                <div className="control-group">
                    <label htmlFor="lineWidth">Line Width:</label>
                    <input
                        id="lineWidth"
                        type="range"
                        min="1"
                        max="10"
                        value={lineWidth}
                        onChange={(e) => setLineWidth(Number(e.target.value))}
                        className="line-width-slider"
                    />
                    <span className="line-width-value">{lineWidth}px</span>
                </div>
            </div>

            {/* Canvas */}
            <div className="canvas-wrapper">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="drawing-canvas"
                />
            </div>
        </div>
    );
}; 