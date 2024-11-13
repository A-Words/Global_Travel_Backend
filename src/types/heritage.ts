export interface Heritage {
  id: string;
  name: string;
  location: string;
  country: string;
  category: string[];
  description: string;
  imageUrl: string;
  hasVR: boolean;
  hasAR: boolean;
  yearInscribed: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  tags: string[];
  visitingInfo?: {
    bestTime: string;
    duration: string;
    ticketPrice?: string;
  };
} 