export interface ReportJob {
    id: string;
    type: string;
    status: string;
    resultUrl: string | null;
    createdAt: string;
    completedAt: string | null;
}

export interface ApiReportPayload {
    id: string;
    type?: string;
    status?: string;
    result_url?: string | null;
    created_at?: string;
    completed_at?: string | null;
}
