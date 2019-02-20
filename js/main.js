/*
 * The entry point of the Nash-equilibria visualizer.
 */

const FIRST_PLAYER_COLOR = '#ff0006';
const SECOND_PLAYER_COLOR = '#2952ff';

let lemkeHawsonConfig = {
	labelType: null,
	label: null
};
let poly1, poly2;

function init() {
	initHelpers();
	run();
	$(".submitBtn").click(()=>{ run(); return false; });
}

function run() {
	const inp = $("#matrixInput").val();
	mx = JSON.parse(inp);
	let payoff1, payoff2;
	const gameName = mx.name;
	if (Array.isArray(mx)) {
		payoff1 = mx.map(row => row.map(col => col[0]));
		payoff2 = mx.map(row => row.map(col => col[1]));
	} else {
		if (mx.A !== undefined) {
			payoff1 = mx.A;
			payoff2 = mx.B;
		} else if (mx.payoff !== undefined) {
			payoff1 = mx.payoff.map(row => row.map(col => col[0]));
			payoff2 = mx.payoff.map(row => row.map(col => col[1]));
		}
		lemkeHawsonConfig.label = lemkeHawsonConfig.labelType = null;
	}

	if(gameName !== undefined) $("#gameName").text(gameName);

	_prepareExampleGames();

	_writePolytope("A", math.transpose(payoff2));
	_writePolytope("B", payoff1);
	const payoffs = _preProcessPayoffs(payoff1, payoff2);

	poly1 = preparePolytope(math.transpose(payoffs[1]), true);
	poly2 = preparePolytope(payoffs[0], false);

	let nash = enumerateNashEquilibria(poly1, poly2, payoff1, payoff2);
	printNashEquilibria(nash);

	let equilByPivot = lemkeHawson(poly1, poly2, payoff1, nash);
	printLemkeHawson(equilByPivot);

	drawPolytope("A", poly1, true);
	drawPolytope("B", poly2, false);

	for (let elem in d3.select('.mj').nodes()) {
		MathJax.Hub.Queue(["Typeset", MathJax.Hub, elem]);
	}
}

function preparePolytope(mx, isFirst) {
	console.assert(Array.isArray(mx) && mx.length > 1 && mx[0].length > 1, "Dimension of matrix needs to be 2 or 3.");
	const m = mx.length, n = mx[0].length;
	const A = _.concat(_.cloneDeep(mx), math.multiply(-1, math.identity(n))._data);
	const b = _.concat(ones(m), zeros(n));
	const poly = {A: A, b: b, n: n, m: m, N: n + m};
	return getPolytope(poly, isFirst);
}

/**
 * Prepossesses payoff tables to be usable by L-H algorithm.
 * It normalises the payoff values to positive. This won't change the position of NE and will ensure the polytope is simple.
 */
function _preProcessPayoffs(payoff1, payoff2) {
	const lemin = math.min(payoff1.concat(payoff2));
	const add = -lemin + 1;
	const newPayoff1 = _.cloneDeep(payoff1), newPayoff2 = _.cloneDeep(payoff2);
	for (let i = 0; i<payoff1.length; i++) {
		for (let j = 0; j<payoff1[0].length; j++) {
			newPayoff1[i][j] += add;
			newPayoff2[i][j] += add;
		}
	}
	return [newPayoff1, newPayoff2];
}

/**
 * Will prepare command items to easily display games in the games.js file.
 */
function _prepareExampleGames() {
	const block = d3.select('#games .gameBlock');
	const buttons = block.selectAll('button').data(GAMES);
	buttons.enter()
		.append('button')
		.attr('type', 'button')
		.text(g => g.name)
		.on('click', g => {
			$("#matrixInput").val(JSON.stringify(g));
			run();
		});
	buttons.exit().remove();
}


function showLemkeHawson(labelType, label) {
	lemkeHawsonConfig.labelType = labelType;
	lemkeHawsonConfig.label = label;
	drawPolytope("A", poly1, true);
	drawPolytope("B", poly2, false);
}

init();
