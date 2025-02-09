import { OWWindow } from "@overwolf/overwolf-api-ts";

declare const overwolf: any;

type WindowNames = 'background' | 'mainWindow' | 'inGameWindow';

export class BackgroundController {
    private static _instance: BackgroundController;
    private _windows: Record<WindowNames, OWWindow>;
    private _gameRunning = false;

    private constructor() {
        this._windows = {
            background: new OWWindow('background'),
            mainWindow: new OWWindow('mainWindow'),
            inGameWindow: new OWWindow('inGameWindow')
        };
        this._init();
    }

    public static instance() {
        if (!this._instance) {
            this._instance = new BackgroundController();
        }
        return this._instance;
    }

    private async _init() {
        // When main window is closed, close all other windows
        overwolf.windows.onStateChanged.addListener(async (event: any) => {
            if (event.window_name === 'mainWindow' && event.window_state === 'closed') {
                // Close in-game window if it exists
                await this._windows['inGameWindow'].close();
                // Close background window last
                await this._windows['background'].close();
            }
        });

        // When a game starts running
        overwolf.games.onGameInfoUpdated.addListener(async (event: any) => {
            if (event.gameInfo.isRunning) {
                if (!this._gameRunning) {
                    this._gameRunning = true;
                    await this._windows['mainWindow'].minimize();
                    await this._windows['inGameWindow'].restore();
                }
            } else {
                if (this._gameRunning) {
                    this._gameRunning = false;
                    await this._windows['inGameWindow'].minimize();
                    await this._windows['mainWindow'].restore();
                }
            }
        });

        // Register hotkey
        overwolf.settings.hotkeys.onPressed.addListener(async (event: any) => {
            if (event.name === 'showhide') {
                const window = this._gameRunning ? this._windows['inGameWindow'] : this._windows['mainWindow'];
                const state = await window.getWindowState();
                if (state.success &&
                    (state.window_state === 'closed' || state.window_state === 'minimized')) {
                    await window.restore();
                } else {
                    await window.minimize();
                }
            }
        });

        // Start with main window
        await this._windows['mainWindow'].restore();
    }
} 