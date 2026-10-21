import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LandingComponent } from './landing.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create landing component', () => {
    expect(component).toBeTruthy();
  });

  it('should open and close feature modal when openFeatureModal / closeFeatureModal is called', () => {
    expect(component.modalOpen).toBeFalse();
    expect(component.featureContent).toBeNull();

    component.openFeatureModal('secure');
    expect(component.modalOpen).toBeTrue();
    expect(component.featureContent?.title).toBe('Secure & Safe');

    component.closeFeatureModal();
    expect(component.modalOpen).toBeFalse();
    expect(component.featureContent).toBeNull();
  });

  it('should set correct content for instant booking and earn money modals', () => {
    component.openFeatureModal('instant');
    expect(component.featureContent?.title).toBe('Instant Booking');

    component.openFeatureModal('earn');
    expect(component.featureContent?.title).toBe('Earn Money');
  });
});
