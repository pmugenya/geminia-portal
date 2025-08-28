import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { Observable, catchError, throwError } from 'rxjs';

/**
 * Intercept
 *
 * @param req
 * @param next
 */
export const authInterceptor = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);

    // Clone the request object
    const publicApiUrls = [
        '/api/v1/login',
        '/api/v1/login/validate',
        // Also include local assets to prevent them from being processed
        '/assets/',
        '/i18n/'
    ];

    // Check if the request is for a public API endpoint or a local asset
    const isPublicUrl = publicApiUrls.some(url => req.url.includes(url));

    // --- Logic for PUBLIC API calls (Login, OTP) and local assets ---
    if (isPublicUrl) {
        console.log(`Interceptor: Bypassing token logic for public URL: ${req.url}`);
        // Only add the TenantId header for these requests
        const publicReq = req.clone({
            headers: req.headers.set('Fineract-Platform-TenantId', 'default'),
        });
        // Pass it through WITHOUT the 401 catchError logic. The component will handle errors.
        return next(publicReq);
    }

    // --- Logic for all other SECURE API calls ---
    let secureReq = req.clone({
        headers: req.headers.set('Fineract-Platform-TenantId', 'default'),
    });

    // Restore the check for a valid, non-expired accessToken
    if (authService.accessToken && !AuthUtils.isTokenExpired(authService.accessToken)) {
        secureReq = secureReq.clone({
            headers: secureReq.headers.set('Authorization', 'Bearer ' + authService.accessToken),
        });
    }

    // Apply the 401 catchError logic ONLY for secure routes to handle session timeouts.
    return next(secureReq).pipe(
        catchError((error) => {
            console.log('Interceptor caught an error on a secure route:', error);
            if (error instanceof HttpErrorResponse && error.status === 401) {
                authService.signOut();
                location.reload();
            }
            return throwError(() => error);
        })
    );
};
    // --- KEY FIX: The whitelist MUST contain the API paths for the multi-step login process ---
    // These are "public" to the interceptor because they do not require a final Authorization Bearer token.

