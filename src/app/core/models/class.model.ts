export interface SchoolClass {
  id: number;
  batchName: string;
  schedule: string;
  description: string;
  danceStyleId: number | null;
  ageGroupId: number | null;
  feeTierId: number | null;
  danceStyleName: string | null;
  ageGroupLabel: string | null;
  feeTierLabel: string | null;
}
