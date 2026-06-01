import { SetMetadata } from '@nestjs/common';

export interface CacheControlOptions {
  isPublic: boolean;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  noStore?: boolean;
}

export const CACHE_CONTROL_KEY = 'cache_control_settings';
export const CacheControl = (options: CacheControlOptions) => SetMetadata(CACHE_CONTROL_KEY, options);
