const POUNDS_PER_TON = 2000;
const PER_PERSON_WASTE_LBS_2023 = 407; // ReFED national surplus estimate for 2023
const AVERAGE_PEOPLE_PER_HOUSEHOLD = 2.6; // ACS 2023 estimate

type StateMetadata = {
  name: string;
  code: string;
  fips: string;
  population: number;
};

const STATE_METADATA: StateMetadata[] = [
  { name: "Alabama", code: "AL", fips: "01", population: 5_074_296 },
  { name: "Alaska", code: "AK", fips: "02", population: 733_583 },
  { name: "Arizona", code: "AZ", fips: "04", population: 7_363_895 },
  { name: "Arkansas", code: "AR", fips: "05", population: 3_042_017 },
  { name: "California", code: "CA", fips: "06", population: 38_965_195 },
  { name: "Colorado", code: "CO", fips: "08", population: 5_845_526 },
  { name: "Connecticut", code: "CT", fips: "09", population: 3_605_597 },
  { name: "Delaware", code: "DE", fips: "10", population: 1_036_007 },
  { name: "District of Columbia", code: "DC", fips: "11", population: 678_972 },
  { name: "Florida", code: "FL", fips: "12", population: 22_354_749 },
  { name: "Georgia", code: "GA", fips: "13", population: 11_047_517 },
  { name: "Hawaii", code: "HI", fips: "15", population: 1_440_196 },
  { name: "Idaho", code: "ID", fips: "16", population: 1_967_929 },
  { name: "Illinois", code: "IL", fips: "17", population: 12_582_032 },
  { name: "Indiana", code: "IN", fips: "18", population: 6_843_054 },
  { name: "Iowa", code: "IA", fips: "19", population: 3_200_513 },
  { name: "Kansas", code: "KS", fips: "20", population: 2_937_880 },
  { name: "Kentucky", code: "KY", fips: "21", population: 4_512_310 },
  { name: "Louisiana", code: "LA", fips: "22", population: 4_561_523 },
  { name: "Maine", code: "ME", fips: "23", population: 1_395_988 },
  { name: "Maryland", code: "MD", fips: "24", population: 6_164_660 },
  { name: "Massachusetts", code: "MA", fips: "25", population: 6_981_974 },
  { name: "Michigan", code: "MI", fips: "26", population: 10_050_811 },
  { name: "Minnesota", code: "MN", fips: "27", population: 5_717_184 },
  { name: "Mississippi", code: "MS", fips: "28", population: 2_921_352 },
  { name: "Missouri", code: "MO", fips: "29", population: 6_153_229 },
  { name: "Montana", code: "MT", fips: "30", population: 1_142_526 },
  { name: "Nebraska", code: "NE", fips: "31", population: 1_963_692 },
  { name: "Nevada", code: "NV", fips: "32", population: 3_210_011 },
  { name: "New Hampshire", code: "NH", fips: "33", population: 1_402_050 },
  { name: "New Jersey", code: "NJ", fips: "34", population: 9_293_612 },
  { name: "New Mexico", code: "NM", fips: "35", population: 2_113_344 },
  { name: "New York", code: "NY", fips: "36", population: 19_571_216 },
  { name: "North Carolina", code: "NC", fips: "37", population: 10_807_331 },
  { name: "North Dakota", code: "ND", fips: "38", population: 783_926 },
  { name: "Ohio", code: "OH", fips: "39", population: 11_772_566 },
  { name: "Oklahoma", code: "OK", fips: "40", population: 4_047_757 },
  { name: "Oregon", code: "OR", fips: "41", population: 4_267_197 },
  { name: "Pennsylvania", code: "PA", fips: "42", population: 12_972_008 },
  { name: "Rhode Island", code: "RI", fips: "44", population: 1_097_379 },
  { name: "South Carolina", code: "SC", fips: "45", population: 5_362_990 },
  { name: "South Dakota", code: "SD", fips: "46", population: 919_318 },
  { name: "Tennessee", code: "TN", fips: "47", population: 7_051_339 },
  { name: "Texas", code: "TX", fips: "48", population: 30_503_350 },
  { name: "Utah", code: "UT", fips: "49", population: 3_427_996 },
  { name: "Vermont", code: "VT", fips: "50", population: 647_064 },
  { name: "Virginia", code: "VA", fips: "51", population: 8_683_619 },
  { name: "Washington", code: "WA", fips: "53", population: 7_840_119 },
  { name: "West Virginia", code: "WV", fips: "54", population: 1_775_156 },
  { name: "Wisconsin", code: "WI", fips: "55", population: 5_895_908 },
  { name: "Wyoming", code: "WY", fips: "56", population: 586_485 },
];

export type FoodWasteDatum = StateMetadata & {
  annualPounds: number;
  annualTons: number;
  householdsImpacted: number;
};

const calculateAnnualTons = (population: number): number =>
  (population * PER_PERSON_WASTE_LBS_2023) / POUNDS_PER_TON;

export const foodWasteData: FoodWasteDatum[] = STATE_METADATA.map((state) => {
  const annualPounds = state.population * PER_PERSON_WASTE_LBS_2023;
  const annualTons = calculateAnnualTons(state.population);
  const householdsImpacted = state.population / AVERAGE_PEOPLE_PER_HOUSEHOLD;
  return {
    ...state,
    annualPounds,
    annualTons,
    householdsImpacted,
  };
});

export const foodWasteByFips = new Map(foodWasteData.map((item) => [item.fips, item]));
export const foodWasteByCode = new Map(foodWasteData.map((item) => [item.code, item]));

export const nationalTotals = {
  annualTons: foodWasteData.reduce((sum, item) => sum + item.annualTons, 0),
  annualPounds: foodWasteData.reduce((sum, item) => sum + item.annualPounds, 0),
  householdsImpacted: foodWasteData.reduce((sum, item) => sum + item.householdsImpacted, 0),
  perPersonWasteLbs: PER_PERSON_WASTE_LBS_2023,
};

export const topWasteStates = [...foodWasteData]
  .sort((a, b) => b.annualTons - a.annualTons)
  .slice(0, 5);
