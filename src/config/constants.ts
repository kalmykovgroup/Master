export const ORDER_CATEGORIES = [
  'plumbing',
  'electrical',
  'cleaning',
  'renovation',
  'furniture',
  'appliances',
  'painting',
  'landscaping',
  'moving',
  'locksmith',
  'hvac',
  'roofing',
  'windows',
  'flooring',
  'tiling',
  'welding',
  'carpentry',
  'pest_control',
  'security',
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

export const APP_VERSION = '1.0.0';
