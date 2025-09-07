import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, ReplaySubject, tap } from 'rxjs';
import {
    CargoTypeData,
    Category,
    CreateUserObject,
    MarineProduct,
    PackagingType,
    User,
} from 'app/core/user/user.types';
import { StoredUser } from '../../modules/auth/shared/services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
    private _httpClient = inject(HttpClient);
    private _user: ReplaySubject<StoredUser> = new ReplaySubject<StoredUser>(1);
    private createdUser: ReplaySubject<CreateUserObject> = new ReplaySubject<CreateUserObject>(1);
    private baseUrl = environment.apiUrl;
    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     * @param value
     */

    set user(value: StoredUser) {
        // Store the value
        this._user.next(value);
    }


    get user$(): Observable<StoredUser> {
        return this._user.asObservable();
    }

    createUser(user: CreateUserObject): Observable<any> {
        return this._httpClient.post<CreateUserObject>(
            `${this.baseUrl}/self/registration/user`,
            user   // send user directly, not { user }
        ).pipe(
            map((response) => {
                this.createdUser.next(response);
                return response;  // return so subscriber gets it
            })
        );
    }

    getMarineProducts(): Observable<MarineProduct[]> {
        return this._httpClient.get<MarineProduct[]>(`${this.baseUrl}/products`);
    }

    getMarinePackagingTypes(): Observable<PackagingType[]> {
        return this._httpClient.get<PackagingType[]>(`${this.baseUrl}/packagingtypes`);
    }

    getMarineCategories(): Observable<Category[]> {
        return this._httpClient.get<Category[]>(`${this.baseUrl}/categories`);
    }

    getCargoTypesByCategory(categoryId: number): Observable<CargoTypeData[]> {
        return this._httpClient.get<CargoTypeData[]>(`${this.baseUrl}/cargotypes/${categoryId}`);
    }

    getClientQuotes(offset: number, limit: number): Observable<any> {
        let params = new HttpParams()
            .set('offset', offset.toString())
            .set('limit', limit.toString());

        return this._httpClient.get<any>(`${this.baseUrl}/quote/clientquotes`, { params });
    }

    getClientPolicies(offset: number, limit: number): Observable<any> {
        let params = new HttpParams()
            .set('offset', offset.toString())
            .set('limit', limit.toString());

        return this._httpClient.get<any>(`${this.baseUrl}/shippingapplication/approvedapplications`, { params });
    }

    downloadQuote(quoteId: string) {
        return this._httpClient.get(`${this.baseUrl}/quote/download/${quoteId}`, {
            responseType: 'text'
        });
    }

}
