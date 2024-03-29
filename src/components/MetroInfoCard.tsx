import React from 'react';
import Image from 'next/image';

// Props definition for the MetroInfoCard component
interface MetroInfoCardProps {
  metroStation: { name: string; lat: number; lng: number } | null;
  distance: number | null; // Distance in meters
  unit: 'km' | 'miles'; // Unit for distance display
}

// MetroInfoCard Functional Component
const MetroInfoCard: React.FC<MetroInfoCardProps> = ({
  metroStation,
  distance,
  unit,
}) => {
  // Render nothing if no metro station or distance is provided
  if (!metroStation || distance === null) return null;

  // Convert distance to the specified unit (km or miles)
  const convertedDistance =
    unit === 'km' ? distance / 1000 : distance / 1609.34;

  return (
    <div className="mt-5 px-4 md:px-5">
      <div className="bg-white/30 dark:bg-slate-800 rounded-lg py-3 ring-1 ring-slate-900/5 shadow-xl backdrop-blur-sm w-full max-w-lg mx-auto">
        <div className="flex flex-col items-center">
          {' '}
          {/* Center the content vertically and horizontally */}
          <div className="flex items-center">
            {/* Icon for Metro Station */}
            <Image
              src="https://github.com/tashfiqul-islam/metro-station-finder/raw/master/public/assets/metro-station.png"
              alt="Metro Station"
              width={24}
              height={24}
            />
            <span className="ml-2"> | </span>
            <p className="ml-2 text-slate-900 dark:text-white text-base">
              <b>Nearest Metro Station:</b>{' '}
              <span className="font-normal">{metroStation.name}</span>
            </p>
          </div>
          <div className="flex items-center mt-5">
            {' '}
            {/* Apply negative margin to the second section */}
            {/* Icon for Direction */}
            <Image
              src="https://github.com/tashfiqul-islam/metro-station-finder/raw/master/public/assets/direction.png"
              alt="Direction"
              width={24}
              height={24}
            />
            <span className="ml-2"> | </span>
            <p className="ml-2 text-slate-900 dark:text-white text-base">
              <b>Distance from Location:</b>{' '}
              <span className="font-normal">
                {convertedDistance.toFixed(2)} {unit}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetroInfoCard;
