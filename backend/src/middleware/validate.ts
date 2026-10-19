import { NextFunction, Request, Response } from 'express';
import { z, ZodTypeAny } from 'zod';

declare global {
  namespace Express {
    interface Request {
      validatedBody?: unknown;
    }
  }
}

export const SendOtpSchema = z.object({
  phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/),
});

export const OtpVerifySchema = z.object({
  phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/),
  token: z.string().regex(/^\d{6}$/),
  role: z.enum(['rider', 'driver']).default('rider'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const SavedPlaceSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  label: z.string().trim().min(1).max(120),
  address: z.string().trim().max(200).optional(),
});

export const TripCreateSchema = z.object({
  riderId: z.string().min(1).optional(),
  pickup: CoordinatesSchema.optional(),
  destination: CoordinatesSchema.optional(),
  pickupAddress: z.string().max(500).optional(),
  destinationAddress: z.string().max(500).optional(),
  tier: z.enum(['normal', 'comfort']).optional(),
  paymentMethod: z.enum(['cash', 'cliq']).optional(),
  rider_id: z.string().min(1).optional(),
  pickup_lat: z.number().min(-90).max(90).optional(),
  pickup_lng: z.number().min(-180).max(180).optional(),
  dest_lat: z.number().min(-90).max(90).optional(),
  dest_lng: z.number().min(-180).max(180).optional(),
  ride_tier: z.enum(['normal', 'comfort']).optional(),
}).superRefine((data, ctx) => {
  const hasObjectShape = !!(data.pickup && data.destination);
  const hasSnakeShape = [data.pickup_lat, data.pickup_lng, data.dest_lat, data.dest_lng].every(
    v => typeof v === 'number'
  );

  if (!hasObjectShape && !hasSnakeShape) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either pickup/destination or pickup_lat/pickup_lng/dest_lat/dest_lng is required',
    });
  }
});

export const LocationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).max(300).optional(),
  tripId: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
});

export const AdminDispatchOverrideSchema = z.object({
  tripId: z.string().uuid(),
  driverId: z.string().uuid(),
});

export const DriverStatusSchema = z.object({
  isOnline: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
}).refine((v) => v.isOnline !== undefined || v.isAvailable !== undefined, {
  message: 'At least one of isOnline or isAvailable is required',
});

export const DriverPatchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  subscription_tier: z.number().int().min(1).max(3).optional(),
}).refine((v) => v.name !== undefined || v.subscription_tier !== undefined, {
  message: 'No updatable fields provided',
});

export const RiderPatchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(200).optional(),
  saved_home: SavedPlaceSchema.nullable().optional(),
  saved_work: SavedPlaceSchema.nullable().optional(),
}).refine((v) => v.name !== undefined || v.email !== undefined || v.saved_home !== undefined || v.saved_work !== undefined, {
  message: 'No updatable fields provided',
});

export const TripStatusUpdateSchema = z.object({
  status: z.enum(['dispatching', 'accepted', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_driver_found']),
  actualFare: z.number().min(0).max(1000).optional(),
  cancelReason: z.string().max(200).optional(),
});

export const TripAcceptSchema = z.object({
  offerId: z.string().uuid().optional(),
});

export const TripDeclineSchema = z.object({
  offerId: z.string().uuid().optional(),
});

export const TripCancelSchema = z.object({
  reason: z.string().trim().min(2).max(200),
});

export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        details: parsed.error.flatten(),
      });
      return;
    }
    req.validatedBody = parsed.data;
    next();
  };
}
