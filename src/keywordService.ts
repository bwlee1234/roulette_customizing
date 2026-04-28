export class KeywordService {
  async init(): Promise<void> {
    return Promise.resolve();
  }

  destroy(): void {}

  getSprite(_marbleName: string): CanvasImageSource | undefined {
    return undefined;
  }
}
