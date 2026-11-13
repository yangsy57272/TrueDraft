import { SYSTEMS, type ApplicationSystem } from "./application-systems";
export const RECOMMENDATION_SYSTEMS = Object.keys(SYSTEMS) as ApplicationSystem[];
export function recommendationSystem(value?: string): ApplicationSystem | undefined {
  return RECOMMENDATION_SYSTEMS.includes(value as ApplicationSystem) ? value as ApplicationSystem : undefined;
}
