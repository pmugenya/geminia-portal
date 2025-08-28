import { Injectable } from '@angular/core';
import {
    HttpInterceptor,
    HttpRequest,
    HttpHandler,
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
} from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const notFoundInterceptor = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            console.log(error);
            if (error.status === 404) {
                console.warn('Global 404 handler:', req.url);
                // Option A: return fallback
                return throwError(() => error);
                // Option B: rethrow if you want components to decide
                // return throwError(() => error);
            }
            return throwError(() => error);
        })
    );
}
