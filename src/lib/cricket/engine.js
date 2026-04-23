export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const formatOvers = (legalBalls) => {
    const o = Math.floor(legalBalls / 6);
    const b = legalBalls % 6;
    return `${o}.${b}`;
};
export const economy = (b) => {
    if (b.ballsBowled === 0)
        return "0.00";
    const overs = b.ballsBowled / 6;
    return (b.runsConceded / overs).toFixed(2);
};
export const strikeRate = (runs, balls) => {
    if (balls === 0)
        return "0.00";
    return ((runs / balls) * 100).toFixed(2);
};
export const createPlayer = (name, teamId) => ({
    id: uid(),
    name: name.trim() || "Player",
    teamId,
});
export const createInnings = (battingTeamId, bowlingTeamId) => ({
    battingTeamId,
    bowlingTeamId,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0 },
    batsmen: {},
    bowlers: {},
    battingOrder: [],
    bowlingOrder: [],
    strikerId: null,
    nonStrikerId: null,
    currentBowlerId: null,
    balls: [],
    finished: false,
});
export const createMatch = (settings, ownerEmail) => {
    // Decide who bats first
    const tossWinner = settings.tossWinnerId;
    const battingFirst = settings.tossDecision === "bat" ? tossWinner :
        tossWinner === settings.teamA.id ? settings.teamB.id : settings.teamA.id;
    const bowlingFirst = battingFirst === settings.teamA.id ? settings.teamB.id : settings.teamA.id;
    return {
        id: uid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings,
        innings1: createInnings(battingFirst, bowlingFirst),
        innings2: null,
        currentInnings: 1,
        status: "in_progress",
        ownerEmail,
    };
};
export const ensureBatsman = (innings, playerId) => {
    if (!innings.batsmen[playerId]) {
        innings.batsmen[playerId] = {
            playerId, runs: 0, balls: 0, fours: 0, sixes: 0, out: false,
        };
        innings.battingOrder.push(playerId);
    }
};
export const ensureBowler = (innings, playerId) => {
    if (!innings.bowlers[playerId]) {
        innings.bowlers[playerId] = {
            playerId, ballsBowled: 0, runsConceded: 0, wickets: 0, maidens: 0,
            currentOverRuns: 0, currentOverLegalBalls: 0,
        };
        innings.bowlingOrder.push(playerId);
    }
};
/**
 * Pure-ish: mutates innings and returns the new ball event.
 * Cricket rules implemented:
 * - wide/noball: 1 run penalty + any additional runs taken; ball doesn't count to over.
 * - byes/legbyes: legal ball, runs are extras, batsman faces ball but no runs to him.
 * - normal: runs to striker, ball faced.
 * - odd runs swap strike. End of over swaps strike. Wickets handled via outBatsmanId.
 */
export const applyBall = (match, inningsKey, input) => {
    const innings = match[inningsKey];
    if (innings.finished)
        throw new Error("Innings already finished");
    if (!innings.strikerId || !innings.nonStrikerId || !innings.currentBowlerId) {
        throw new Error("Set striker, non-striker and bowler before scoring");
    }
    const striker = innings.batsmen[innings.strikerId];
    const bowler = innings.bowlers[innings.currentBowlerId];
    let runsScored = 0;
    let isLegal = true;
    let runsCreditedToBat = 0;
    let runsCreditedToBowler = 0;
    switch (input.extra) {
        case "wide": {
            // 1 + extra runs
            const total = 1 + input.runs;
            runsScored = total;
            innings.extras.wides += total;
            isLegal = false;
            runsCreditedToBowler = total;
            break;
        }
        case "noball": {
            // 1 (noball) credited as extra to bowler, any runs off bat go to batsman
            runsScored = 1 + input.runs;
            innings.extras.noballs += 1;
            isLegal = false;
            runsCreditedToBat = input.runs; // off the bat
            runsCreditedToBowler = runsScored; // bowler concedes all
            break;
        }
        case "bye": {
            runsScored = input.runs;
            innings.extras.byes += input.runs;
            isLegal = true;
            // batsman faces ball, no runs to bat; bowler not charged
            break;
        }
        case "legbye": {
            runsScored = input.runs;
            innings.extras.legbyes += input.runs;
            isLegal = true;
            break;
        }
        default: {
            runsScored = input.runs;
            runsCreditedToBat = input.runs;
            runsCreditedToBowler = input.runs;
            isLegal = true;
        }
    }
    // Update totals
    innings.runs += runsScored;
    // Batsman stats
    if (input.extra !== "wide") {
        striker.balls += 1; // faces ball even on noball/byes
    }
    striker.runs += runsCreditedToBat;
    if (runsCreditedToBat === 4 && input.extra !== "noball" /* still count fours */ || (runsCreditedToBat === 4)) {
        // fours/sixes only off the bat
    }
    if (runsCreditedToBat === 4)
        striker.fours += 1;
    if (runsCreditedToBat === 6)
        striker.sixes += 1;
    // Bowler stats
    bowler.runsConceded += runsCreditedToBowler;
    bowler.currentOverRuns += runsCreditedToBowler;
    if (isLegal) {
        bowler.ballsBowled += 1;
        bowler.currentOverLegalBalls += 1;
        innings.legalBalls += 1;
    }
    // Wicket
    if (input.isWicket) {
        innings.wickets += 1;
        const outId = input.outBatsmanId || innings.strikerId;
        const outB = innings.batsmen[outId];
        if (outB) {
            outB.out = true;
            const tag = input.dismissal === "bowled" ? "b" :
                input.dismissal === "lbw" ? "lbw" :
                    input.dismissal === "caught" ? "c" :
                        input.dismissal === "runout" ? "run out" :
                            input.dismissal === "stumped" ? "st" :
                                input.dismissal === "hitwicket" ? "hit wicket" :
                                    input.dismissal === "retired" ? "retired" : "out";
            outB.dismissalText = tag;
            if (input.dismissal && input.dismissal !== "runout" && input.dismissal !== "retired") {
                bowler.wickets += 1;
            }
        }
    }
    // Strike rotation: odd runs off bat OR off byes/legbyes swap strike (legal balls only)
    // For wides, runs are extras and strike rotation depends on runs taken (wide+1 = no swap, wide+2 = swap, etc.)
    let runsForRotation = 0;
    if (input.extra === "wide")
        runsForRotation = input.runs; // additional runs on wide
    else if (input.extra === "noball")
        runsForRotation = input.runs; // off bat (we treat extra runs)
    else
        runsForRotation = runsScored; // normal/bye/legbye
    if (runsForRotation % 2 === 1) {
        [innings.strikerId, innings.nonStrikerId] = [innings.nonStrikerId, innings.strikerId];
    }
    // Replace striker if out (caller will set new striker via setStriker after this call)
    if (input.isWicket) {
        const outId = input.outBatsmanId || innings.strikerId;
        if (outId === innings.strikerId)
            innings.strikerId = null;
        else if (outId === innings.nonStrikerId)
            innings.nonStrikerId = null;
    }
    const ball = {
        id: uid(),
        innings: match.currentInnings,
        overNumber: Math.floor((innings.legalBalls - (isLegal ? 1 : 0)) / 6),
        ballInOver: isLegal ? ((innings.legalBalls - 1) % 6) + 1 : (innings.legalBalls % 6) + 1,
        runs: runsScored,
        extra: input.extra,
        isWicket: input.isWicket,
        dismissal: input.dismissal,
        outBatsmanId: input.outBatsmanId,
        fielderId: input.fielderId,
        batsmanId: striker.playerId,
        bowlerId: bowler.playerId,
        isLegal,
    };
    innings.balls.push(ball);
    // Check end of over
    let overComplete = false;
    if (isLegal && innings.legalBalls % 6 === 0) {
        overComplete = true;
        // Maiden?
        if (bowler.currentOverRuns === 0 && bowler.currentOverLegalBalls === 6) {
            bowler.maidens += 1;
        }
        bowler.currentOverRuns = 0;
        bowler.currentOverLegalBalls = 0;
        // Swap strike at end of over
        [innings.strikerId, innings.nonStrikerId] = [innings.nonStrikerId, innings.strikerId];
        // Bowler must change — clear currentBowlerId so UI prompts
        innings.currentBowlerId = null;
    }
    // Innings completion checks
    const totalPlayers = match.settings.teamA.players.length; // assume same size
    const allOversBowled = innings.legalBalls >= match.settings.totalOvers * 6;
    const allOut = innings.wickets >= totalPlayers - 1;
    let target = null;
    if (inningsKey === "innings2") {
        target = (match.innings1.runs ?? 0) + 1;
    }
    const targetReached = target !== null && innings.runs >= target;
    let inningsComplete = false;
    if (allOversBowled || allOut || targetReached) {
        innings.finished = true;
        inningsComplete = true;
    }
    match.updatedAt = Date.now();
    return { ball, overComplete, inningsComplete };
};
export const startSecondInnings = (match) => {
    if (match.innings2)
        return;
    const i1 = match.innings1;
    match.innings2 = createInnings(i1.bowlingTeamId, i1.battingTeamId);
    match.currentInnings = 2;
};
export const computeResult = (match) => {
    const i1 = match.innings1;
    const i2 = match.innings2;
    const teamName = (id) => id === match.settings.teamA.id ? match.settings.teamA.name : match.settings.teamB.name;
    if (!i2)
        return "Innings 1 complete";
    if (i2.runs > i1.runs) {
        const players = match.settings.teamA.players.length;
        const wktsLeft = (players - 1) - i2.wickets;
        return `${teamName(i2.battingTeamId)} won by ${wktsLeft} wicket${wktsLeft !== 1 ? "s" : ""}`;
    }
    if (i2.runs < i1.runs) {
        const margin = i1.runs - i2.runs;
        return `${teamName(i1.battingTeamId)} won by ${margin} run${margin !== 1 ? "s" : ""}`;
    }
    return "Match tied";
};
/** Build a Cricinfo-style dismissal line: "c Kohli b Bumrah", "b Bumrah", etc. */
export const formatDismissal = (innings, batsmanId, nameOf) => {
    const ball = [...innings.balls].reverse().find((b) => b.isWicket && (b.outBatsmanId || b.batsmanId) === batsmanId);
    if (!ball)
        return innings.batsmen[batsmanId]?.out ? "out" : "not out";
    const bowler = nameOf(ball.bowlerId);
    const fielder = nameOf(ball.fielderId);
    switch (ball.dismissal) {
        case "bowled": return `b ${bowler}`;
        case "lbw": return `lbw b ${bowler}`;
        case "caught":
            if (ball.fielderId && ball.fielderId === ball.bowlerId)
                return `c & b ${bowler}`;
            return ball.fielderId ? `c ${fielder} b ${bowler}` : `c b ${bowler}`;
        case "stumped": return `st ${fielder} b ${bowler}`;
        case "runout": return ball.fielderId ? `run out (${fielder})` : "run out";
        case "hitwicket": return `hit wicket b ${bowler}`;
        case "retired": return "retired";
        default: return "out";
    }
};
/**
 * Player of the Match: composite score across both innings.
 *  runs + 20*wickets + bonuses for SR/economy/milestones.
 */
export const computePlayerOfTheMatch = (match) => {
    if (match.status !== "completed")
        return null;
    const teamOf = (pid) => {
        if (match.settings.teamA.players.find((p) => p.id === pid))
            return match.settings.teamA;
        return match.settings.teamB;
    };
    const nameOf = (pid) => [...match.settings.teamA.players, ...match.settings.teamB.players].find((p) => p.id === pid)?.name ?? "—";
    const agg = new Map();
    const add = (pid) => {
        if (!agg.has(pid))
            agg.set(pid, { runs: 0, balls: 0, wickets: 0, ballsBowled: 0, runsConceded: 0 });
        return agg.get(pid);
    };
    for (const inn of [match.innings1, match.innings2].filter(Boolean)) {
        for (const b of Object.values(inn.batsmen)) {
            const a = add(b.playerId);
            a.runs += b.runs;
            a.balls += b.balls;
        }
        for (const bw of Object.values(inn.bowlers)) {
            const a = add(bw.playerId);
            a.wickets += bw.wickets;
            a.ballsBowled += bw.ballsBowled;
            a.runsConceded += bw.runsConceded;
        }
    }
    let best = null;
    agg.forEach((v, pid) => {
        const sr = v.balls > 0 ? (v.runs / v.balls) * 100 : 0;
        const econ = v.ballsBowled > 0 ? (v.runsConceded / (v.ballsBowled / 6)) : 99;
        let score = v.runs + v.wickets * 20;
        if (v.balls >= 10 && sr > 150)
            score += 10;
        if (v.ballsBowled >= 12 && econ < 6)
            score += 10;
        if (v.wickets >= 3)
            score += 15;
        if (v.runs >= 50)
            score += 15;
        if (v.runs >= 100)
            score += 25;
        const parts = [];
        if (v.balls > 0)
            parts.push(`${v.runs} (${v.balls})`);
        if (v.ballsBowled > 0)
            parts.push(`${v.wickets}/${v.runsConceded}`);
        if (!best || score > best.score) {
            best = {
                playerId: pid,
                name: nameOf(pid),
                teamName: teamOf(pid).name,
                score,
                summary: parts.join(" · ") || "—",
            };
        }
    });
    return best;
};
