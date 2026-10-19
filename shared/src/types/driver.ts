// Driver types including subscription tier model

export type SubscriptionTier = 1 | 2 | 3;

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehiclePlate: string;
  vehicleColor: string;
  vehicleType: 'sedan' | 'suv' | 'hatchback';

  // Performance metrics
  rating: number;
  totalTrips: number;
  acceptanceRate: number;   // 0–1
  cancellationRate: number; // 0–1

  // Subscription model
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt: number;
  subscriptionAutoRenew: boolean;

  // Real-time state
  isOnline: boolean;
  isAvailable: boolean;
  location?: { lat: number; lng: number };
  lastActivityAt: number;
  idleStartedAt?: number;   // when driver became available (for idle bonus)

  // Onboarding
  verificationStatus: VerificationStatus;
  documentsSubmittedAt?: number;
  approvedAt?: number;
  createdAt: number;
}

export interface DriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}
