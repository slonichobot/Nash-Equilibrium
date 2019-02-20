/*
 *  This file contains helper functions to handle polytopes.
 */

/**
 * Returns set of vertices of given simple polytope.
 * param firstPlayer: Whether this is a best response polytope of the first player.
 */
function getPolytope(poly, firstPlayer) {
	console.assert(poly.N > 0 && poly.n > 0 && poly.b.length === poly.N, "Wrong dimensions: mx: " + poly.N + " x " + poly.n + " rhs: " + poly.b.length);
	let vertices = [];
	_findVerticesRec(poly, [], (vertex, basis) => {
		vertices.push({x: vertex, basis: basis});
	});
	vertices = _uniqVertices(vertices);
	const lemax = math.max(vertices.map(v => v.x));
	if (poly.n === 2) vertices = _sortVertices(vertices);
	const edges = _findEdges(vertices);
	const faces = (poly.n >= 3 ? _findFaces(poly, vertices) : [vertices]);
	vertices.map(v => v.x = math.multiply(v.x, 1/lemax));
	_labelVertices(poly, vertices, firstPlayer);
	_normalizeVertices(vertices);
	return {
		vertices: vertices,
		edges: edges,
		faces: faces,
		dimension: poly.n,
		poly: poly,
		zero: vertices.filter(v => math.eq(math.sum(math.abs(v.x)), 0))[0]
	};
}

/**
 * Given a polytope and its vertices, find all faces represented by a set of vertices sorted in order of traversal of
 * the boundary of the face.
 */
function _findFaces(poly, vertices) {
	const ret = [];
	for (let i = 0; i < poly.N; i++) {
		const ineq = math.transpose(poly.A[i]);
		let cur = [];
		for(let j = 0; j < vertices.length; j++) {
			const val = math.multiply(ineq, math.transpose(vertices[j].x));
			if(math.eq(val, poly.b[i])) {
				cur.push(vertices[j]);
			}
		}
		if(cur.length > 0) {
			cur = _sortVertices(cur);
			// console.log("\t\tFACE found ", cur, "for ineq ", i);
			ret.push(cur);
		}
	}
	return ret;
}

/**
 * Given an array of vertices, find all edges in this polytope.
 */
function _findEdges(vertices) {
	const ret = [];
	for (let v of vertices) v.neigh = [];
	for(let i=0; i<vertices.length; i++)
		for(let j=i+1; j<vertices.length; j++)
			if (isNeigh(i, j, vertices)) {
				const edge = [vertices[i], vertices[j]];
				ret.push(edge);
				vertices[i].neigh.push({v: vertices[j], e: edge});
				vertices[j].neigh.push({v: vertices[i], e: edge});
			}
	return ret;
}

/**
 * Are given points neighbors (do they share an edge?)
 */
function isNeigh(a, b, vertices) { // basis have n-1 in common
	const n = vertices[a].x.length;
	const _a = vertices[a].basis, _b = vertices[b].basis;
	return _a.filter(i => _b.indexOf(i) !== -1).length >= n-1;
}

/**
 * Given an array of vertices defined by their position and basis, this function will merge the vertices of the same
 * position while setting the basis of the newly created vertex to the union of corresponding vertices.
 */
function _uniqVertices(vertices) {
	const rem = [];
	for (let i = 0; i < vertices.length - 1; i++) {
		if (rem.indexOf(i) !== -1) continue;
		for (let j = i+1; j < vertices.length; j++) {
			if (rem.indexOf(j) !== -1) continue;
			if (math.eq(math.sum(math.abs(math.add(vertices[i].x, math.multiply(vertices[j].x, -1)))), 0)) {
				vertices[i].basis = _.uniq(vertices[i].basis.concat(vertices[j].basis));
				rem.push(j);
			}
		}
	}
	return vertices.filter((_, i) => rem.indexOf(i) === -1);
}

/**
 * Given a set of points that represent a convex polygon, sort the vertices
 */
function _sortVertices(vertices) {
	// sort by edge following:
	const vis = zeros(vertices.length), ret = [];
	let cur = _.range(vertices.length).filter(i=>!vis[i])[0];
	while(ret.length < vertices.length && cur !== undefined) {
		ret.push(vertices[cur]);
		vis[cur] = 1;
		// find neighbor - base differs only in one index
		cur = _.range(vertices.length).filter(i=>!vis[i] && isNeigh(cur, i, vertices))[0];
	}
	return ret;
}

/**
 * Assigns a label array to each of the vertices.
 * A vertex x has label i if:
 *  a) i is action of this player and x_i = 0
 *  b) i is action of other player and the ith inequality is bounding.
 */
function _labelVertices(poly, vertices, firstPlayer) {
	for (let v of vertices) {
		v.labels = {a: [], b: []};
		for (let i = 0; i < poly.m; i++) {
			if (v.basis.indexOf(i) !== -1) {
				v.labels[firstPlayer ? 'a' : 'b'].push(1 + i);
			}
		}
		for (let j = 0; j < poly.n; j++) {
			if (math.eq(v.x[j], 0)) {
				v.labels[!firstPlayer ? 'a' : 'b'].push(1 + j);
			}
		}
	}
}

/**
 * Recursive procedure for finding vertices.
 *
 * @param poly Polytope represented as a set of inequalities Ax<=b
 * @param ind List of already chosen indices to be bounding
 * @param callback method to call with a found vertex
 * TODO: handle degenerate vertices (merge them with basis length > n)
 */
function _findVerticesRec(poly, ind, callback) {
	if(ind.length === poly.n) {
		// Now we have system of n equalities and m-n inequalities, check if they have solution;
		const A = poly.A.filter((_, i) => ind.indexOf(i) !== -1);
		const b = poly.b.filter((_, i) => ind.indexOf(i) !== -1);
		try {
			let sol = math.lusolve(A, b);
			let leftHand = math.multiply(poly.A, sol);
			let isOk = _.zip(leftHand, poly.b).reduce((acc, cur) => acc && cur[0]-math.EPS <= cur[1], true);
			if (isOk) {
				// console.log("\t\tVERTEX found for basis: ", ind, "it is: ", math.transpose(sol)[0], "check: ", leftHand);
				callback(math.transpose(sol)[0], _.cloneDeep(ind));
			}
		} catch (e) {/* No need for handling, the system is singular. */}
		return;
	}
	const start = (ind.length > 0 ? ind[ind.length-1] + 1 : 0);
	for (let i = start; i < poly.N; i++) {
		ind.push(i); // set i-th inequality to be bounding
		_findVerticesRec(poly, ind, callback);
		ind.pop();
	}
}

function _normalizeVertices(vertices) {
	for (let va of vertices) {
		let sum = math.sum(va.x);
		if (math.eq(sum, 0)) sum = Infinity;
		va.normalized = math.fraction(math.divide(va.x, sum));
	}
}
