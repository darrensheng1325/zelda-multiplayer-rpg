import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject } from 'rxjs';

interface Player {
  x: number;
  y: number;
  symbol: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private socket: Socket | null = null;
  public gameState$: BehaviorSubject<any> = new BehaviorSubject(null);
  public mapSize = { width: 50, height: 50 }; // Increased map size
  private player: Player | null = null;
  public playerId: string | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.initSocket();
    }
  }

  private initSocket(): void {
    this.socket = io('http://localhost:3000');

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.playerId = this.socket?.id || null;
      console.log('Player ID:', this.playerId);
    });

    this.socket.on('gameState', (state: any) => {
      console.log('Received game state:', state);
      this.gameState$.next(state);
      if (this.playerId && state.players && state.players[this.playerId]) {
        this.player = state.players[this.playerId];
        console.log('Updated player position:', this.player);
      }
    });
  }

  movePlayer(direction: string): void {
    console.log('Move player:', direction);
    if (this.socket && this.player) {
      let newX = this.player.x;
      let newY = this.player.y;

      switch (direction) {
        case 'up':
          newY = Math.max(0, this.player.y - 1);
          break;
        case 'down':
          newY = Math.min(this.mapSize.height - 1, this.player.y + 1);
          break;
        case 'left':
          newX = Math.max(0, this.player.x - 1);
          break;
        case 'right':
          newX = Math.min(this.mapSize.width - 1, this.player.x + 1);
          break;
      }

      if (newX !== this.player.x || newY !== this.player.y) {
        console.log('Emitting movePlayer:', { x: newX, y: newY });
        this.socket.emit('movePlayer', { x: newX, y: newY });
      }
    }
  }

  joinGame(): void {
    if (this.socket) {
      console.log('Joining game');
      this.socket.emit('joinGame');
    }
  }

  restartGame(): void {
    if (this.socket) {
      console.log('Restarting game');
      this.socket.emit('restartGame');
    }
  }
}
