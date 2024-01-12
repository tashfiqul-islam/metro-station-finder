// Define the structure of a MetroStation object
export type MetroStation = {
  name: string;
  lat: number;
  lng: number;
};

// Define the metrostation locations in Dhaka city
export const metroStations: MetroStation[] = [
  { name: 'Uttara North', lat: 23.869076247909604, lng: 90.36749888965423 },
  { name: 'Uttara Center', lat: 23.859883689540986, lng: 90.36556301505676 },
  { name: 'Uttara South', lat: 23.846047963992312, lng: 90.36348791360157 },
  { name: 'Pallabi', lat: 23.826621696895067, lng: 90.36462316050813 },
  { name: 'Mirpur 11', lat: 23.81948730985004, lng: 90.36569306050733 },
  { name: 'Mirpur 10', lat: 23.808676721197994, lng: 90.36828918315457 },
  { name: 'Kazipara', lat: 23.79997213706531, lng: 90.37178936075442 },
  { name: 'Shewrapara', lat: 23.79073133067589, lng: 90.37573063390592 },
  { name: 'Agaragaon', lat: 23.778528454849155, lng: 90.38010541953432 },
  { name: 'Bijoy Sharani', lat: 23.76767563448402, lng: 90.38309390581901 },
  { name: 'Farmagate', lat: 23.75934419275316, lng: 90.38721707002716 },
  { name: 'Kawran Bazar', lat: 23.751352896226248, lng: 90.39297658085276 },
  { name: 'Shahbagh', lat: 23.739700935527747, lng: 90.39608626094417 },
  { name: 'Dhaka University', lat: 23.73202420199298, lng: 90.39661487611298 },
  {
    name: 'Bangladesh Secretariat',
    lat: 23.730111326763332,
    lng: 90.40669330669668,
  },
  { name: 'Motijheel', lat: 23.728141228055236, lng: 90.41934126299398 },
];

// Define the geographical bounds for Dhaka city
export const dhakaBounds = {
  southwest: {
    lat: 23.697868,
    lng: 90.330367,
  },
  northeast: {
    lat: 23.88165,
    lng: 90.488572,
  },
};
