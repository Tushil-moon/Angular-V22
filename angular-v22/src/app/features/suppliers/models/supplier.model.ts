export interface Supplier {
    id: string;
    name: string;
    code: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    contactName: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSupplierRequest {
    name: string;
    code?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    contactName?: string | null;
    notes?: string | null;
}

export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;

export interface ApiSupplierPayload {
    id: string;
    name: string;
    code?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    contact_name?: string | null;
    notes?: string | null;
    created_at?: string;
    updated_at?: string;
}
