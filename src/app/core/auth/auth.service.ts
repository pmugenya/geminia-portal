import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { UserService } from 'app/core/user/user.service';
import { catchError, Observable, of, switchMap, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { JwtService } from '../../modules/auth/shared/services/jwt.service';
import { AuthenticationService } from '../../modules/auth/shared/services/auth.service';
import { User } from '../user/user.types';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private _authenticated: boolean = false;
    private _httpClient = inject(HttpClient);
    private _userService = inject(UserService);
    private baseUrl = environment.apiUrl;
    private router = inject(Router);

    private jwtService: JwtService = inject(JwtService);
    private authenticationService: AuthenticationService = inject(AuthenticationService);
    private readonly STORAGE_KEYS = {
        USER_DATA: 'geminia_user_data'
    };

    // Keys for localStorage
    private readonly ACCESS_TOKEN_KEY = 'accessToken';
    private readonly TEMP_TOKEN_KEY = 'temp_auth_token';

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
<<<<<<< HEAD
     * Setter & getter for access token
     */
    set accessToken(token: string) {
        sessionStorage.setItem('accessToken', token);
    }

    get accessToken(): string {
        return sessionStorage.getItem('accessToken') ?? '';
    }

    // set accessToken(token: string) {
    //     if (token) {
    //         localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    //     } else {
    //         localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    //     }
    // }
    //
    // get accessToken(): string {
    //     return localStorage.getItem(this.ACCESS_TOKEN_KEY) ?? '';
    // }

    /**
     * Temporary token (before OTP)
     */
    set tempToken(token: string) {
        if (token) {
            localStorage.setItem(this.TEMP_TOKEN_KEY, token);
        } else {
            this.clearTempToken();
        }
    }

    get tempToken(): string {
        return localStorage.getItem(this.TEMP_TOKEN_KEY) ?? '';
    }

    clearTempToken(): void {
        localStorage.removeItem(this.TEMP_TOKEN_KEY);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
<<<<<<< HEAD
     * Forgot password
     *
     * @param email
     */
    forgotPassword(email: string): Observable<any> {
        return this._httpClient.post(`${this.baseUrl}/api/auth/forgot-password`, email);
    }

    /**
     * Reset password
     *
     * @param password
     */
    resetPassword(password: string): Observable<any> {
        return this._httpClient.post('api/auth/reset-password', password);
    }



    signIn(credentials: { username: string; password: string }): Observable<any> {
        return this._httpClient.post(`${this.baseUrl}/login`, credentials);
    }

    /**
     * Verify OTP (Step 2)
     */
    verifyOtp(payload: { tempToken: string; otp: string }): Observable<any> {
        // NOTE: The URL for OTP validation should be confirmed with your backend team.
        // Using '/login/validate' as per your previous instruction.
        const validationUrl = `${this.baseUrl}/login/validate`;

        return this._httpClient.post<any>(validationUrl, payload).pipe(
            tap((response: any) => {
                // Save final JWT from the correct property in the response
                this.accessToken = response.base64EncodedAuthenticationKey || response.token || '';
                this.authenticationService.setCurrentUser(response, this.accessToken);

                const token = this.accessToken;
                console.log('Received access token:', token);
                // Save user info if backend provides it
                    this._userService.user = response;

                // Clean up the temporary token now that it has been used
                this.clearTempToken();
            }),
            catchError((error) => {
                console.log(error);
                // Also clear the temp token on failure
                const devMessage = error?.error?.errors?.[0]?.developerMessage;
                return throwError(() => new Error(devMessage || 'Invalid OTP. Please try again.'));
            })
        );
    }

    /**
     * Sign out
     */
    signOut(): void {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('userType');
        sessionStorage.removeItem(this.STORAGE_KEYS.USER_DATA);
        // Remove the access token from the local storage
        localStorage.removeItem('accessToken');
        // Return the observable
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        this.clearTempToken();
        this._authenticated = false;
        this.router.navigate(['/sign-in']);
    }

    /**
<<<<<<< HEAD
     * Sign up
     *
     * @param user
     */
    signUp(user: {
        name: string;
        email: string;
        password: string;
        company: string;
    }): Observable<any> {
        return this._httpClient.post('api/auth/sign-up', user);
    }

    /**
     * Unlock session
     *
     * @param credentials
     */
    unlockSession(credentials: {
        email: string;
        password: string;
    }): Observable<any> {
        return this._httpClient.post('api/auth/unlock-session', credentials);
    }

    /**
     * Check the authentication status
     */
    check(): Observable<boolean> {
        // Check if the user is logged in
        // if (this._authenticated) {
        //     return of(true);
        // }

        // Check the access token availability
        if (!this.accessToken) {
            console.log('invalid token...');
            return of(false);
        }

        // Check the access token expire date
        if (AuthUtils.isTokenExpired(this.accessToken)) {
            console.log('expired token...');
            return of(false);
        }

        // If the access token exists, and it didn't expire, sign in using it
        return of(true);
    }
}

