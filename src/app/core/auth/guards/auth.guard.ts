import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { of, switchMap } from 'rxjs';

import { JwtService } from '../../../modules/auth/shared/services/jwt.service';

export const AuthGuard: CanActivateFn | CanActivateChildFn = (route, state) => {
    const router: Router = inject(Router);
    const jwtService: JwtService = inject(JwtService);

    // Allow navigation to public pages without checking token
    if (state.url.startsWith('/sign-in') || state.url.startsWith('/sign-up')) {
        return of(true);
    }

    return inject(AuthService).check().pipe(
        switchMap(() => {
            const expired = jwtService.isTokenExpired();
            console.log('token expired', expired);

            if (expired) {
                router.navigate(['/sign-in'], { queryParams: { redirectURL: state.url } });
                return of(false);
            }

            return of(true);
        })
    );
};


