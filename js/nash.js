/*
 *  This file contains functions to calculate nash equilibria of a game and tools to visualise Lemke-Howson algorithm.
 */

/**
 * Given two labeled polytopes, return all nash equilibria as a pair of vertices.
 */
function enumerateNashEquilibria(poly1, poly2, payoff1, payoff2) {
	const ret = [];
	const va = poly1.vertices, vb = poly2.vertices;
	for (let v of va) v.nash = []; for (let v of vb) v.nash = [];
	for (let i = 0; i < va.length; i++) {
		if(math.eq(math.sum(math.abs(va[i].x)), 0)) continue;
		for (let j = 0; j < vb.length; j++) {
			if(math.eq(math.sum(math.abs(vb[j].x)), 0)) continue;
			let ba = _.uniq(va[i].labels.a.concat(vb[j].labels.a));
			let bb = _.uniq(va[i].labels.b.concat(vb[j].labels.b));
			if (ba.length + bb.length === poly1.poly.N) { // found nash equilibrium
				va[i].nash.push(ret.length); vb[j].nash.push(ret.length);
				const nash = {
					a: va[i], b: vb[j],
					id: ret.length,
					expectedPayoff: {
						a: _calcExpectedPayoff(va[i].normalized, vb[j].normalized, payoff1),
						b: _calcExpectedPayoff(va[i].normalized, vb[j].normalized, payoff2)
					}
				};
				ret.push(nash);
			}
		}
	}
	return ret;
}

/**
 * Simulates Lemke-Hawson algorithm for each possible starting label and returns the sequence of moves.
 */
function lemkeHawson(poly1, poly2, payoff, nash) {
	const m = payoff.length, n = payoff[0].length;
	const ret = [];
	for (let i=0; i<m; i++) {
		ret.push(_lemkeHawsonProcedure(poly1.zero, poly2.zero, i, true, nash));
	}
	for (let j=0; j<n; j++) {
		ret.push(_lemkeHawsonProcedure(poly1.zero, poly2.zero, j, false, nash));
	}
	return ret;
}

/**
 * Procedure to simulate a single run of Lemke-Hawson algorithm for given starting label.
 */
function _lemkeHawsonProcedure(v1, v2, startLabel, firstPlayerStarts, nash) {
	let firstPlayer = firstPlayerStarts;
	let curLabel = startLabel, labelType = (firstPlayer ? 'a' : 'b');
	const seq = [{a: v1, b: v2, pickedLabel: curLabel, labelType: labelType}];
	const edges = [];
	for(let c=0; c<1000; c++) {
		// console.log('label to drop:', curLabel, labelType);
		for (let neigh of (firstPlayer ? v1 : v2).neigh) {
			const u = neigh.v, e = neigh.e;
			if (u.labels[labelType].indexOf(curLabel) === -1) { // dropping curLabel by traversing this edge
				if (firstPlayer) v1=u; else v2=u;
				let duplA = v1.labels.a.filter(l => v2.labels.a.indexOf(l) !== -1);
				let duplB = v1.labels.b.filter(l => v2.labels.b.indexOf(l) !== -1);
				edges.push(e);
				if (duplA.length === 0 && duplB.length === 0) { // fully labeled pair of vertices, NE found
					const foundNE = nash.filter(n => n.a === v1 && n.b === v2);
					console.assert(foundNE.length === 1, "Lemke-Hawson found a nash equilibrium that wasn't found by V-E!");
					seq.push({a:v1, b:v2});
					for(let e of edges) {
						if (e.nash === undefined) e.nash = [];
						e.nash.push({id: foundNE[0].id, type: (firstPlayerStarts ? 'a' : 'b'), label: startLabel}); // save this step to the traversed edge
					}
					return {
						seq: seq,
						nash: foundNE[0],
						startLabel: startLabel,
						startLabelType: (firstPlayerStarts ? 'a' : 'b')
					};
				}
				if(duplA.length) { labelType = 'a'; curLabel = duplA[0]; }
				else { labelType = 'b'; curLabel = duplB[0]; }
				seq.push({ a:v1, b:v2, pickedLabel: curLabel, labelType: labelType });
				break;
			}
		}
		firstPlayer = !firstPlayer;
	}
	console.error("NASH EQUILIBRIUM NOT FOUND BY L-H ALGO!");
}

function _calcExpectedPayoff(x, y, payoff) {
	return math.multiply(math.multiply(x, payoff), math.transpose(y));
}

