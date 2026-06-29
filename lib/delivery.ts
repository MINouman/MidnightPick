export type PaymentMethod = "bkash" | "cod";

export type DeliveryZone = "dhaka" | "suburban" | "district";

export interface DeliveryInput {
  location: string;
  weightGrams: number;
  orderSubtotal: number;
  paymentMethod: PaymentMethod;
}

export interface DeliveryResult {
  zone: DeliveryZone;
  shippingCost: number;
  codFee: number;
  totalDeliveryCost: number;
}

export const DHAKA_THANAS = [
  "Adabor",
  "Badda",
  "Banani",
  "Bangshal",
  "Bhashantek",
  "Bimanbandar",
  "Cantonment",
  "Chalkbazar",
  "Dakshinkhan",
  "Darus-Salam",
  "Demra",
  "Dhanmondi",
  "Gandaria",
  "Gulshan",
  "Hazaribag",
  "Jatrabari",
  "Kafrul",
  "Kalabagan",
  "Kamrangirchar",
  "Kadamtoli",
  "Khilgaon",
  "Khilkhet",
  "Kotwali",
  "Lalbagh",
  "Mirpur",
  "Mohammadpur",
  "Motijheel",
  "Mugda",
  "New Market",
  "Pallabi",
  "Paltan",
  "Ramna",
  "Rampura",
  "Rupnagar",
  "Sabujbag",
  "Shah Ali",
  "Shahbagh",
  "Shahjahanpur",
  "Shyampur",
  "Sher-e-Bangla Nagar",
  "Sutrapur",
  "Tejgaon",
  "Tejgaon Industrial Area",
  "Turag",
  "Uttara East",
  "Uttara West",
  "Uttarkhan",
  "Vatara",
  "Wari",
] as const;

export const SUBURBAN_AREAS = [
  "Savar",
  "Ashulia",
  "Keraniganj",
  "Narayanganj",
  "Gazipur",
  "Dohar",
  "Nawabganj",
] as const;

export const OTHER_DISTRICTS = [
  "Narsingdi",
  "Manikganj",
  "Munshiganj",
  "Kishoreganj",
  "Tangail",
  "Faridpur",
  "Madaripur",
  "Shariatpur",
  "Rajbari",
  "Gopalganj",
  "Chattogram",
  "Cox's Bazar",
  "Rangamati",
  "Khagrachhari",
  "Bandarban",
  "Cumilla",
  "Noakhali",
  "Feni",
  "Lakshmipur",
  "Chandpur",
  "Brahmanbaria",
  "Rajshahi",
  "Chapai Nawabganj",
  "Naogaon",
  "Natore",
  "Sirajganj",
  "Pabna",
  "Bogura",
  "Joypurhat",
  "Khulna",
  "Bagerhat",
  "Satkhira",
  "Jashore",
  "Jhenaidah",
  "Narail",
  "Magura",
  "Kushtia",
  "Chuadanga",
  "Meherpur",
  "Barishal",
  "Bhola",
  "Patuakhali",
  "Pirojpur",
  "Jhalokati",
  "Barguna",
  "Sylhet",
  "Moulvibazar",
  "Habiganj",
  "Sunamganj",
  "Mymensingh",
  "Jamalpur",
  "Sherpur",
  "Netrokona",
  "Rangpur",
  "Dinajpur",
  "Kurigram",
  "Gaibandha",
  "Nilphamari",
  "Lalmonirhat",
  "Thakurgaon",
  "Panchagarh",
  "Dhamrai",
] as const;

const normalizeLocation = (location: string): string =>
  location.trim().toLocaleLowerCase("en");

const DHAKA_THANA_SET = new Set(DHAKA_THANAS.map(normalizeLocation));
const SUBURBAN_AREA_SET = new Set(SUBURBAN_AREAS.map(normalizeLocation));

function determineZone(location: string): DeliveryZone {
  const normalizedLocation = normalizeLocation(location);

  if (DHAKA_THANA_SET.has(normalizedLocation)) {
    return "dhaka";
  }

  if (SUBURBAN_AREA_SET.has(normalizedLocation)) {
    return "suburban";
  }

  return "district";
}

function additionalKilogramCharge(weightGrams: number): number {
  const excessGrams = weightGrams - 1_000;
  return Math.ceil(excessGrams / 1_000) * 20;
}

function calculateShippingCost(
  zone: DeliveryZone,
  weightGrams: number,
): number {
  if (zone === "dhaka") {
    if (weightGrams <= 150) return 55;
    if (weightGrams <= 500) return 65;
    if (weightGrams <= 1_000) return 75;
    return 75 + additionalKilogramCharge(weightGrams);
  }

  if (zone === "suburban") {
    if (weightGrams <= 1_000) return 105;
    return 105 + additionalKilogramCharge(weightGrams);
  }

  if (weightGrams <= 500) return 115;
  if (weightGrams <= 1_000) return 135;
  return 135 + additionalKilogramCharge(weightGrams);
}

export function calculateDeliveryCost(
  input: DeliveryInput,
): DeliveryResult {
  const zone = determineZone(input.location);
  const shippingCost = calculateShippingCost(zone, input.weightGrams);
  const codFee =
    input.paymentMethod === "cod"
      ? Math.round(input.orderSubtotal * 0.01)
      : 0;

  return {
    zone,
    shippingCost,
    codFee,
    totalDeliveryCost: shippingCost + codFee,
  };
}
