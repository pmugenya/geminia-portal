export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status?: string;
}
export interface CreateUserObject {
    firstName: string,
    password: string,
    passwordConfirm: string,
    clientType: string,
    docnumber: string,
    pinNumber: string,
    mobileno: string,
    email: string,
}

export interface QuoteResult {
    result: number,
    premium: number,
    phcf: number,
    tl: number,
    sd: number,
    netprem: number,
}

export interface MarineProduct {
    id: number
    prodshtdesc: string;
    prodname: string;
    productid: number;
    productdisplay: number;
}

export interface Country {
    id: number;
    countryname:string;
}

export interface County {
    id: number;
    portName:string;
}

export interface PackagingType {
    id: number;
    packingtype: string
}


export interface Category {
    id: number;
    catname: string
}

export interface CargoTypeData {
    id: number;
    ctname: string
}
