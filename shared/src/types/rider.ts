// Rider/passenger types

export interface SavedPlace {
  label: string;
  address: string;
  coords: { lat: number; lng: number };
  icon: 'home' | 'work' | 'saved';
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  rating: number;
  totalTrips: number;
  savedPlaces: SavedPlace[];
  preferredLang: 'en' | 'ar';
  preferredTier: 'normal' | 'comfort';
  createdAt: number;
  lastTripAt?: number;
}
