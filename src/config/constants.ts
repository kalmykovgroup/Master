export const ORDER_CATEGORIES = [
  'plumbing',
  'electrical',
  'cleaning',
  'renovation',
  'furniture',
  'appliances',
  'other',
] as const;

export type OrderCategory = (typeof ORDER_CATEGORIES)[number];

export const ORDER_STATUSES = [
  'open',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const RESPONSE_STATUSES = ['pending', 'accepted', 'rejected'] as const;

export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

export const ROLES = ['client', 'master'] as const;

export type UserRole = (typeof ROLES)[number];

export const RATING_MIN = 1;
export const RATING_MAX = 5;
