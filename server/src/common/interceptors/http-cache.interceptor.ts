import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Response } from 'express';
import { CACHE_CONTROL_KEY, CacheControlOptions } from '../decorators/cache-control.decorator';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpCtx = context.switchToHttp();
    const response = httpCtx.getResponse<Response>();
    const request = httpCtx.getRequest();

    // Cache-Control headers only apply to GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const settings = this.reflector.getAllAndOverride<CacheControlOptions>(CACHE_CONTROL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (settings) {
      if (settings.noStore) {
        response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      } else {
        const publicStr = settings.isPublic ? 'public' : 'private';
        const sMaxAgeStr = settings.sMaxAge !== undefined ? `, s-maxage=${settings.sMaxAge}` : '';
        const swrStr = settings.staleWhileRevalidate !== undefined ? `, stale-while-revalidate=${settings.staleWhileRevalidate}` : '';
        response.setHeader('Cache-Control', `${publicStr}, max-age=0${sMaxAgeStr}${swrStr}`);
      }
    } else {
      // Secure fallback by default: prevent caching of unannotated endpoints
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    }

    return next.handle();
  }
}
