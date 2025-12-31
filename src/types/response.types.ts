/**
 * Standard API Response Structure
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorDetails;
  meta?: ResponseMeta;
}

export interface ErrorDetails {
  message: string;
  code?: string;
  details?: any;
}

export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  payment?: PaymentInfo;
  [key: string]: any;
}

export interface PaymentInfo {
  txId: string;
  amount: string;
  sender: string;
}
