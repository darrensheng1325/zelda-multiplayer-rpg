import { Component, OnInit, HostListener, PLATFORM_ID, Inject, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GameService } from '../game.service';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { Obstacle } from '../models/obstacle.model';

@Component({
  selector: 'app-zelda-game',
  templateUrl: './zelda-game.component.html',
  styleUrls: ['./zelda-game.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class ZeldaGameComponent implements OnInit, AfterViewInit {
  @ViewChild('gameContainer') gameContainer!: ElementRef;
  gameBoard: string[][];
  viewportSize = { width: 15, height: 15 }; // Visible area size
  viewportOffset = { x: 0, y: 0 }; // Offset for scrolling
  cellSize = 40; // Size of each cell in pixels
  private updateSubscription: Subscription | null = null;
  isGameOver = false;
  score = 0;
  obstacles: Obstacle[] = [];

  constructor(
    public gameService: GameService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
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
          this.checkGameOver(state);
        }
      });

      // Set up periodic updates
      this.ngZone.runOutsideAngular(() => {
        this.updateSubscription = interval(16).subscribe(() => { // 60 FPS
          this.ngZone.run(() => {
            this.cdr.detectChanges();
          });
        });
      });
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.updateViewportSize();
      window.addEventListener('resize', () => this.updateViewportSize());
    }
  }

  ngOnDestroy(): void {
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
  }

  updateViewportSize(): void {
    const container = this.gameContainer.nativeElement;
    this.viewportSize.width = Math.floor(container.clientWidth / this.cellSize);
    this.viewportSize.height = Math.floor(container.clientHeight / this.cellSize);
    this.cdr.detectChanges();
  }

  updateGameBoard(state: any): void {
    console.log('Updating game board with state:', state);
    // Reset the board
    for (let i = 0; i < this.gameService.mapSize.height; i++) {
      for (let j = 0; j < this.gameService.mapSize.width; j++) {
        this.gameBoard[i][j] = '.';
      }
    }

    // Update obstacle positions
    if (state.obstacles) {
      this.obstacles = state.obstacles;
      this.obstacles.forEach(obstacle => {
        if (obstacle.x >= 0 && obstacle.x < this.gameService.mapSize.width && 
            obstacle.y >= 0 && obstacle.y < this.gameService.mapSize.height) {
          this.gameBoard[obstacle.y][obstacle.x] = obstacle.type === 'rock' ? 'R' : 'T';
        }
      });
    }

    // Update player positions
    if (state.players) {
      for (const playerId in state.players) {
        const player = state.players[playerId];
        if (player.x >= 0 && player.x < this.gameService.mapSize.width && 
            player.y >= 0 && player.y < this.gameService.mapSize.height) {
          this.gameBoard[player.y][player.x] = player.symbol;
        }
      }
    }

    // Update enemy positions
    if (state.enemies) {
      for (const enemyId in state.enemies) {
        const enemy = state.enemies[enemyId];
        if (enemy.x >= 0 && enemy.x < this.gameService.mapSize.width && 
            enemy.y >= 0 && enemy.y < this.gameService.mapSize.height) {
          this.gameBoard[enemy.y][enemy.x] = enemy.symbol;
        }
      }
    }

    // Update viewport offset to center on the player
    if (this.gameService.playerId && state.players && state.players[this.gameService.playerId]) {
      const player = state.players[this.gameService.playerId];
      this.viewportOffset.x = Math.max(0, Math.min(player.x - Math.floor(this.viewportSize.width / 2), this.gameService.mapSize.width - this.viewportSize.width));
      this.viewportOffset.y = Math.max(0, Math.min(player.y - Math.floor(this.viewportSize.height / 2), this.gameService.mapSize.height - this.viewportSize.height));
    }

    console.log('Updated game board:', this.gameBoard);
    console.log('Viewport offset:', this.viewportOffset);
  }

  checkGameOver(state: any): void {
    if (state.gameOver) {
      this.isGameOver = true;
      this.score = state.score || 0;
    }
  }

  restartGame(): void {
    this.isGameOver = false;
    this.score = 0;
    this.gameService.restartGame();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    event.preventDefault(); // Prevent default scroll behavior
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

  getCoordinates(x: number, y: number): string {
    return `${x},${y}`;
  }
}
