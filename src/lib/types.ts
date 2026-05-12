export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface Item {
  id: string;
  category_id: string;
  name: string;
  sku: string;
  price: number;
  image_url: string;
  created_at: string;
}

export interface Poll {
  id: string;
  title: string;
  created_by: string;
  status: string;
  poll_url: string;
  created_at: string;
  finalized_at: string | null;
}

export interface PollVote {
  id: string;
  poll_id: string;
  item_id: string;
  user_name: string;
  quantity: number;
  created_at: string;
}

export interface PollDataEntry {
  sku: string;
  qty: number;
  name?: string;
}
