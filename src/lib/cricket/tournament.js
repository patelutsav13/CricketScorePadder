import { uid } from "./engine";
import { loadMatches } from "./storage";
const TKEY = "cricpadder.tournaments.v1";
export const loadTournaments = () => {
    try {
        return JSON.parse(localStorage.getItem(TKEY) || "[]");
    }
    catch {
        return [];
    }
};
export const saveTournaments = (t) => localStorage.setItem(TKEY, JSON.stringify(t));
export const upsertTournament = (t) => {
    const all = loadTournaments();
    const idx = all.findIndex((x) => x.id === t.id);
    if (idx >= 0)
        all[idx] = t;
    else
        all.unshift(t);
    saveTournaments(all);
};
export const getTournament = (id) => loadTournaments().find((t) => t.id === id);
export const deleteTournament = (id) => saveTournaments(loadTournaments().filter((t) => t.id !== id));
/** Generate a round-robin style league of N matches across the given teams. */
export const generateLeagueFixtures = (teams, totalMatches) => {
    if (teams.length < 2)
        return [];
    const pairs = [];
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            pairs.push([teams[i].id, teams[j].id]);
        }
    }
    // Repeat pairs to fill totalMatches; shuffle deterministically by rotation.
    const fixtures = [];
    let p = 0;
    for (let m = 0; m < totalMatches; m++) {
        const [a, b] = pairs[p % pairs.length];
        // Alternate home/away for variety
        const swap = Math.floor(p / pairs.length) % 2 === 1;
        fixtures.push({
            id: uid(),
            stage: "league",
            label: `Match ${m + 1}`,
            teamAId: swap ? b : a,
            teamBId: swap ? a : b,
            played: false,
        });
        p++;
    }
    return fixtures;
};
export const createTournament = (input) => {
    const teams = input.teams.map((t) => ({
        id: uid(),
        name: t.name.trim() || "Team",
        shortName: (t.shortName?.trim() || t.name.trim().slice(0, 3)).toUpperCase(),
        color: t.color,
        players: t.players.map((p) => p.trim()).filter(Boolean),
    }));
    const fixtures = [
        ...generateLeagueFixtures(teams, input.leagueMatches),
        { id: uid(), stage: "semi1", label: "Semi-Final 1", teamAId: null, teamBId: null, played: false },
        { id: uid(), stage: "semi2", label: "Semi-Final 2", teamAId: null, teamBId: null, played: false },
        { id: uid(), stage: "final", label: "Final", teamAId: null, teamBId: null, played: false },
    ];
    return {
        id: uid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        name: input.name.trim() || "Tournament",
        format: input.format,
        oversPerInnings: input.oversPerInnings,
        leagueMatches: input.leagueMatches,
        teams,
        fixtures,
        status: "in_progress",
    };
};
const ballsToDecimalOvers = (legalBalls) => {
    // 19.3 overs = 19 + 3/6 = 19.5 in decimal
    return Math.floor(legalBalls / 6) + (legalBalls % 6) / 6;
};
/**
 * Compute standings from played fixtures (looking up the Match in storage by matchId).
 * NRR = (runsFor / oversFor) - (runsAgainst / oversAgainst).
 * If a team is bowled out, full quota of overs is used for NRR (per ICC rule).
 */
export const computeStandings = (t) => {
    const matches = loadMatches();
    const byTeam = new Map();
    t.teams.forEach((tm) => {
        byTeam.set(tm.id, {
            teamId: tm.id, teamName: tm.name,
            played: 0, won: 0, lost: 0, tied: 0, noResult: 0,
            points: 0, runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0, nrr: 0,
        });
    });
    const playedLeague = t.fixtures.filter((f) => f.stage === "league" && f.played && f.matchId);
    for (const f of playedLeague) {
        const m = matches.find((mm) => mm.id === f.matchId);
        if (!m || !m.innings2)
            continue;
        const a = byTeam.get(f.teamAId);
        const b = byTeam.get(f.teamBId);
        if (!a || !b)
            continue;
        // Map innings to fixture teams via team name (settings.teamA/B carry tournament team names)
        const i1Bat = m.innings1.battingTeamId;
        const teamABatsFirst = m.settings.teamA.id === i1Bat;
        // We need scores per fixture team. Map by name match.
        const aIsSettingsA = m.settings.teamA.name === a.teamName;
        const aIsSettingsB = m.settings.teamB.name === a.teamName;
        if (!aIsSettingsA && !aIsSettingsB)
            continue;
        const aSettings = aIsSettingsA ? m.settings.teamA : m.settings.teamB;
        const bSettings = aIsSettingsA ? m.settings.teamB : m.settings.teamA;
        const aInn = m.innings1.battingTeamId === aSettings.id ? m.innings1 : m.innings2;
        const bInn = m.innings1.battingTeamId === bSettings.id ? m.innings1 : m.innings2;
        const fullQuotaBalls = m.settings.totalOvers * 6;
        const playersPerSide = aSettings.players.length;
        const aOvers = aInn.wickets >= playersPerSide - 1
            ? m.settings.totalOvers
            : ballsToDecimalOvers(aInn.legalBalls);
        const bOvers = bInn.wickets >= playersPerSide - 1
            ? m.settings.totalOvers
            : ballsToDecimalOvers(bInn.legalBalls);
        a.played += 1;
        b.played += 1;
        a.runsFor += aInn.runs;
        a.oversFor += aOvers;
        a.runsAgainst += bInn.runs;
        a.oversAgainst += bOvers;
        b.runsFor += bInn.runs;
        b.oversFor += bOvers;
        b.runsAgainst += aInn.runs;
        b.oversAgainst += aOvers;
        if (aInn.runs > bInn.runs) {
            a.won += 1;
            b.lost += 1;
            a.points += 2;
        }
        else if (bInn.runs > aInn.runs) {
            b.won += 1;
            a.lost += 1;
            b.points += 2;
        }
        else {
            a.tied += 1;
            b.tied += 1;
            a.points += 1;
            b.points += 1;
        }
    }
    byTeam.forEach((s) => {
        const rf = s.oversFor > 0 ? s.runsFor / s.oversFor : 0;
        const ra = s.oversAgainst > 0 ? s.runsAgainst / s.oversAgainst : 0;
        s.nrr = +(rf - ra).toFixed(3);
    });
    return Array.from(byTeam.values()).sort((x, y) => y.points - x.points ||
        y.nrr - x.nrr ||
        y.won - x.won ||
        x.teamName.localeCompare(y.teamName));
};
/** After a league match finishes, persist the link & seed knockouts when league is done. */
export const recordFixtureResult = (tournamentId, fixtureId, matchId, winnerTeamId) => {
    const t = getTournament(tournamentId);
    if (!t)
        return;
    const fix = t.fixtures.find((f) => f.id === fixtureId);
    if (!fix)
        return;
    fix.matchId = matchId;
    fix.played = true;
    fix.winnerTeamId = winnerTeamId;
    t.updatedAt = Date.now();
    const allLeagueDone = t.fixtures.filter((f) => f.stage === "league").every((f) => f.played);
    if (allLeagueDone) {
        const standings = computeStandings(t);
        const top4 = standings.slice(0, 4);
        const semi1 = t.fixtures.find((f) => f.stage === "semi1");
        const semi2 = t.fixtures.find((f) => f.stage === "semi2");
        if (top4[0])
            semi1.teamAId = top4[0].teamId;
        if (top4[3])
            semi1.teamBId = top4[3].teamId; // 1 v 4
        if (top4[1])
            semi2.teamAId = top4[1].teamId;
        if (top4[2])
            semi2.teamBId = top4[2].teamId; // 2 v 3
    }
    // Seed final
    const semi1f = t.fixtures.find((f) => f.stage === "semi1");
    const semi2f = t.fixtures.find((f) => f.stage === "semi2");
    const finalf = t.fixtures.find((f) => f.stage === "final");
    if (semi1f.played && semi1f.winnerTeamId)
        finalf.teamAId = semi1f.winnerTeamId;
    if (semi2f.played && semi2f.winnerTeamId)
        finalf.teamBId = semi2f.winnerTeamId;
    if (finalf.played && finalf.winnerTeamId) {
        t.status = "completed";
        t.championTeamId = finalf.winnerTeamId;
    }
    upsertTournament(t);
};
/** Reset everything but keep the tournament shell (so user can restart). */
export const resetTournament = (id) => {
    const t = getTournament(id);
    if (!t)
        return;
    t.status = "in_progress";
    t.championTeamId = null;
    t.fixtures = [
        ...generateLeagueFixtures(t.teams, t.leagueMatches),
        { id: uid(), stage: "semi1", label: "Semi-Final 1", teamAId: null, teamBId: null, played: false },
        { id: uid(), stage: "semi2", label: "Semi-Final 2", teamAId: null, teamBId: null, played: false },
        { id: uid(), stage: "final", label: "Final", teamAId: null, teamBId: null, played: false },
    ];
    t.updatedAt = Date.now();
    upsertTournament(t);
};
export const getTrophyCabinet = () => {
    const map = new Map();
    for (const t of loadTournaments()) {
        if (t.status !== "completed" || !t.championTeamId)
            continue;
        const team = t.teams.find((x) => x.id === t.championTeamId);
        if (!team)
            continue;
        const key = team.name.toLowerCase();
        if (!map.has(key)) {
            map.set(key, { teamId: team.id, teamName: team.name, count: 0, tournaments: [] });
        }
        const entry = map.get(key);
        entry.count += 1;
        entry.tournaments.push({ id: t.id, name: t.name, format: t.format, date: t.updatedAt });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
};
