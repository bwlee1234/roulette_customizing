import { pad } from './utils';

export class VideoRecorder {
  private targetCanvas: HTMLCanvasElement;
  private mediaRecorder?: MediaRecorder;
  private videoStream?: MediaStream;
  private mimeType = 'video/webm';

  private chunks: Blob[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.targetCanvas = canvas;
  }

  public get isSupported() {
    return typeof this.targetCanvas.captureStream === 'function' && typeof MediaRecorder !== 'undefined';
  }

  public async start() {
    if (!this.isSupported || !this.ensureMediaRecorder()) {
      console.warn('[VideoRecorder] Recording is not supported in this browser.');
      return;
    }

    if (!this.mediaRecorder || this.mediaRecorder.state !== 'inactive') {
      return;
    }

    return new Promise<void>((rs) => {
      this.chunks = [];
      this.mediaRecorder!.ondataavailable = (e: BlobEvent) => {
        this.chunks.push(e.data);
      };
      this.mediaRecorder!.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType });
        const videoUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        const d = new Date();

        downloadLink.href = videoUrl;
        downloadLink.download = `wheel_of_fortune_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.${this.getFileExtension()}`;
        downloadLink.click();
        downloadLink.remove();
        URL.revokeObjectURL(videoUrl);
      };
      this.mediaRecorder!.onstart = () => {
        rs();
      };
      this.mediaRecorder!.start();
    });
  }

  public stop() {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  private ensureMediaRecorder() {
    if (this.mediaRecorder) {
      return true;
    }

    const mimeType = this.getSupportedMimeType();
    try {
      this.videoStream = this.targetCanvas.captureStream();
      this.mediaRecorder = new MediaRecorder(this.videoStream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 6000000,
      });
      this.mimeType = this.mediaRecorder.mimeType || mimeType || this.mimeType;
      return true;
    } catch (error) {
      console.warn('[VideoRecorder] Failed to initialize MediaRecorder.', error);
      return false;
    }
  }

  private getSupportedMimeType() {
    if (typeof MediaRecorder.isTypeSupported !== 'function') {
      return '';
    }

    const candidates = [
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? '';
  }

  private getFileExtension() {
    return this.mimeType.includes('mp4') ? 'mp4' : 'webm';
  }
}
