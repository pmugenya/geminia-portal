import { inject } from '@angular/core';

import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { of, switchMap } from 'rxjs';

export const NoAuthGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Use the authService's check() method to see if the user has a VALID session.
    return authService.check().pipe(
        switchMap((authenticated) => {
            // If the user is authenticated...
            console.log(authenticated);
            if (authenticated) {
                // Redirect them to the dashboard.
                router.navigate(['/dashboard']);
                // And prevent them from accessing the sign-in page.
                return of(false);
            }

            // Otherwise, if they are not authenticated, allow them to access the sign-in page.
            return of(true);
        })
    );
};
