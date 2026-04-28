import type { Camera } from './camera';
import { canvasHeight, canvasWidth, initialZoom, Themes } from './data/constants';
import type { StageDef } from './data/maps';
import type { GameObject } from './gameObject';
import { KeywordService } from './keywordService';
import type { Marble } from './marble';
import type { ParticleManager } from './particleManager';
import type { ColorTheme } from './types/ColorTheme';
import type { MapEntityState } from './types/MapEntity.type';
import type { VectorLike } from './types/VectorLike';
import type { UIObject } from './UIObject';

export type RenderParameters = {
  camera: Camera;
  stage: StageDef;
  entities: MapEntityState[];
  marbles: Marble[];
  winners: Marble[];
  particleManager: ParticleManager;
  effects: GameObject[];
  winningCount: number;
  selectedWinners: Marble[];
  size: VectorLike;
  theme: ColorTheme;
};

export class RouletteRenderer {
  protected _canvas!: HTMLCanvasElement;
  protected ctx!: CanvasRenderingContext2D;
  public sizeFactor = 1;

  protected _images: { [key: string]: HTMLImageElement } = {};
  protected _theme: ColorTheme = Themes.dark;
  protected _keywordService: KeywordService;

  constructor() {
    this._keywordService = this.createKeywordService();
  }

  protected createKeywordService(): KeywordService {
    return new KeywordService();
  }

  get width() {
    return this._canvas.width;
  }

  get height() {
    return this._canvas.height;
  }

  get canvas() {
    return this._canvas;
  }

  set theme(value: ColorTheme) {
    this._theme = value;
  }

  async init() {
    await Promise.all([this._load(), this._keywordService.init()]);

    this._canvas = document.createElement('canvas');
    this._canvas.width = canvasWidth;
    this._canvas.height = canvasHeight;
    this.ctx = this._canvas.getContext('2d', {
      alpha: false,
    }) as CanvasRenderingContext2D;

    document.body.appendChild(this._canvas);

    const resizing = (entries?: ResizeObserverEntry[]) => {
      const realSize = entries ? entries[0].contentRect : this._canvas.getBoundingClientRect();
      const width = Math.max(realSize.width / 2, 640);
      const height = (width / realSize.width) * realSize.height;
      this._canvas.width = width;
      this._canvas.height = height;
      this.sizeFactor = width / realSize.width;
    };

    const resizeObserver = new ResizeObserver(resizing);

    resizeObserver.observe(this._canvas);
    resizing();
  }

  private async _loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((rs) => {
      const img = new Image();
      img.addEventListener('load', () => {
        rs(img);
      });
      img.src = url;
    });
  }

  private async _load(): Promise<void> {
    const loadPromises = [
      { name: '챔루', imgUrl: new URL('../assets/images/chamru.png', import.meta.url) },
      { name: '쿠빈', imgUrl: new URL('../assets/images/kubin.png', import.meta.url) },
      { name: '꽉변', imgUrl: new URL('../assets/images/kkwak.png', import.meta.url) },
      { name: '꽉변호사', imgUrl: new URL('../assets/images/kkwak.png', import.meta.url) },
      { name: '꽉 변호사', imgUrl: new URL('../assets/images/kkwak.png', import.meta.url) },
      { name: '주누피', imgUrl: new URL('../assets/images/junyoop.png', import.meta.url) },
      { name: '왈도쿤', imgUrl: new URL('../assets/images/waldokun.png', import.meta.url) },
    ].map(({ name, imgUrl }) => {
      return (async () => {
        this._images[name] = await this._loadImage(imgUrl.toString());
      })();
    });

    loadPromises.push(
      (async () => {
        await this._loadImage(new URL('../assets/images/ff.svg', import.meta.url).toString());
      })()
    );

    await Promise.all(loadPromises);
  }

  private getMarbleImage(name: string): CanvasImageSource | undefined {
    // Priority 1: Hardcoded images
    if (this._images[name]) {
      return this._images[name];
    }
    // Priority 2: Keyword sprites from API
    return this._keywordService.getSprite(name);
  }

  protected onBeforeEntities(): void {}
  protected onAfterScene(): void {}

  render(renderParameters: RenderParameters, uiObjects: UIObject[]) {
    this._theme = renderParameters.theme;
    this.ctx.fillStyle = this._theme.background;
    this.ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

    this.ctx.save();
    this.ctx.scale(initialZoom, initialZoom);
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.font = '0.4pt sans-serif';
    this.ctx.lineWidth = 3 / (renderParameters.camera.zoom + initialZoom);
    renderParameters.camera.renderScene(this.ctx, () => {
      this.onBeforeEntities();
      this.renderEntities(renderParameters.entities);
      this.renderEffects(renderParameters);
      this.renderMarbles(renderParameters);
    });
    this.ctx.restore();
    this.onAfterScene();

    uiObjects.forEach((obj) => obj.render(this.ctx, renderParameters, this._canvas.width, this._canvas.height));
    renderParameters.particleManager.render(this.ctx);
    this.renderWinner(renderParameters);
  }

  private renderEntities(entities: MapEntityState[]) {
    this.ctx.save();
    entities.forEach((entity) => {
      const transform = this.ctx.getTransform();
      this.ctx.translate(entity.x, entity.y);
      this.ctx.rotate(entity.angle);
      this.ctx.fillStyle = entity.shape.color ?? this._theme.entity[entity.shape.type].fill;
      this.ctx.strokeStyle = entity.shape.color ?? this._theme.entity[entity.shape.type].outline;
      this.ctx.shadowBlur = this._theme.entity[entity.shape.type].bloomRadius;
      this.ctx.shadowColor =
        entity.shape.bloomColor ?? entity.shape.color ?? this._theme.entity[entity.shape.type].bloom;
      const shape = entity.shape;
      switch (shape.type) {
        case 'polyline':
          if (shape.points.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(shape.points[0][0], shape.points[0][1]);
            for (let i = 1; i < shape.points.length; i++) {
              this.ctx.lineTo(shape.points[i][0], shape.points[i][1]);
            }
            this.ctx.stroke();
          }
          break;
        case 'box': {
          const w = shape.width * 2;
          const h = shape.height * 2;
          this.ctx.rotate(shape.rotation);
          this.ctx.fillRect(-w / 2, -h / 2, w, h);
          this.ctx.strokeRect(-w / 2, -h / 2, w, h);
          break;
        }
        case 'circle':
          this.ctx.beginPath();
          this.ctx.arc(0, 0, shape.radius, 0, Math.PI * 2, false);
          this.ctx.stroke();
          break;
      }

      this.ctx.setTransform(transform);
    });
    this.ctx.restore();
  }

  private renderEffects({ effects, camera }: RenderParameters) {
    effects.forEach((effect) => effect.render(this.ctx, camera.zoom * initialZoom, this._theme));
  }

  private renderMarbles({ marbles, camera, winningCount, winners, size }: RenderParameters) {
    const remainingWinnerSlots = Math.max(0, winningCount - winners.length);

    const viewPort = { x: camera.x, y: camera.y, w: size.x, h: size.y, zoom: camera.zoom * initialZoom };
    marbles.forEach((marble, i) => {
      marble.render(
        this.ctx,
        camera.zoom * initialZoom,
        i < remainingWinnerSlots,
        false,
        this.getMarbleImage(marble.name),
        viewPort,
        this._theme
      );
    });
  }

  private getCanvasToCssScale(): number {
    const canvasRect = this._canvas.getBoundingClientRect();
    if (canvasRect.width <= 0) return this.sizeFactor || 1;
    return this._canvas.width / canvasRect.width;
  }

  private getSettingsTopInCssPixels(): number | null {
    const settingsElement = document.getElementById('settings');
    if (!settingsElement) return null;

    const canvasRect = this._canvas.getBoundingClientRect();
    const settingsRect = settingsElement.getBoundingClientRect();
    if (settingsRect.width <= 0 || settingsRect.height <= 0) return null;

    const settingsTop = settingsRect.top - canvasRect.top;
    if (!Number.isFinite(settingsTop)) return null;

    return Math.max(0, settingsTop);
  }

  private fitText(text: string, maxWidth: number): string {
    if (this.ctx.measureText(text).width <= maxWidth) return text;

    const ellipsis = '...';
    let low = 0;
    let high = text.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (this.ctx.measureText(`${text.slice(0, mid)}${ellipsis}`).width <= maxWidth) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return `${text.slice(0, low)}${ellipsis}`;
  }

  private renderWinner({ selectedWinners, theme }: RenderParameters) {
    if (selectedWinners.length === 0) return;

    this.ctx.save();
    const scale = this.getCanvasToCssScale();
    const canvasWidth = this._canvas.width / scale;
    const canvasHeight = this._canvas.height / scale;
    this.ctx.scale(scale, scale);

    const visibleWinners = selectedWinners.slice(0, 10);
    const margin = 18;
    const settingsTop = this.getSettingsTopInCssPixels();
    const bottomLimit =
      settingsTop && settingsTop > canvasHeight * 0.35
        ? Math.max(margin + 240, settingsTop - margin)
        : canvasHeight - margin;
    const availableHeight = Math.max(240, bottomLimit - margin);
    const panelWidth = Math.min(560, canvasWidth - margin * 2);
    const titleFontSize = Math.min(42, Math.max(24, Math.floor(availableHeight * 0.11)));
    const titleTopPadding = Math.max(16, Math.floor(titleFontSize * 0.45));
    const titleBlockHeight = titleTopPadding + titleFontSize + 18;
    const bottomPadding = 16;
    const rowHeight = Math.min(
      48,
      Math.max(24, Math.floor((availableHeight - titleBlockHeight - bottomPadding) / visibleWinners.length))
    );
    const nameFontSize = Math.max(16, Math.min(30, Math.floor(rowHeight * 0.68)));
    const marbleSize = Math.max(18, Math.min(32, Math.floor(rowHeight * 0.72)));
    const panelHeight = titleBlockHeight + visibleWinners.length * rowHeight + bottomPadding;
    const panelX = Math.max(margin, canvasWidth - panelWidth - margin);
    const panelY = Math.max(margin, margin + Math.floor((availableHeight - panelHeight) / 2));

    this.ctx.fillStyle = theme.winnerBackground;
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    this.ctx.fillStyle = theme.winnerText;
    this.ctx.strokeStyle = theme.winnerOutline;
    this.ctx.textAlign = 'left';
    this.ctx.lineWidth = 3;
    this.ctx.textBaseline = 'alphabetic';
    this.ctx.font = `bold ${titleFontSize}px sans-serif`;
    const title = 'Winners';
    const titleY = panelY + titleTopPadding + titleFontSize;
    if (theme.winnerOutline) {
      this.ctx.strokeText(title, panelX + 24, titleY);
    }
    this.ctx.fillText(title, panelX + 24, titleY);

    visibleWinners.forEach((winner, index) => {
      const rowTop = panelY + titleBlockHeight + index * rowHeight;
      const textY = rowTop + Math.floor((rowHeight + nameFontSize) / 2) - 2;
      const marbleX = panelX + 24;
      const marbleY = rowTop + Math.floor((rowHeight - marbleSize) / 2);
      const marbleImage = this.getMarbleImage(winner.name);

      if (marbleImage) {
        this.ctx.drawImage(marbleImage, marbleX, marbleY, marbleSize, marbleSize);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(marbleX + marbleSize / 2, marbleY + marbleSize / 2, marbleSize / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsl(${winner.hue} 100% ${theme.marbleLightness}%)`;
        this.ctx.fill();
      }

      this.ctx.font = `bold ${nameFontSize}px sans-serif`;
      this.ctx.fillStyle = `hsl(${winner.hue} 100% ${theme.marbleLightness}%)`;
      const textX = marbleX + marbleSize + 16;
      const text = this.fitText(`#${index + 1} ${winner.name}`, panelX + panelWidth - 24 - textX);
      if (theme.winnerOutline) {
        this.ctx.strokeText(text, textX, textY);
      }
      this.ctx.fillText(text, textX, textY);
    });
    this.ctx.restore();
  }
}
