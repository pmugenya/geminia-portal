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

// Extended quote with metadata for dashboard
export interface SavedTravelQuote extends TravelQuote {
    id: string;
    refno: string;
    status: string;
    createDate: string;
    prodName: string;
}

@Injectable({
  providedIn: 'root'
})
export class TravelQuoteService {

  private readonly QUOTE_STORAGE_KEY = 'fidelity_travel_quote';
  private readonly QUOTES_LIST_KEY = 'fidelity_travel_quotes_list';

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

  /**
   * Saves a quote to the quotes list with metadata for dashboard display
   */
  saveQuoteToList(quoteData: { quote: TravelQuote; id: string; refno: string; status: string }): void {
    try {
      const existingQuotes = this.getAllQuotes();
      
      const savedQuote: SavedTravelQuote = {
        ...quoteData.quote,
        id: quoteData.id,
        refno: quoteData.refno,
        status: quoteData.status,
        createDate: new Date().toISOString(),
        prodName: 'Travel Insurance'
      };
      
      // Check if quote already exists (by id) and update it
      const existingIndex = existingQuotes.findIndex(q => q.id === quoteData.id);
      if (existingIndex !== -1) {
        existingQuotes[existingIndex] = savedQuote;
      } else {
        existingQuotes.push(savedQuote);
      }
      
      localStorage.setItem(this.QUOTES_LIST_KEY, JSON.stringify(existingQuotes));
      console.log('Quote saved to list:', savedQuote);
    } catch (e) {
      console.error('Error saving quote to list', e);
    }
  }

  /**
   * Retrieves all saved travel quotes from localStorage
   * @returns Array of saved travel quotes
   */
  getAllQuotes(): SavedTravelQuote[] {
    try {
      const quotesJson = localStorage.getItem(this.QUOTES_LIST_KEY);
      return quotesJson ? JSON.parse(quotesJson) : [];
    } catch (e) {
      console.error('Error retrieving quotes list', e);
      return [];
    }
  }

  /**
   * Clears all saved quotes from localStorage
   */
  clearAllQuotes(): void {
    localStorage.removeItem(this.QUOTES_LIST_KEY);
  }

  /**
   * Updates the status of a specific travel quote in the list.
   * @param refno The reference number of the quote to update.
   * @param status The new status for the quote.
   */
  getQuoteById(quoteId: string): SavedTravelQuote | null {
    const quotes = this.getAllQuotes();
    return quotes.find(q => q.id === quoteId) || null;
  }

  updateQuoteStatus(refno: string, status: 'DRAFT' | 'PENDING' | 'PAID' | 'EXPIRED'): void {
    try {
      const quotes = this.getAllQuotes();
      const quoteIndex = quotes.findIndex(q => q.refno === refno);

      if (quoteIndex !== -1) {
        quotes[quoteIndex].status = status;
        localStorage.setItem(this.QUOTES_LIST_KEY, JSON.stringify(quotes));
        console.log(`Status for quote ${refno} updated to ${status}.`);
      } else {
        console.warn(`Quote with refno ${refno} not found for status update.`);
      }
    } catch (e) {
      console.error('Error updating quote status in localStorage', e);
    }
  }
}