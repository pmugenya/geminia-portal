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

export interface MarineProduct {
    id: number
    prodshtdesc: string;
    prodname: string;
    productid: number;
    productdisplay: number;
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
