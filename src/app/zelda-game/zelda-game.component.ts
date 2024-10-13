import { Component, OnInit, HostListener, PLATFORM_ID, Inject, ViewChild, ElementRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GameService } from '../game.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-zelda-game',
  templateUrl: './zelda-game.component.html',
  styleUrls: ['./zelda-game.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class ZeldaGameComponent implements OnInit {
  @ViewChild('gameContainer') gameContainer!: ElementRef;
  gameBoard: string[][];
  viewportSize = { width: 15, height: 15 }; // Visible area size
  viewportOffset = { x: 0, y: 0 }; // Offset for scrolling

  constructor(
    public gameService: GameService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.gameBoard = [];
    for (let i = 0; i < this.gameService.mapSize.height; i++) {
      this.gameBoard[i] = new Array(this.gameService.mapSize.width).fill('.');
    }
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.gameService.joinGame();
      this.gameService.gameState$.subscribe(state => {
        if (state) {
          this.updateGameBoard(state);
        }
      });
    }
  }

  updateGameBoard(state: any): void {
    // Reset the board
    for (let i = 0; i < this.gameService.mapSize.height; i++) {
      for (let j = 0; j < this.gameService.mapSize.width; j++) {
        this.gameBoard[i][j] = '.';
      }
    }

    // Update player positions
    if (state.players) {
      for (const playerId in state.players) {
        const player = state.players[playerId];
        if (player.x >= 0 && player.x < this.gameService.mapSize.width && 
            player.y >= 0 && player.y < this.gameService.mapSize.height) {
          this.gameBoard[player.y][player.x] = player.symbol;
          
          // Update viewport offset to center on the player
          this.viewportOffset.x = Math.max(0, Math.min(player.x - Math.floor(this.viewportSize.width / 2), this.gameService.mapSize.width - this.viewportSize.width));
          this.viewportOffset.y = Math.max(0, Math.min(player.y - Math.floor(this.viewportSize.height / 2), this.gameService.mapSize.height - this.viewportSize.height));
        }
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    switch (key) {
      case 'ArrowUp':
        this.gameService.movePlayer('up');
        break;
      case 'ArrowDown':
        this.gameService.movePlayer('down');
        break;
      case 'ArrowLeft':
        this.gameService.movePlayer('left');
        break;
      case 'ArrowRight':
        this.gameService.movePlayer('right');
        break;
    }
  }

  getVisibleBoard(): string[][] {
    return this.gameBoard
      .slice(this.viewportOffset.y, this.viewportOffset.y + this.viewportSize.height)
      .map(row => row.slice(this.viewportOffset.x, this.viewportOffset.x + this.viewportSize.width));
  }
}
