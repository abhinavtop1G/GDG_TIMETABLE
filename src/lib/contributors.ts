/**
 * The people who built and maintain this. Add yourself when your first PR is
 * merged -- initials become the avatar, so no image hosting is needed.
 */
export interface Contributor {
  name: string;
  role?: string;
  github?: string;
}

export const CONTRIBUTORS: Contributor[] = [
  { name: "Abhinav", role: "Parser & site", github: "abhinavtop1G" },
];
