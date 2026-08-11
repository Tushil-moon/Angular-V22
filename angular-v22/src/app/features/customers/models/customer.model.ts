export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface Customer {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    fullName: string;
    status: CustomerStatus;
    acceptsMarketing: boolean;
    notes: string | null;
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lifetimeValue: number;
    lastOrderAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerAddress {
    id: string;
    type: string;
    label: string | null;
    name: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string | null;
    postalCode: string | null;
    countryCode: string;
    phone: string | null;
    isDefault: boolean;
}

export interface CustomerDetail extends Customer {
    addresses: CustomerAddress[];
}

export interface CustomerOrderSummary {
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: number;
    currencyCode: string;
    placedAt: string | null;
    createdAt: string;
}

export interface CustomerListFilters {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: CustomerStatus | '';
}

export interface CreateCustomerRequest {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
}

export interface ApiCustomerPayload {
    id: string;
    email?: string | null;
    phone?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    status?: string;
    accepts_marketing?: boolean;
    notes?: string | null;
    total_orders?: number;
    total_spent?: number | string;
    average_order_value?: number | string;
    lifetime_value?: number | string;
    last_order_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface ApiCustomerAddressPayload {
    id: string;
    type?: string;
    label?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country_code?: string | null;
    phone?: string | null;
    is_default?: boolean;
}

export interface ApiCustomerDetailPayload extends ApiCustomerPayload {
    addresses?: ApiCustomerAddressPayload[];
}

export interface ApiCustomerOrderPayload {
    id: string;
    order_number: string;
    status?: string;
    grand_total?: number | string;
    currency_code?: string;
    placed_at?: string | null;
    created_at?: string;
}
