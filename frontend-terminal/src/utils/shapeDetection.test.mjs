import test from 'node:test';
import assert from 'node:assert/strict';
import { detectShapeType, buildSnappedPoints } from './shapeDetection.js';

const closeEnough = (a, b, epsilon = 0.001) => Math.abs(a - b) <= epsilon;

const pointsAlong = (vertices, stepsPerEdge = 8) => {
  const points = [];

  for (let i = 0; i < vertices.length - 1; i++) {
    const start = vertices[i];
    const end = vertices[i + 1];
    for (let step = 0; step < stepsPerEdge; step++) {
      const t = step / stepsPerEdge;
      points.push([
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
      ]);
    }
  }

  points.push(vertices[vertices.length - 1]);
  return points;
};

const regularPolygonVertices = (centerX, centerY, radius, sides, startAngle = -Math.PI / 2) =>
  Array.from({ length: sides }, (_, index) => {
    const angle = startAngle + (index / sides) * Math.PI * 2;
    return [
      centerX + radius * Math.cos(angle),
      centerY + radius * Math.sin(angle),
    ];
  });

const starVertices = (centerX, centerY, outerRadius, innerRadius) =>
  Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index / 10) * Math.PI * 2;
    return [
      centerX + radius * Math.cos(angle),
      centerY + radius * Math.sin(angle),
    ];
  });

const heartPoints = () => {
  const raw = Array.from({ length: 65 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2;
    return [
      16 * Math.sin(angle) ** 3,
      -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)),
    ];
  });
  const xs = raw.map(([x]) => x);
  const ys = raw.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return raw.map(([x, y]) => [
    40 + ((x - minX) / (maxX - minX)) * 150,
    20 + ((y - minY) / (maxY - minY)) * 135,
  ]);
};

test('detects a mostly straight stroke as a line', () => {
  const points = Array.from({ length: 12 }, (_, index) => [
    20 + index * 12,
    40 + index * 0.7,
  ]);

  assert.equal(detectShapeType(points), 'line');
});

test('detects a near-round closed stroke as a circle', () => {
  const points = Array.from({ length: 65 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2;
    const wobble = index % 2 === 0 ? 1.5 : -1.5;
    return [
      120 + (46 + wobble) * Math.cos(angle),
      90 + (46 - wobble) * Math.sin(angle),
    ];
  });

  assert.equal(detectShapeType(points), 'circle');
});

test('detects a stretched closed stroke as an ellipse', () => {
  const points = Array.from({ length: 65 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2;
    return [
      160 + 82 * Math.cos(angle),
      110 + 34 * Math.sin(angle),
    ];
  });

  assert.equal(detectShapeType(points), 'ellipse');
});

test('detects and snaps a rectangle to five closed corner points', () => {
  const points = pointsAlong([
    [20, 20],
    [160, 20],
    [160, 110],
    [20, 110],
    [20, 20],
  ]);

  assert.equal(detectShapeType(points), 'rect');

  const snapped = buildSnappedPoints(points, 'rect');
  assert.equal(snapped.length, 5);
  assert.deepEqual(snapped[0], snapped[snapped.length - 1]);
});

test('detects and snaps a triangle to a closed polygon', () => {
  const points = pointsAlong([
    [80, 20],
    [155, 135],
    [25, 135],
    [80, 20],
  ]);

  assert.equal(detectShapeType(points), 'triangle');

  const snapped = buildSnappedPoints(points, 'triangle');
  assert.equal(snapped.length, 4);
  assert.ok(closeEnough(snapped[0][0], snapped[snapped.length - 1][0]));
  assert.ok(closeEnough(snapped[0][1], snapped[snapped.length - 1][1]));
});

test('detects and snaps a diamond to five closed corner points', () => {
  const points = pointsAlong([
    [90, 20],
    [160, 85],
    [90, 150],
    [20, 85],
    [90, 20],
  ]);

  assert.equal(detectShapeType(points), 'diamond');

  const snapped = buildSnappedPoints(points, 'diamond');
  assert.equal(snapped.length, 5);
  assert.deepEqual(snapped[0], snapped[snapped.length - 1]);
});

test('detects and snaps a pentagon', () => {
  const vertices = regularPolygonVertices(100, 100, 75, 5);
  const points = pointsAlong([...vertices, vertices[0]]);

  assert.equal(detectShapeType(points), 'pentagon');

  const snapped = buildSnappedPoints(points, 'pentagon');
  assert.equal(snapped.length, 6);
  assert.deepEqual(snapped[0], snapped[snapped.length - 1]);
});

test('detects and snaps a five-point star', () => {
  const vertices = starVertices(110, 105, 84, 38);
  const points = pointsAlong([...vertices, vertices[0]], 5);

  assert.equal(detectShapeType(points), 'star');

  const snapped = buildSnappedPoints(points, 'star');
  assert.equal(snapped.length, 11);
  assert.deepEqual(snapped[0], snapped[snapped.length - 1]);
});

test('detects and snaps a heart', () => {
  const points = heartPoints();

  assert.equal(detectShapeType(points), 'heart');

  const snapped = buildSnappedPoints(points, 'heart');
  assert.ok(snapped.length > 20);
  assert.ok(closeEnough(snapped[0][0], snapped[snapped.length - 1][0]));
  assert.ok(closeEnough(snapped[0][1], snapped[snapped.length - 1][1]));
});

test('detects an open arc as a curve', () => {
  const points = Array.from({ length: 24 }, (_, index) => {
    const t = index / 23;
    return [
      30 + 180 * t,
      120 - 72 * Math.sin(Math.PI * t),
    ];
  });

  const shapeType = detectShapeType(points);

  assert.equal(shapeType, 'curve');
  assert.notEqual(shapeType, 'line');
  assert.notEqual(shapeType, 'freehand');
});
