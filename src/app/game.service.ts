import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private socket: Socket | null = null;
  public gameState$: BehaviorSubject<any> = new BehaviorSubject(null);
  public mapSize = { width: 50, height: 50 }; // Increased map size

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.initSocket();
    }
  }

  private initSocket(): void {
    this.socket = io('http://localhost:3000');

    this.socket.on('gameState', (state: any) => {
      this.gameState$.next(state);
    });
  }

  movePlayer(direction: string): void {
    if (this.socket) {
      this.socket.emit('movePlayer', direction);
    }
  }

  joinGame(): void {
    if (this.socket) {
      this.socket.emit('joinGame');
    }
  }
}
