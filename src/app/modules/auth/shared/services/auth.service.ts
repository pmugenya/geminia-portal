// src/app/shared/auth.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';

// --- TYPE DEFINITIONS ---
export interface StoredUser {
  username: string;
  userType: 'I' | 'A';
  loginTime: number;
  name: string;
  email: string;
  phoneNumber?: string;
}
export interface RegistrationData {
  fullName?: string;
  phoneNumber?: string;
}
export interface StoredCredentials {
  username: string;
  password: string;
  type: 'individual' | 'intermediary';
}
export interface PendingQuote {
    id: string;
    prodName: string;
    refno: string;
    status: string;
    createDate: string;
    description: any;
    netprem: any;
}


@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

    private readonly STORAGE_KEYS = {
        USER_DATA: 'geminia_user_data'
    };

    private currentUserSubject = new BehaviorSubject<StoredUser | null>(this.getStoredUser());
    public currentUser$ = this.currentUserSubject.asObservable();


    constructor() {
        const userData = sessionStorage.getItem(this.STORAGE_KEYS.USER_DATA);
        if (userData) {
            this.currentUserSubject.next(JSON.parse(userData));
        }
    }


    getStoredUser(): StoredUser | null {
        try {
            const userData = sessionStorage.getItem(this.STORAGE_KEYS.USER_DATA);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            return null;
        }
    }

    setCurrentUser(user: any, accessToken: string): void {
        this.currentUserSubject.next(user);
        sessionStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
        sessionStorage.setItem('accessToken', accessToken);
    }


    getCurrentUser(): StoredUser | null {
        return this.currentUserSubject.value;
    }

    logout(): void {
        try {
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('userType');
            this.currentUserSubject.next(null);
            sessionStorage.removeItem(this.STORAGE_KEYS.USER_DATA);
        } catch (error) {
            console.error('Failed to clear stored data:', error);
        }
    }



}
