/**
 * In-memory data store for development.
 * Replace with a real database (PostgreSQL + PostGIS) in production.
 */

import { v4 as uuid } from 'uuid';

// ── Types ────────────────────────────────────────────────────────────────────

export type TripStatus =
  | 'REQUESTED' | 'ACCEPTED' | 'DRIVER_EN_ROUTE'
  | 'PASSENGER_PICKED_UP' | 'TRIP_IN_PROGRESS'
  | 'TRIP_COMPLETED' | 'CANCELLED';

export interface Trip {
  id: string;
  riderId: string;
  driverId?: string;
  pickup: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  pickupAddress: string;
  destinationAddress: string;
  status: TripStatus;
  tier: 'normal' | 'comfort';
  estimatedFare: number;
  actualFare?: number;
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  subscriptionTier: 1 | 2 | 3;
  isOnline: boolean;
  isAvailable: boolean;
  location?: { lat: number; lng: number };
  acceptanceRate: number;
  cancellationRate: number;
  rating: number;
  totalTrips: number;
  idleStartedAt?: number;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

// ── Store ─────────────────────────────────────────────────────────────────────

const trips = new Map<string, Trip>();
const drivers = new Map<string, Driver>();

// Seed with mock drivers for Amman area
function seedDrivers() {
  const mockDrivers: Omit<Driver, 'id'>[] = [
    { name: 'Ahmad Al-Rashidi', phone: '+962791000001', subscriptionTier: 3, isOnline: true, isAvailable: true, location: { lat: 31.955, lng: 35.912 }, acceptanceRate: 0.95, cancellationRate: 0.02, rating: 4.9, totalTrips: 423, verificationStatus: 'approved', createdAt: Date.now() - 86400000 * 90 },
    { name: 'Khalid Mansour', phone: '+962791000002', subscriptionTier: 2, isOnline: true, isAvailable: true, location: { lat: 31.952, lng: 35.908 }, acceptanceRate: 0.88, cancellationRate: 0.05, rating: 4.7, totalTrips: 198, verificationStatus: 'approved', createdAt: Date.now() - 86400000 * 45 },
    { name: 'Yousef Haddad', phone: '+962791000003', subscriptionTier: 1, isOnline: true, isAvailable: true, location: { lat: 31.960, lng: 35.915 }, acceptanceRate: 0.75, cancellationRate: 0.08, rating: 4.5, totalTrips: 87, verificationStatus: 'approved', createdAt: Date.now() - 86400000 * 20 },
    { name: 'Faris Al-Zoubi', phone: '+962791000004', subscriptionTier: 3, isOnline: true, isAvailable: true, location: { lat: 31.948, lng: 35.902 }, acceptanceRate: 0.92, cancellationRate: 0.03, rating: 4.8, totalTrips: 310, idleStartedAt: Date.now() - 8 * 60000, verificationStatus: 'approved', createdAt: Date.now() - 86400000 * 120 },
    { name: 'Nasser Qdah', phone: '+962791000005', subscriptionTier: 2, isOnline: false, isAvailable: false, location: { lat: 31.945, lng: 35.920 }, acceptanceRate: 0.82, cancellationRate: 0.06, rating: 4.6, totalTrips: 156, verificationStatus: 'approved', createdAt: Date.now() - 86400000 * 60 },
  ];
  mockDrivers.forEach(d => { const id = uuid(); drivers.set(id, { id, ...d }); });
}

seedDrivers();

// ── CRUD helpers ──────────────────────────────────────────────────────────────

export const tripStore = {
  create: (data: Omit<Trip, 'id' | 'createdAt'>): Trip => {
    const trip: Trip = { ...data, id: uuid(), createdAt: Date.now() };
    trips.set(trip.id, trip);
    return trip;
  },
  get: (id: string): Trip | undefined => trips.get(id),
  update: (id: string, patch: Partial<Trip>): Trip | null => {
    const trip = trips.get(id);
    if (!trip) return null;
    const updated = { ...trip, ...patch };
    trips.set(id, updated);
    return updated;
  },
  getAll: (): Trip[] => Array.from(trips.values()),
};

export const driverStore = {
  get: (id: string): Driver | undefined => drivers.get(id),
  getAll: (): Driver[] => Array.from(drivers.values()),
  getOnline: (): Driver[] => Array.from(drivers.values()).filter(d => d.isOnline),
  update: (id: string, patch: Partial<Driver>): Driver | null => {
    const driver = drivers.get(id);
    if (!driver) return null;
    const updated = { ...driver, ...patch };
    drivers.set(id, updated);
    return updated;
  },
  create: (data: Omit<Driver, 'id' | 'createdAt'>): Driver => {
    const driver: Driver = { ...data, id: uuid(), createdAt: Date.now() };
    drivers.set(driver.id, driver);
    return driver;
  },
};

// ── Fare calculation ──────────────────────────────────────────────────────────

export function calculateFare(
  pickup: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  tier: 'normal' | 'comfort' = 'normal'
): number {
  const R = 6371;
  const dLat = ((dest.lat - pickup.lat) * Math.PI) / 180;
  const dLng = ((dest.lng - pickup.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((pickup.lat * Math.PI) / 180) *
      Math.cos((dest.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const BASE = tier === 'comfort' ? 0.75 : 0.5;  // JD
  const PER_KM = tier === 'comfort' ? 0.35 : 0.25; // JD
  return Math.round((BASE + distKm * PER_KM) * 100) / 100;
}
