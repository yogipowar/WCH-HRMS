import type { Gender } from "@/types";

export type FunnyAvatarOption = {
  id: string;
  label: string;
  src: string;
  gender: "MALE" | "FEMALE";
};

export const FUNNY_MALE_AVATARS: FunnyAvatarOption[] = Array.from({ length: 10 }, (_, index) => {
  const n = String(index + 1).padStart(2, "0");
  return {
    id: `male-${n}`,
    label: `Guy avatar ${index + 1}`,
    src: `/avatars/funny/male/m${n}.png`,
    gender: "MALE",
  };
});

export const FUNNY_FEMALE_AVATARS: FunnyAvatarOption[] = Array.from({ length: 10 }, (_, index) => {
  const n = String(index + 1).padStart(2, "0");
  return {
    id: `female-${n}`,
    label: `Girl avatar ${index + 1}`,
    src: `/avatars/funny/female/f${n}.png`,
    gender: "FEMALE",
  };
});

export function funnyAvatarsForGender(gender?: Gender | null): FunnyAvatarOption[] {
  if (gender === "FEMALE") return FUNNY_FEMALE_AVATARS;
  if (gender === "MALE") return FUNNY_MALE_AVATARS;
  return [...FUNNY_MALE_AVATARS, ...FUNNY_FEMALE_AVATARS];
}

export function isFunnyAvatarSrc(src: string | null | undefined): boolean {
  return Boolean(src && src.startsWith("/avatars/funny/"));
}
