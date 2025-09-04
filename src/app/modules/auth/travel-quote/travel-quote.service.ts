import { Injectable } from '@angular/core';

// Define the structure of a quote object for clarity
export interface TravelQuote {
    planDetails: {
        name: string;
        duration: string;
    };
    travelerDetails: any; // You can create a more specific interface for this
    premiumSummary: any; // And for this as well
}

@Injectable({
  providedIn: 'root'
})
export class TravelQuoteService {

  private readonly QUOTE_STORAGE_KEY = 'fidelity_travel_quote';

  constructor() { }

  /**
   * Saves the provided travel quote details to the browser's localStorage.
   * This resolves the error: "Property 'saveQuote' does not exist on type 'TravelQuoteService'".
   * @param quote The travel quote object to save.
   */
  saveQuote(quote: TravelQuote): void {
    try {
      localStorage.setItem(this.QUOTE_STORAGE_KEY, JSON.stringify(quote));
      console.log('Quote saved successfully to localStorage.');
    } catch (e) {
      console.error('Error saving quote to localStorage', e);
    }
  }

  /**
   * Retrieves the saved travel quote from localStorage.
   * @returns The parsed travel quote object or null if not found.
   */
  getSavedQuote(): TravelQuote | null {
    try {
      const savedQuote = localStorage.getItem(this.QUOTE_STORAGE_KEY);
      return savedQuote ? JSON.parse(savedQuote) : null;
    } catch (e) {
      console.error('Error retrieving quote from localStorage', e);
      return null;
    }
  }

  /**
   * Clears the saved quote from localStorage.
   */
  clearQuote(): void {
    localStorage.removeItem(this.QUOTE_STORAGE_KEY);
  }
}