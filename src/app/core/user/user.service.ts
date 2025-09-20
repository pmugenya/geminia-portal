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

    getSingleQuote(quoteId: string): Observable<any> {
        return this._httpClient.get<any>(`${this.baseUrl}/quote/singlequote/${quoteId}`);
    }

    getQuoteStatus(quoteId: number): Observable<string> {
        return this._httpClient.get<string>(`${this.baseUrl}/quote/quotStatus/${quoteId}`);
    }

    getShippingData(applicationId: number): Observable<any> {
        return this._httpClient.get<any>(`${this.baseUrl}/shippingapplication/${applicationId}`);
    }

    getClientPolicies(offset: number, limit: number): Observable<any> {
        let params = new HttpParams()
            .set('offset', offset.toString())
            .set('limit', limit.toString());

        return this._httpClient.get<any>(`${this.baseUrl}/shippingapplication/approvedapplications`, { params });
    }

    getCountries(offset: number, limit: number,type: number): Observable<any> {
        let params = new HttpParams()
            .set('offset', offset.toString())
            .set('limit', limit.toString())
            .set('type', type.toString());

        return this._httpClient.get<any>(`${this.baseUrl}/self/countries`, { params });
    }

    getCounties(offset: number, limit: number): Observable<any> {
        let params = new HttpParams()
            .set('offset', offset.toString())
            .set('limit', limit.toString());

        return this._httpClient.get<any>(`${this.baseUrl}/ports/counties`, { params });
    }

    downloadQuote(quoteId: string) {
        return this._httpClient.get(`${this.baseUrl}/quote/download/${quoteId}`, {
            responseType: 'text'
        });
    }
    //the save quote method is embedded here where we can call actual API
    getSingleQuoteForEditing(quoteId: string): Observable<any> {
        return this._httpClient.get(`${this.baseUrl}/quotes/${quoteId}/edit`);
    }

    getPorts(countryId: number, type: string, offset: number, limit: number, sqlSearch?: string
    ): Observable<any> {
        let params = new HttpParams()
            .set('type', type)
            .set('offset', offset.toString())
            .set('limit', limit.toString());

        if (sqlSearch) {
            params = params.set('sqlSearch', sqlSearch);
        }
        return this._httpClient.get<any>(
            `${this.baseUrl}/ports/${countryId}`,
            { params }
        );
    }

}
