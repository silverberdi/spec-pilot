import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { App } from './app';

describe('App shell', () => {
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG({
          theme: {
            preset: Aura,
          },
        }),
      ],
    }).compileComponents();
  });

  it('renders SpecPilot success shell', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('SpecPilot');
    expect(el.querySelector('[data-state="success"]')).toBeTruthy();
  });

  it('surfaces an explicit error state for invalid bootstrap', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'invalid');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-state="error"]')).toBeTruthy();
    expect(el.textContent).toContain('No se pudo iniciar la consola');
  });
});
