declare module "razorpay" {
  export default class Razorpay {
    constructor(options: { key_id: string; key_secret: string });
    orders: {
      create(params: {
        amount: number;
        currency: string;
        receipt?: string;
        notes?: Record<string, string>;
        partial_payment?: boolean;
      }): Promise<{
        id: string;
        entity: string;
        amount: number;
        amount_paid: number;
        amount_due: number;
        currency: string;
        receipt?: string;
        status: string;
        attempts: number;
        created_at: number;
      }>;
      fetch(orderId: string): Promise<any>;
    };
    payments: {
      fetch(paymentId: string): Promise<any>;
      capture(paymentId: string, amount: number, currency: string): Promise<any>;
    };
  }
}
