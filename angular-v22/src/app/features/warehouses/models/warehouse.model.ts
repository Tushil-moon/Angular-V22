export interface Warehouse {
    id: string;
    name: string;
    code: string;
    isDefault: boolean;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    countryCode: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateWarehouseRequest {
    name: string;
    code: string;
    isDefault?: boolean;
}

export type UpdateWarehouseRequest = Partial<CreateWarehouseRequest>;

export interface ApiWarehousePayload {
    id: string;
    name: string;
    code: string;
    is_default?: boolean;
    address_line1?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country_code?: string | null;
    created_at?: string;
    updated_at?: string;
}
