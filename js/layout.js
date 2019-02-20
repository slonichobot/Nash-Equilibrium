/*
 *  This file contains helper functions to layout the Nash-equilibrium visualizing tool.
 */

/**
 * Prints the polytope in a mathjax form.
 */
function _writePolytope(id, payoff) {
	const elem = d3.select("#mx" + id);
	const vr = (id === "A" ? 'x' : 'y');
	const act_a = _.range(1, payoff[0].length + 1), act_b = _.range(1, payoff.length + 1);
	let c1 = (id==='A' ? 'red' : 'blue'), c2 = (id==="A" ? 'blue' : 'red');
	elem.html('\\[' +
		id + ' = \\Big\\{ '+vr+' \\in \\mathbb R^'+(payoff[0].length)+' \\;:\\;' +
		vr + ' \\geq \\mathbf 0,' +
		'\\begin{array}{c c} & \\begin{array}{c c c}'+ act_a.map(a => '\\small\\color{'+c1+'}{'+a+'}').join('&') +
		'\\\\ \\end{array} \\\\' +
		'\\begin{array}{r r r}' +
		act_b.map(a => '\\small\\color{'+c2+'}{'+a+'}\\hspace{-6pt}').join('\\\\') +
		'\\end{array} &' +
		'\\left(' +
		'\\begin{array}{c c c}' +
		payoff.map(l => l.join(' & ')).join('\\\\') +
		'\\end{array}' +
		'\\right)' +
		'\\end{array}'  +
		''+vr+' \\leq \\mathbf 1' +
		' \\Big\\}' +
		'\\]');
}

const NASH_TABLE_HEADER = ['', 'A\'s Mixed Strategy',  'B\'s Mixed Strategy', 'A\'s Exp. Payoff', 'B\'s Exp. Payoff'];
const CR = 8;
/**
 * Prints Nash equilibria into the table.
 */
function printNashEquilibria(nash) {
	const table = d3.select('table#nash');
	table.selectAll('*').remove();
	const thead = table.append('thead');
	const tbody = table.append('tbody');
	thead.append('tr').selectAll('th').data(NASH_TABLE_HEADER).enter().append('th').text(d => d);
	tbody.selectAll('tr').data(nash).enter()
		.append('tr')
		.html(n => {
			return '<td><svg class="circle" width="'+(3*CR)+'px" height="'+(3*CR)+'px">'
				+ '<circle r="'+ CR +'" cx="'+ (1.5*CR) +'" cy="'+ (1.5*CR) +'" fill="'+nashColor(n.id)+'" '
				+ '  stroke="black" stroke-width="1px" />'
				+ '</svg></td>'
				+ '<td class="mj">$$\\big(' + (n.a.normalized.map(x => x.toLatex()).join()) + '\\big)$$</td>'
				+ '<td class="mj">$$\\big(' + (n.b.normalized.map(x => x.toLatex()).join()) + '\\big)$$</td>'
				+ '<td class="mj">$$' + (n.expectedPayoff.a.toLatex()) + '$$</td>'
				+ '<td class="mj">$$' + (n.expectedPayoff.b.toLatex()) + '$$</td>'
				;
		});
}

const LH_TABLE_HEADER = ['Start label', 'Found NE', 'Algorithm steps'];
function printLemkeHawson(equilByPivot) {
	const table = d3.select('table#lemkeHawson');
	table.selectAll('*').remove();
	const thead = table.append('thead');
	const tbody = table.append('tbody');
	thead.append('tr').selectAll('th').data(LH_TABLE_HEADER).enter().append('th').text(d => d);

	const typeToColor = labelType => (labelType==='a' ? FIRST_PLAYER_COLOR : SECOND_PLAYER_COLOR);
	const alphaColor = col => { const c = d3.color(col); return d3.rgb(c.r, c.g, c.b, 0.5); };
	const dispVertex = (labels, col, type) => '<span class="vertexDisp '+type+'" style="background-color: '+alphaColor(col)+'">'
		+ '<span style="color: '+FIRST_PLAYER_COLOR+'">' + labels.a.join() + '</span>' + (labels.a.length && labels.b.length ? ',' : '')
		+ '<span style="color: '+SECOND_PLAYER_COLOR+'">' + labels.b.join() + '</span>'
		+ '</span>';
	const dispEdge = step => '\\(\\xrightarrow{\\color{'+ typeToColor(step.labelType) +'}' + (1+step.pickedLabel) + '}\\)';

	tbody.selectAll('tr').data(equilByPivot).enter()
		.append('tr').attr('class', 'mj')
		.html(d => {
			const neCircle = '<svg class="circle" width="'+(3*CR)+'px" height="'+(3*CR)+'px">'
				+ '<circle r="'+ CR +'" cx="'+ (1.5*CR) +'" cy="'+ (1.5*CR) +'" fill="'+nashColor(d.nash.id)+'" '
				+ '  stroke="black" stroke-width="1px" /></svg>';
			return '<td><span style="color: ' + typeToColor(d.startLabelType) + '">' + (d.startLabel+1) + '</span></td>'
				+ '<td>' + neCircle + '</td>'
				+ '<td class="steps">' + d.seq.map(step => {
					const la = step.a.labels, lb = step.b.labels;
					return dispVertex(la, FIRST_PLAYER_COLOR, 'a') + dispVertex(lb, SECOND_PLAYER_COLOR, 'b')
						+ (step.pickedLabel!==undefined ? dispEdge(step) : '');
				}).join('') + '</td>'
			 + '<td><button type="button" onclick="showLemkeHawson(\''+d.startLabelType+'\','+d.startLabel+')">Show</button></td>'
		});
}
