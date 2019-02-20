// Helper functions

function ones(n) {
	return times(n, 1);
}

function zeros(n) {
	return times(n, 0);
}

function times(n, c) {
	return _.times(n, _.constant(c));
}


function conv2Dto3D(arr) {
	return arr.map(v => [v[0], 0, v[1]]);
}

function conv2Dto3Dnested(arr) {
	return arr.map(f => f.map(v => [v[0], 0, v[1]]));
}

function fix3DyAxis(arr) {
	return arr.map(v => [v[0], -v[1], v[2]]);
}

function fix3DyAxisNested(arr) {
	return arr.map(f => f.map(v => [v[0], -v[1], v[2]]));
}

function initHelpers() {
	math.EPS = 1e-6;
	math.eq = function(a, b) {
		return math.abs(a-b) <= math.EPS;
	};
}
