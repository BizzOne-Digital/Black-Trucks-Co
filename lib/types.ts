export interface Vehicle {
  id: string;
  name: string;
  category: string;
  image: string;
  pricePerHour: number;
  minimumHours: number;
  passengers: number;
  luggage: number;
  description: string;
  features: string[];
}

/** Round up to nearest 0.5 hour for billing, then enforce vehicle minimum */
export function billableHours(durationMinutes: number, minimumHours = 1): number {
  const raw = Math.ceil((durationMinutes / 60) * 2) / 2;
  return Math.max(raw, minimumHours);
}

export interface BookingService {
  id: string;
  name: string;
  description: string;
}

export interface BookingData {
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  serviceType?: 'hourly' | 'transfer';
  hours?: number;
  service?: BookingService;
  vehicle?: Vehicle;
  distance?: number;
  duration?: number;
  totalPrice?: number;
  _ts?: number;
}
