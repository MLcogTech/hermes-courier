export enum GameState {
  ACT_1 = 'ACT_1',
  TRANSITION = 'TRANSITION',
  ACT_2 = 'ACT_2',
  EPILOGUE = 'EPILOGUE',
}

export class GameStateManager {
  current: GameState = GameState.ACT_1;

  update(dt: number, contextElapsed: number): void {
    // KIPP drives the FSM transitions
    if (contextElapsed > 30 && this.current === GameState.ACT_1) {
      this.current = GameState.TRANSITION;
    } else if (contextElapsed > 45 && this.current === GameState.TRANSITION) {
      this.current = GameState.ACT_2;
    } else if (contextElapsed > 90 && this.current === GameState.ACT_2) {
      this.current = GameState.EPILOGUE;
    }
  }
}
