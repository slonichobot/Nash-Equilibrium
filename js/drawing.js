/*
 *  This file contains helper functions to handle drawing of polytopes.
 */

let shiftKeyPressed = false;

const SVG_WIDTH = 500, SVG_HEIGHT = 340, FONT_SIZE = 16,
	POLYGON_FACE_OPACITY = .65, INIT_SCALE = 150;

const poly1Color = d3.interpolateHcl('#810081', '#fa5900');
const poly2Color = d3.interpolateHcl('#2143C5', '#6EB600');
const nashColor = d3.scaleOrdinal(d3.schemeCategory10);
nashColor(null);//skip first

function drawPolytope(id, polytope, isFirst) {

	// init svg object and state variables
	const svg = d3.select('svg#' + id);
	svg.style("width", SVG_WIDTH + "px");
	svg.style("height", SVG_HEIGHT + "px");

	// filter:
	const shd = svg.append('defs').append('filter').attr('id', 'shd').attr('x',0).attr('y',0)
		.attr('width', '110%').attr('height', '210%');
	shd.append('feGaussianBlur').attr('result', 'blurOut').attr('in', 'offOut').attr('stdDeviation', 0.2);
	shd.append('feFlood').attr('flood-color', 'white');
	shd.append('feComposite').attr('in2', 'blurOut').attr('operator', 'in');
	const mrg = shd.append('feMerge');
	mrg.append('feMergeNode');
	mrg.append('feMergeNode').attr('in', 'SourceGraphic');

	const origin = [SVG_WIDTH/3, 2*SVG_HEIGHT/3], gridStep = 10;
	let scale = INIT_SCALE, beta = 0, alpha = 0, dragWithShift = false,
		mx, my, mouseX, mouseY, rotating = true, currentTransform = d3.zoomIdentity, startAngle = Math.PI / 4;

	// wrapper group for scale and drag
	svg.select('g').remove();
	const cont = svg.append('g');
	cont
		.attr('transform', currentTransform);

	const drawingLayer = cont.append('g'); drawingLayer.attr('class', 'drawing');
	const vertexLayer = cont.append('g'); vertexLayer.attr('class', 'vertices');

	// init data containers
	let tGrid = [],
		tPoly = vertexCoordNested(polytope.faces),
		tPoint = vertexCoord(polytope.vertices),
		tLine = vertexCoordNested(polytope.edges),
		tText = vertexCoord(polytope.vertices);

	if (polytope.dimension === 2) { // set y to zero for 2D
		tPoly = conv2Dto3Dnested(tPoly);
		tPoint = conv2Dto3D(tPoint);
		tText = conv2Dto3D(tText);
		tLine = conv2Dto3Dnested(tLine);
		startAngle = Math.PI / 2;
		rotating = false;
	} else {
		// flip y axis (browser increments down)
		tPoly = fix3DyAxisNested(tPoly);
		tLine = fix3DyAxisNested(tLine);
		tPoint = fix3DyAxis(tPoint);
		tText = fix3DyAxis(tText);
	}

	// attach data to objects:
	for (let i = 0; i<polytope.vertices.length; i++) {
		tText[i].v = polytope.vertices[i];
		tPoint[i].v = polytope.vertices[i];
	}
	for (let i=0; i<polytope.edges.length; i++)
		tLine[i].e = polytope.edges[i];

	// setup zoom & drag
	const zoom = d3.zoom()
		.scaleExtent([0.5, 10])
		.filter(() => !rotating || !d3.event.shiftKey)
		.on("zoom", zoomed);
	const drag = d3.zoom()
		.filter(() => rotating && d3.event.shiftKey)
		.on("start", dragStart)
		.on("end", dragEnd)
		.on("zoom", zoomed);

	// setup drawing 3d objects
	const grid3d = d3._3d().origin(origin).shape('GRID', 20),
		line3d = d3._3d().origin(origin).shape('LINE'),
		polygon3d = d3._3d().origin(origin).shape('POLYGON'),
		point3d = d3._3d().origin(origin),
		text3d = d3._3d().origin(origin)
	;

	const dataObjects = {
		grid: { fun: grid3d, base: tGrid },
		lines: { fun: line3d, base: tLine },
		polygons: { fun: polygon3d, base: tPoly },
		points: { fun: point3d, base: tPoint },
		text: { fun: text3d, base: tText },
	};

	/**
	 * Rotate & scale base data to the 3d world.
	 */
	function preProcessData(rotY, rotX, scale) {
		for(let key in dataObjects) {
			let obj = dataObjects[key];
			obj.data = obj.fun.rotateY(rotY).rotateX(rotX).scale(scale)(obj.base);
		}
	}

	/**
	 * Redraw elements based on current data in dataObjects.
	 * @param tt duration of animation
	 */
	function processData(tt) {
		let xGrid = drawingLayer.selectAll('path.grid').data(dataObjects.grid.data, key);
		xGrid
			.enter()
			.append('path')
			.attr('class', '_3d grid ' + id)
			.attr('opacity', 0)
			.merge(xGrid)
			.transition().duration(tt)
			.attr('stroke', d => '#717171')
			.attr('stroke-width', 0.4)
			.attr('fill-opacity', 0)
			.attr('d', grid3d.draw)
			.attr('opacity', 1)
		;
		xGrid.exit().remove();

		let xLine = vertexLayer.selectAll('line.line').data(dataObjects.lines.data, key);
		xLine
			.enter()
			.append('line')
			.attr('class', '_3d line ' + id)
			.merge(xLine)
			.attr('opacity', 0)
			.transition().duration(tt)
			.attr('stroke', d => isEdgeInLH(d, f => nashColor(f.id), 'black'))
			.attr('stroke-width', d => isEdgeInLH(d, _ => 3, 1))
			.attr('x1', d => d[0].projected.x) .attr('x2', d => d[1].projected.x)
			.attr('y1', d => d[0].projected.y) .attr('y2', d => d[1].projected.y)
			.attr('opacity', 1)
		;
		xLine.exit().remove();

		let xPolygon = drawingLayer.selectAll('path.polygon').data(dataObjects.polygons.data, key);
		xPolygon
			.enter()
			.append('path')
			.attr('class', '_3d polygon ' + id)
			.attr('opacity', 0)
			.merge(xPolygon)
			.transition().duration(tt)
			.attr('fill', (d, i) => {
				const col = i / dataObjects.polygons.data.length;
				return d3.color((isFirst ? poly1Color : poly2Color)(col));
			})
			.attr('opacity', POLYGON_FACE_OPACITY)
			.attr('d', polygon3d.draw);
		xPolygon.exit().remove();

		const xPoints = vertexLayer.selectAll('circle').data(dataObjects.points.data, key);
		xPoints
			.enter().append('circle').attr('class', '_3d circle' + id).merge(xPoints)
			.attr('r', d => d.v.nash.length ? 5 : 3)
			.attr('fill', d => {
				if (d.v.nash.length === 0) return 'black';
				return nashColor(d.v.nash[0] % 9);
			})
			.attr('opacity', .95)
			.attr('stroke-width', d => d.v.nash.length ? 1 : 0)
			.attr('stroke', 'black')
			.attr('cx', d => d.projected.x)
			.attr('cy', d => d.projected.y);
		xPoints.exit().remove();

		const xTextA = vertexLayer.selectAll('text.a').data(dataObjects.text.data, key);
		xTextA
			.enter().append('text').attr('class', '_3d text a ' + id).merge(xTextA)
			.transition().duration(tt)
			.attr('x', d => d.projected.x + 2)
			.attr('y', d => d.projected.y - 4)
			.attr('fill', FIRST_PLAYER_COLOR)
			.attr('font-size', FONT_SIZE + 'px')
			.text(d => d.v.labels.a);
		xTextA.exit().remove();

		const xTextB = vertexLayer.selectAll('text.b').data(dataObjects.text.data, key);
		xTextB
			.enter().append('text').attr('class', '_3d text b ' + id).merge(xTextB)
			.transition().duration(tt)
			.attr('x', d => {
				let prev = d.v.labels.a.join().length;
				return d.projected.x + 2 + prev * FONT_SIZE/2.3 + (prev ? 1 : 0);
			})
			.attr('y', d => d.projected.y - 4)
			.attr('font-size', FONT_SIZE + 'px')
			.attr('fill', SECOND_PLAYER_COLOR)
			.text(d => {
				let has = d.v.labels.a.length > 0 && d.v.labels.b.length > 0;
				return (has ? "," : "") + d.v.labels.b;
			});
		xTextB.exit().remove();

		drawingLayer.selectAll('._3d').sort(d3._3d().sort);
	}

	function init() {
		for (let z = -gridStep; z < gridStep; z++) {
			for (let x = -gridStep; x < gridStep; x++) {
				tGrid.push([x, 0, z]);
			}
		}
		preProcessData(startAngle, -startAngle, scale);
		processData(10);
	}

	function dragStart() {
		mx = d3.event.transform.x;
		my = d3.event.transform.y;
		dragWithShift = shiftKeyPressed;
	}

	function dragged() {
		if (!rotating || !shiftKeyPressed) return false;
		mouseX = mouseX || 0;
		mouseY = mouseY || 0;
		beta = (d3.event.transform.x - mx + mouseX) * Math.PI / 230;
		alpha = (d3.event.transform.y - my + mouseY) * Math.PI / 230 * (-1);
		preProcessData(beta + startAngle, alpha - startAngle, scale);
		processData(0);
	}

	function dragEnd() {
		if (dragWithShift) {
			mouseX = d3.event.transform.x - mx + mouseX;
			mouseY = d3.event.transform.y - my + mouseY;
			dragWithShift = false;
		}
	}

	function zoomed() {
		if (rotating && dragWithShift) {
			dragged();
		} else {
			currentTransform = d3.event.transform;
			cont.attr("transform", currentTransform);
		}
	}

	init();
	svg.call(zoom);
	cont.call(drag);
}

d3.select(window).on('keydown', ()=> { shiftKeyPressed = d3.event.shiftKey; } );
d3.select(window).on('keyup', ()=> { shiftKeyPressed = false; });


function key(d) {
	return d.id;
}

function vertexCoordNested(arr) {
	return arr.map(f => f.map(v => v.x));
}

function vertexCoord(arr) {
	return arr.map(v => v.x);
}

function isEdgeInLH(d, x, y) {
	if (d.e.nash && lemkeHawsonConfig.label !== null) {
		const f = d.e.nash.filter(x => x.label === lemkeHawsonConfig.label && x.type === lemkeHawsonConfig.labelType);
		if (f.length) return x(f[0]);
	}
	return y;
}

