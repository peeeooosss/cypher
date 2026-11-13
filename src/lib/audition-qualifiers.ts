import { isCustomAuditionEvent } from "@/lib/audition-events";

export const HIDE_SCORE_LEADERBOARD = true;

export function hideScoreLeaderboard(slug: string | null | undefined): boolean {
  return HIDE_SCORE_LEADERBOARD && isCustomAuditionEvent(slug);
}

export type AuditionQualifier = {
  name: string;
  category: string;
  academy: string;
};

export type CityQualifiers = {
  solos: AuditionQualifier[];
  groups: AuditionQualifier[];
};

export const AUDITION_QUALIFIERS_BY_CITY: Record<string, CityQualifiers> = {
  Bokajan: {
    solos: [
      { name: "Astha Das", category: "Solo Junior", academy: "Stepping Stones Dance Academy" },
      { name: "Avni Singha", category: "Solo Junior", academy: "Stepping Stones Dance Academy" },
      { name: "Bithika Rongpipi", category: "Solo Junior", academy: "Stepping Stones Dance Academy" },
      { name: "Trisha Sangma", category: "Solo Senior", academy: "Stepping Stones Dance Academy" },
      { name: "Shreya Das", category: "Solo Junior", academy: "D Speed Dance Academy" },
      { name: "Samardip Bhomik", category: "Solo Senior", academy: "D Speed Dance Academy" },
      { name: "Ankita Pathok", category: "Solo Junior", academy: "D Speed Dance Academy" },
      { name: "Siya Singh", category: "Solo Senior", academy: "D Speed Dance Academy" },
      { name: "Ronik Das", category: "Solo Junior", academy: "D Speed Dance Academy" },
      { name: "Samridh Poul", category: "Solo Junior", academy: "D Speed Dance Academy" },
      { name: "Armanjan Terang", category: "Solo Senior", academy: "D Speed Dance Academy" },
      { name: "Yash Chakraborty", category: "Solo Junior", academy: "D Speed Dance Academy" },
      { name: "Himadree Dubey", category: "Solo Senior", academy: "Twinkle Dance Academy" },
      { name: "Ritik Kumar", category: "Solo Junior", academy: "Twinkle Dance Academy" },
      { name: "Darshan Borah", category: "Solo Junior", academy: "Twinkle Dance Academy" },
      { name: "Diya Bhuyan", category: "Solo Junior", academy: "Twinkle Dance Academy" },
      { name: "Gourav Pathak", category: "Solo Junior", academy: "Singh Dance Academy" },
      { name: "Nabaraj Suji", category: "Solo Junior", academy: "Singh Dance Academy" },
      { name: "Irien Khakha", category: "Solo Junior", academy: "Singh Dance Academy" },
    ],
    groups: [
      { name: "Royal Cubs Crew", category: "Group", academy: "Singh Dance Academy" },
      { name: "Tiny Hoppers", category: "Group", academy: "Stepping Stones Dance Academy" },
    ],
  },
  "Tezpur & Biswanath Chariali": {
    solos: [
      { name: "Tezal Tak", category: "Solo Junior", academy: "Jaan's Nataraj Dance World" },
      { name: "Bhashin Kashyap", category: "Solo Junior", academy: "Lakhya Dance Academy" },
      { name: "Radha Gurung", category: "Solo Junior", academy: "Smooth Dance Academy" },
      { name: "Aaradhya Mandal", category: "Solo Junior", academy: "Jaan's Nataraj Dance World" },
      { name: "Ayat Ahamed", category: "Solo Junior", academy: "Aura Dance Academy" },
      { name: "Kashish Tilkar", category: "Solo Senior", academy: "Tarangini Studio" },
      { name: "Abhishruti Koiri", category: "Solo Junior", academy: "Street Hip Hop Dance Academy" },
      { name: "Akiba Hayat", category: "Solo Senior", academy: "Street Hip Hop Dance Academy" },
      { name: "Arpita Devi", category: "Solo Junior", academy: "Street Hip Hop Dance Academy" },
      { name: "Abriti Gogoi", category: "Solo Junior", academy: "Street Hip Hop Dance Academy" },
      { name: "Krishor Terang", category: "Solo Junior", academy: "All Unique Biswanath Dance Academy" },
      { name: "Mousumi Hazarika", category: "Solo Junior", academy: "All Unique Biswanath Dance Academy" },
      { name: "Kabita Basumatary", category: "Solo Junior", academy: "All Unique Biswanath Dance Academy" },
      { name: "Terzan Bhumij", category: "Solo Junior", academy: "All Unique Biswanath Dance Academy" },
      { name: "Laxmi Devi", category: "Solo Senior", academy: "Biswanath Dance Center" },
      { name: "Aaruhi Kashyap", category: "Solo Junior", academy: "Nrityanjali Kala Niketan" },
      { name: "Amoyra Borah", category: "Solo Junior", academy: "Nrityanjali Kala Niketan" },
      { name: "Swapna Borah", category: "Solo Junior", academy: "Nrityanjali Kala Niketan" },
      { name: "Ashesh Borah", category: "Solo Junior", academy: "Nrityanjali Kala Niketan" },
      { name: "Baruni Kashyap", category: "Solo Junior", academy: "Nrityanjali Kala Niketan" },
      { name: "Mousumi Hazarika", category: "Solo Junior", academy: "Nrityanjali Kala Niketan" },
    ],
    groups: [],
  },
  Sarupathar: {
    solos: [
      { name: "Bhargav Boruah", category: "Solo Junior", academy: "Step Up Dance & Fitness Academy" },
      { name: "Kabyam Bora", category: "Solo Junior", academy: "Step Up Dance & Fitness Academy" },
      { name: "Geetashri Saikia", category: "Solo Junior", academy: "Step Up Dance & Fitness Academy" },
      { name: "Parinita Devi", category: "Solo Junior", academy: "Step Up Dance & Fitness Academy" },
      { name: "Kritika Das", category: "Solo Junior", academy: "Step Up Dance & Fitness Academy" },
      { name: "Jutika Sarkar", category: "Solo Junior", academy: "Step Up Dance & Fitness Academy" },
      { name: "Nikita Chakraborty", category: "Solo Junior", academy: "Step Up Dance & Fitness Academy" },
      { name: "Nivedita Sharma", category: "Solo Senior", academy: "Step Up Dance & Fitness Academy" },
      { name: "Aparajita Sonowal", category: "Solo Senior", academy: "Step Up Dance & Fitness Academy" },
      { name: "Ridhi Bhargav", category: "Solo Senior", academy: "Step Up Dance & Fitness Academy" },
    ],
    groups: [],
  },
  Borgang: {
    solos: [
      { name: "Loukyapriya Boruah", category: "Solo Junior", academy: "Gangmou Sanskriti Kala Kendra" },
      { name: "Riki Deuri", category: "Solo Junior", academy: "Gangmou Sanskriti Kala Kendra" },
      { name: "Pomita Nahekia", category: "Solo Junior", academy: "Gangmou Sanskriti Kala Kendra" },
      { name: "Prince Chetry", category: "Solo Junior", academy: "Behali Art Hub" },
      { name: "Anurag Saha", category: "Solo Junior", academy: "Behali Art Hub" },
      { name: "Nita Shree Sharma", category: "Solo Junior", academy: "Dhrijati Nritya Kala Bhumi Academy" },
      { name: "Sahalam", category: "Solo Senior", academy: "Behali Art Hub" },
      { name: "Sweety Nath", category: "Solo Senior", academy: "Gangmou Sanskriti Kala Kendra" },
    ],
    groups: [
      { name: "Dhrijati Nritya Kala Bhumi Crew", category: "Group", academy: "Dhrijati Nritya Kala Bhumi Academy" },
      { name: "NATYARANG Crew", category: "Group", academy: "Dhrijati Nritya Kala Bhumi Academy" },
      { name: "LASYA TARANG Junior Crew", category: "Group", academy: "Dhrijati Nritya Kala Bhumi Academy" },
    ],
  },
};

export function getQualifierCities(): string[] {
  return Object.keys(AUDITION_QUALIFIERS_BY_CITY);
}

export function getCityQualifiers(city: string): CityQualifiers | undefined {
  return AUDITION_QUALIFIERS_BY_CITY[city];
}

export function hasAuditionQualifiers(slug: string | null | undefined): boolean {
  return isCustomAuditionEvent(slug) && getQualifierCities().length > 0;
}
