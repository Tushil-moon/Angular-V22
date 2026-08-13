export type OrderStatus =
    | 'PENDING'
    | 'CONFIRMED'
    | 'PROCESSING'
    | 'PACKED'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'REFUNDED'
    | 'PARTIALLY_REFUNDED';

export interface OrderPrimaryItem {
    productName: string;
    variantTitle: string | null;
    imageUrl: string | null;
    imageAlt: string | null;
}

export interface Order {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    fulfillmentStatus: string;
    paymentStatus: string;
    currencyCode: string;
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    shippingTotal: number;
    grandTotal: number;
    amountRefunded: number;
    customerId: string | null;
    customerEmail: string;
    customerPhone: string | null;
    note: string | null;
    placedAt: string | null;
    cancelledAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
    primaryItem: OrderPrimaryItem | null;
    itemCount: number;
}

export interface OrderItem {
    id: string;
    productName: string;
    variantTitle: string | null;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface OrderAddress {
    id: string;
    type: string;
    name: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string | null;
    postalCode: string | null;
    countryCode: string;
    phone: string | null;
}

export interface OrderStatusHistoryEntry {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
}

export interface OrderDetail extends Order {
    items: OrderItem[];
    addresses: OrderAddress[];
    statusHistory: OrderStatusHistoryEntry[];
}

export interface OrderListFilters {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: OrderStatus | '';
}

export interface ApiOrderPayload {
    id: string;
    order_number: string;
    status?: string;
    fulfillment_status?: string;
    payment_status?: string;
    currency_code?: string;
    subtotal?: number | string;
    discount_total?: number | string;
    tax_total?: number | string;
    shipping_total?: number | string;
    grand_total?: number | string;
    amount_refunded?: number | string;
    customer_id?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    note?: string | null;
    placed_at?: string | null;
    cancelled_at?: string | null;
    completed_at?: string | null;
    created_at?: string;
    updated_at?: string;
    items?: ApiOrderListItemPayload[];
    _count?: { items?: number };
}

export interface ApiOrderListItemPayload {
    product_name?: string | null;
    variant_title?: string | null;
    variant?: {
        product?: {
            images?: Array<{ url?: string | null; alt_text?: string | null }>;
        };
    };
}

export interface ApiOrderItemPayload {
    id: string;
    product_name?: string | null;
    variant_title?: string | null;
    sku?: string | null;
    quantity?: number;
    unit_price?: number | string;
    line_total?: number | string;
}

export interface ApiOrderAddressPayload {
    id: string;
    type?: string;
    first_name?: string | null;
    last_name?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country_code?: string | null;
    phone?: string | null;
}

export interface ApiOrderStatusHistoryPayload {
    id: string;
    from_status?: string | null;
    to_status?: string;
    note?: string | null;
    created_at?: string;
}

export interface ApiOrderDetailPayload extends ApiOrderPayload {
    items?: ApiOrderItemPayload[];
    addresses?: ApiOrderAddressPayload[];
    status_history?: ApiOrderStatusHistoryPayload[];
}
