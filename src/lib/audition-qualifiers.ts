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
      { name: "Ashtha Das", category: "Solo Junior", academy: "Stepping Stones Dance Academy" },
      { name: "Ami Singha", category: "Solo Junior", academy: "Stepping Stones Dance Academy" },
      { name: "Bithika RongPipi", category: "Solo Junior", academy: "Stepping Stones Dance Academy" },
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
      { name: "Royel Cubs Crew", category: "Group", academy: "Singh Dance Academy" },
      { name: "Tiny Hoppers", category: "Group", academy: "Stepping Stones Dance Academy" },
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
