// fareCalculation.ts

// Metro Station names as an array for index mapping
const stationNames = [
  'Uttara North',
  'Uttara Center',
  'Uttara South',
  'Pallabi',
  'Mirpur - 11',
  'Mirpur - 10',
  'Kazipara',
  'Shewrapara',
  'Agargaon',
  'Bijoy Sharani',
  'Farmgate',
  'Karwan Bazar',
  'Shahbagh',
  'Dhaka University',
  'Bangladesh Secretariat',
  'Motijheel',
];

// Fare matrix representing the fare between stations
// Each row and column corresponds to a station in the `stationNames` array
const fareMatrix = [
  [0, 20, 20, 30, 30, 40, 40, 50, 60, 60, 70, 80, 80, 90, 90, 100],
  [20, 0, 20, 20, 30, 30, 40, 40, 50, 60, 60, 70, 80, 80, 90, 90],
  [20, 20, 0, 20, 20, 30, 30, 40, 40, 50, 60, 60, 70, 70, 80, 90],
  [30, 20, 20, 0, 20, 20, 20, 30, 30, 40, 50, 50, 60, 60, 70, 80],
  [30, 30, 20, 20, 0, 20, 20, 20, 30, 40, 40, 50, 50, 60, 70, 70],
  [40, 30, 30, 20, 20, 0, 20, 20, 20, 30, 30, 40, 50, 50, 60, 60],
  [40, 40, 30, 20, 20, 20, 0, 20, 20, 20, 30, 40, 40, 50, 50, 60],
  [50, 40, 40, 30, 20, 20, 20, 0, 20, 20, 20, 30, 40, 40, 50, 50],
  [60, 50, 40, 30, 30, 20, 20, 20, 0, 20, 20, 20, 30, 30, 40, 50],
  [60, 60, 50, 40, 40, 30, 20, 20, 20, 0, 20, 20, 20, 30, 40, 40],
  [70, 60, 60, 50, 40, 30, 30, 20, 20, 20, 0, 20, 20, 20, 30, 30],
  [80, 70, 60, 50, 50, 40, 40, 30, 20, 20, 20, 0, 20, 20, 20, 30],
  [80, 80, 70, 60, 50, 50, 40, 40, 30, 20, 20, 20, 0, 20, 20, 20],
  [90, 80, 70, 60, 60, 50, 50, 40, 30, 30, 20, 20, 20, 0, 20, 20],
  [90, 90, 80, 70, 70, 60, 50, 50, 40, 40, 30, 20, 20, 20, 0, 20],
  [100, 90, 90, 80, 70, 60, 60, 50, 50, 40, 30, 30, 20, 20, 20, 0],
];

/**
 * Get the index of a station by its name.
 * @param {string} stationName - The name of the station.
 * @returns {number} The index of the station in the `stationNames` array.
 */
function getStationIndex(stationName: string): number {
  const index = stationNames.indexOf(stationName);
  if (index === -1) {
    throw new Error(`Station not found: ${stationName}`);
  }
  return index;
}

/**
 * Calculate the fare between two metro stations.
 * @param {string} startStationName - The starting station name.
 * @param {string} destinationStationName - The destination station name.
 * @returns {number} The calculated fare between the two stations.
 */
export function calculateFare(
  startStationName: string,
  destinationStationName: string,
): number {
  // Get the indices of the start and destination stations
  const startIndex = getStationIndex(startStationName);
  const destinationIndex = getStationIndex(destinationStationName);

  // Retrieve the fare from the matrix using the station indices
  const fare = fareMatrix[startIndex][destinationIndex];

  // Return the calculated fare
  return fare;
}
