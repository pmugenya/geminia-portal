import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    EnvironmentProviders,
    Provider,
    inject,
    provideEnvironmentInitializer,
} from '@angular/core';
import { authInterceptor } from 'app/core/auth/auth.interceptor';
import { AuthService } from 'app/core/auth/auth.service';
import { notFoundInterceptor } from './not.found';

export const provideAuth = (): Array<Provider | EnvironmentProviders> => {
    return [
        provideHttpClient(withInterceptors([authInterceptor,notFoundInterceptor])),
        provideEnvironmentInitializer(() => inject(AuthService)),
    ];
};
