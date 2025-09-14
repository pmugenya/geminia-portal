import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class QuoteService {

    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    createQuote(
        formData:FormData
    ): Observable<any> {
        return this.http.post(`${this.baseUrl}/quote`, formData);
    }

    createApplication(
        formData:FormData
    ): Observable<any> {
        return this.http.post(`${this.baseUrl}/shippingapplication`, formData);
    }

    stkPush(phone: string, amount: number, refNo: string): Observable<any> {
        const params = new HttpParams()
            .set('phone', phone)
            .set('amount', amount.toString())
            .set('refNo', refNo);

        return this.http.get(`${this.baseUrl}/payments/stkpush`, { params });
    }

    validatePayment(merchantId: string, requestId: string): Observable<any> {
        const params = new HttpParams()
            .set('merchantId', merchantId)
            .set('requestId', requestId);

        return this.http.get<any>(`${this.baseUrl}/payments/validate`, { params });
    }
}
