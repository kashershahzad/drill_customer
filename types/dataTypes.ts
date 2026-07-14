export type OrderType = {
  id?: any;
  order_no?: string;
  status?: string;
  amount?: string;
  discount?: string;
  created_at?: string;
  timestamp?: string;
  payment_method?: string;
  method_details?: string;
  payment_status?: string;
  address?: string;
  description?: string;
  image_url?: string;
  images?: string;
  package_id?: string;
  arrived_at_location?: string;
  arrival_confirm?: string;
  work_started?: string;
  extra_added?: string;
  extra_amount?: string;
  extra_detail?: string;
  insulation_sheet?: string;
  item_image?: string;
  bill_image?: string;
  extra_paid_by?: string;
  extra_accepted?: string;
  /** Who covers the extra balance: "provider" | "customer" */
  extra_balance_payer?: string;
  /** Total extra amount paid/covered by provider */
  extra_paid_by_provider_total?: string;
  /** Total extra amount paid/covered by customer */
  extra_paid_by_customer_total?: string;
  job_time_finished?: string;
  bonus_time_started?: string;
  bonus_time_ended?: string;
  order_completed?: string;
  package?: {
    id: string;
    name: string;
    price: string;
    features?: string;
    [key: string]: any;
  };
  user?: {
    id: string;
    name?: string;
    image?: string;
    phone?: string;
    lat?: string;
    lng?: string;
    address?: string;
    [key: string]: any;
  };
  provider?: {
    id: string;
    name?: string;
    image?: string;
    phone?: string;
    [key: string]: any;
  };
  [key: string]: any;
};
