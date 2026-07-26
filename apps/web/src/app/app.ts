import { Component, computed, input, signal } from '@angular/core';
import { Card } from 'primeng/card';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';

export type ShellState = 'loading' | 'success' | 'error';

/** Minimal i18n-ready copy boundary (Spanish default). */
export const shellCopy = {
  es: {
    brand: 'SpecPilot',
    tagline: 'Consola local de aseguramiento para entrega gobernada con OpenSpec.',
    loading: 'Cargando la consola…',
    errorTitle: 'No se pudo iniciar la consola',
    errorDetail: 'Revise la configuración de arranque e intente de nuevo.',
    emptyRegion: 'Sin contenido en esta región.',
  },
} as const;

export type ShellLocale = keyof typeof shellCopy;

@Component({
  imports: [Card, Message, ProgressSpinner],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  /** Optional bootstrap override for tests (invalid forces error). */
  readonly bootstrapMode = input<'ok' | 'invalid'>('ok');

  private readonly locale = signal<ShellLocale>('es');
  private readonly state = signal<ShellState>('loading');

  readonly copy = computed(() => shellCopy[this.locale()]);
  readonly shellState = computed(() => this.state());

  constructor() {
    queueMicrotask(() => this.completeBootstrap());
  }

  private completeBootstrap(): void {
    if (this.bootstrapMode() === 'invalid') {
      this.state.set('error');
      return;
    }
    this.state.set('success');
  }
}
