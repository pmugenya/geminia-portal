// jwt.service.ts
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
    providedIn: 'root'
})
export class JwtService {
    private jwtHelper = new JwtHelperService();


    getToken(): string | null {
        return sessionStorage.getItem('accessToken'); // or sessionStorage
    }

    isTokenExpired(token?: string): boolean {
        if (!token) token = this.getToken()!;
        console.log(token);
        return !token || this.jwtHelper.isTokenExpired(token);
    }

    decodeToken(token?: string): any {
        if (!token) token = this.getToken()!;
        return token ? this.jwtHelper.decodeToken(token) : null;
    }
}
