import Image from 'next/image';
import { Users, Luggage } from 'lucide-react';
import { Vehicle } from '@/lib/types';
import CustomButton from './CustomButton';

interface VehicleCardProps {
  vehicle: Vehicle;
  onSelect?: () => void;
  isSelected?: boolean;
  showSelectButton?: boolean;
}

export default function VehicleCard({
  vehicle,
  onSelect,
  isSelected = false,
  showSelectButton = false
}: VehicleCardProps) {
  return (
    <div
      className={`bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 ${
        isSelected ? 'ring-4 ring-blue-600' : ''
      }`}
    >
      <div className="relative h-64">
        <Image
          src={vehicle.image}
          alt={vehicle.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-6">
        <div className="mb-2">
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            {vehicle.category}
          </span>
        </div>
        <h3 className="text-2xl font-bold mb-2">{vehicle.name}</h3>
        <p className="text-gray-600 mb-4 text-sm">{vehicle.description}</p>

        <div className="flex items-center space-x-6 mb-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>{vehicle.passengers} passengers</span>
          </div>
          <div className="flex items-center space-x-2">
            <Luggage className="h-4 w-4" />
            <span>{vehicle.luggage} bags</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-3xl font-bold">
             ${vehicle.pricePerHour}
            <span className="text-lg text-gray-500 font-normal">/hr</span>
          </div>
        </div>

        {showSelectButton && (
          <CustomButton
            variant={isSelected ? 'secondary' : 'primary'}
            onClick={onSelect}
            className="w-full"
          >
            {isSelected ? 'Selected' : 'Select Vehicle'}
          </CustomButton>
        )}
      </div>
    </div>
  );
}
