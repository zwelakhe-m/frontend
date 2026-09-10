import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export type CurrencyCode = 'ZAR' | 'USD' | 'EUR' | 'GBP';

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private readonly currency = (environment.defaultCurrency || 'ZAR') as CurrencyCode;
  private readonly locale = environment.defaultLocale || 'en-ZA';

  get symbol(): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: this.currency,
    })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value || this.currency;
  }

  format(amount: number | null | undefined, maximumFractionDigits = 2): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: this.currency,
      maximumFractionDigits,
    }).format(Number(amount) || 0);
  }
}
