import { loadTournaments } from "./tournament";
/**
 * Returns a lookup function mapping a Match's team id (settings.teamA.id / teamB.id)
 * to the HSL color string ("210 95% 55%") of the corresponding tournament team — if the
 * match is part of a tournament and the team has a color set.
 */
export const buildTeamColorLookup = (match) => {
    let map = {};
    const tid = match.settings.tournamentId;
    if (tid) {
        const t = loadTournaments().find((x) => x.id === tid);
        if (t) {
            const byName = new Map(t.teams.map((tt) => [tt.name, tt.color]));
            map[match.settings.teamA.id] = byName.get(match.settings.teamA.name);
            map[match.settings.teamB.id] = byName.get(match.settings.teamB.name);
        }
    }
    return (teamId) => map[teamId];
};
