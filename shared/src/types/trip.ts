// Trip lifecycle and state types

export type TripStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'DRIVER_EN_ROUTE'
  | 'PASSENGER_PICKED_UP'
  | 'TRIP_IN_PROGRESS'
  | 'TRIP_COMPLETED'
  | 'CANCELLED';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Trip {
  id: string;
  riderId: string;
  driverId?: string;
  pickup: Coordinates;
  destination: Coordinates;
  pickupAddress: string;
  destinationAddress: string;
  status: TripStatus;
  tier: 'normal' | 'comfort';
  estimatedFare: number;
  actualFare?: number;
  distanceKm?: number;
  durationMins?: number;
  createdAt: number;
  acceptedAt?: number;
  pickedUpAt?: number;
  completedAt?: number;
  cancelledAt?: number;
  route?: Coordinates[];
  riderRating?: number;
  driverRating?: number;
}

export interface TripEvent {
  tripId: string;
  type:
    | 'RIDE_REQUESTED'
    | 'DRIVER_MATCHED'
    | 'DRIVER_ARRIVED'
    | 'TRIP_STARTED'
    | 'TRIP_COMPLETED'
    | 'TRIP_CANCELLED';
  timestamp: number;
  payload?: Record<string, unknown>;
}
