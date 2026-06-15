const MIN_SHAPE_SIZE = 8;
const SNAP_SEGMENTS = 64;
const HARD_CORNER_TYPES = new Set([
  'line',
  'triangle',
  'rect',
  'diamond',
  'pentagon',
  'hexagon',
  'polygon',
  'star',
]);

const cleanPoints = (points) =>
  (points || [])
    .map((point) => [Number(point?.[0]), Number(point?.[1])])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));

const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

const getBounds = (points) => {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    diagonal: Math.hypot(maxX - minX, maxY - minY),
  };
};

const normalizePoints = (points, bounds) =>
  points.map(([x, y]) => [
    (x - bounds.minX) / (bounds.width || 1),
    (y - bounds.minY) / (bounds.height || 1),
  ]);

const pathLength = (points) =>
  points.slice(1).reduce((total, point, index) => total + distance(points[index], point), 0);

const perpendicularDistance = (point, start, end) => {
  const chord = distance(start, end);
  if (chord < 1e-6) return distance(point, start);

  return Math.abs(
    (end[1] - start[1]) * point[0] -
    (end[0] - start[0]) * point[1] +
    end[0] * start[1] -
    end[1] * start[0]
  ) / chord;
};

const distanceToSegment = (point, start, end) => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < 1e-6) return distance(point, start);

  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared));
  return distance(point, [start[0] + t * dx, start[1] + t * dy]);
};

const maxLineDeviation = (points, start, end) =>
  points.reduce((maxDeviation, point) => Math.max(maxDeviation, perpendicularDistance(point, start, end)), 0);

const simplifyOpenPath = (points, epsilon) => {
  if (points.length <= 2) return points.slice();

  const first = points[0];
  const last = points[points.length - 1];
  let maxDistance = 0;
  let splitIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const currentDistance = perpendicularDistance(points[i], first, last);
    if (currentDistance > maxDistance) {
      maxDistance = currentDistance;
      splitIndex = i;
    }
  }

  if (maxDistance <= epsilon) return [first, last];

  const left = simplifyOpenPath(points.slice(0, splitIndex + 1), epsilon);
  const right = simplifyOpenPath(points.slice(splitIndex), epsilon);
  return left.slice(0, -1).concat(right);
};

const farthestPointIndex = (points, fromIndex) => {
  let farthestIndex = fromIndex;
  let farthestDistance = 0;

  points.forEach((point, index) => {
    const currentDistance = distance(points[fromIndex], point);
    if (currentDistance > farthestDistance) {
      farthestDistance = currentDistance;
      farthestIndex = index;
    }
  });

  return farthestIndex;
};

const removeDuplicateNeighbors = (points, minDistance) => {
  const result = [];

  points.forEach((point) => {
    if (!result.length || distance(result[result.length - 1], point) > minDistance) {
      result.push(point);
    }
  });

  if (result.length > 2 && distance(result[0], result[result.length - 1]) <= minDistance) {
    result.pop();
  }

  return result;
};

const angleBetween = (a, b, c) => {
  const ab = [b[0] - a[0], b[1] - a[1]];
  const bc = [c[0] - b[0], c[1] - b[1]];
  const abLength = Math.hypot(ab[0], ab[1]);
  const bcLength = Math.hypot(bc[0], bc[1]);
  if (abLength < 1e-6 || bcLength < 1e-6) return 0;

  const cosine = (ab[0] * bc[0] + ab[1] * bc[1]) / (abLength * bcLength);
  return Math.acos(Math.max(-1, Math.min(1, cosine)));
};

const removeCollinearCorners = (points, bounds) => {
  const minSegment = Math.max(6, bounds.diagonal * 0.035);
  const minTurnAngle = Math.PI / 7;
  let corners = points.slice();
  let changed = true;

  while (changed && corners.length > 3) {
    changed = false;
    corners = corners.filter((point, index, list) => {
      const prev = list[(index - 1 + list.length) % list.length];
      const next = list[(index + 1) % list.length];
      const isShortSegment = distance(prev, point) < minSegment || distance(point, next) < minSegment;
      const isNearlyStraight = angleBetween(prev, point, next) < minTurnAngle;

      if (isShortSegment || isNearlyStraight) {
        changed = true;
        return false;
      }
      return true;
    });
  }

  return corners;
};

const countCornersNearBox = (corners, bounds) => {
  const tolerance = Math.max(8, bounds.diagonal * 0.08);

  return corners.filter(([x, y]) => {
    const nearX = Math.min(Math.abs(x - bounds.minX), Math.abs(x - bounds.maxX)) <= tolerance;
    const nearY = Math.min(Math.abs(y - bounds.minY), Math.abs(y - bounds.maxY)) <= tolerance;
    return nearX && nearY;
  }).length;
};

const getClosedCorners = (points, bounds) => {
  const closingTolerance = Math.max(4, bounds.diagonal * 0.04);
  const openPoints = distance(points[0], points[points.length - 1]) <= closingTolerance
    ? points.slice(0, -1)
    : points.slice();

  if (openPoints.length < 4) return openPoints;

  let startIndex = farthestPointIndex(openPoints, 0);
  let endIndex = farthestPointIndex(openPoints, startIndex);
  startIndex = farthestPointIndex(openPoints, endIndex);

  const start = Math.min(startIndex, endIndex);
  const end = Math.max(startIndex, endIndex);
  const epsilon = Math.max(6, bounds.diagonal * 0.055);

  const firstHalf = simplifyOpenPath(openPoints.slice(start, end + 1), epsilon);
  const secondHalf = simplifyOpenPath(openPoints.slice(end).concat(openPoints.slice(0, start + 1)), epsilon);
  const corners = firstHalf.slice(0, -1).concat(secondHalf.slice(0, -1));
  const uniqueCorners = removeDuplicateNeighbors(corners, Math.max(5, bounds.diagonal * 0.03));

  return removeCollinearCorners(uniqueCorners, bounds);
};

const ellipseError = (points, bounds) => {
  const rx = bounds.width / 2;
  const ry = bounds.height / 2;
  if (rx < 1 || ry < 1) return Infinity;

  const totalError = points.reduce((sum, [x, y]) => {
    const normalizedRadius = Math.hypot((x - bounds.centerX) / rx, (y - bounds.centerY) / ry);
    return sum + Math.abs(normalizedRadius - 1);
  }, 0);

  return totalError / points.length;
};

const isClosedPath = (points, bounds) => {
  if (points.length <= 8) return false;

  const closingDistance = distance(points[0], points[points.length - 1]);
  const threshold = Math.max(18, Math.min(bounds.width, bounds.height) * 0.35, Math.max(bounds.width, bounds.height) * 0.15);
  return closingDistance <= threshold;
};

const buildEllipsePoints = (centerX, centerY, radiusX, radiusY) =>
  Array.from({ length: SNAP_SEGMENTS + 1 }, (_, index) => {
    const angle = (index / SNAP_SEGMENTS) * Math.PI * 2;
    return [
      centerX + radiusX * Math.cos(angle),
      centerY + radiusY * Math.sin(angle),
    ];
  });

const buildRegularPolygonPoints = (bounds, sides, startAngle = -Math.PI / 2) => {
  const radius = Math.min(bounds.width, bounds.height) / 2;
  const points = Array.from({ length: sides }, (_, index) => {
    const angle = startAngle + (index / sides) * Math.PI * 2;
    return [
      bounds.centerX + radius * Math.cos(angle),
      bounds.centerY + radius * Math.sin(angle),
    ];
  });

  return closePolygon(points);
};

const buildDiamondPoints = (bounds) => [
  [bounds.centerX, bounds.minY],
  [bounds.maxX, bounds.centerY],
  [bounds.centerX, bounds.maxY],
  [bounds.minX, bounds.centerY],
  [bounds.centerX, bounds.minY],
];

const buildStarPoints = (bounds) => {
  const outerRadius = Math.min(bounds.width, bounds.height) / 2;
  const innerRadius = outerRadius * 0.46;
  const points = Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index / 10) * Math.PI * 2;
    return [
      bounds.centerX + radius * Math.cos(angle),
      bounds.centerY + radius * Math.sin(angle),
    ];
  });

  return closePolygon(points);
};

const rawHeartPoint = (angle) => [
  16 * Math.sin(angle) ** 3,
  -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)),
];

const HEART_TEMPLATE = (() => {
  const raw = Array.from({ length: SNAP_SEGMENTS + 1 }, (_, index) =>
    rawHeartPoint((index / SNAP_SEGMENTS) * Math.PI * 2)
  );
  const bounds = getBounds(raw);
  return normalizePoints(raw, bounds);
})();

const buildHeartPoints = (bounds) =>
  HEART_TEMPLATE.map(([x, y]) => [
    bounds.minX + x * bounds.width,
    bounds.minY + y * bounds.height,
  ]);

const closePolygon = (points) => {
  if (!points.length) return points;
  return points.concat([[points[0][0], points[0][1]]]);
};

const smoothOpenPath = (points, iterations = 2) => {
  let smoothed = points.slice();

  for (let i = 0; i < iterations; i++) {
    if (smoothed.length <= 2) return smoothed;
    const next = [smoothed[0]];

    for (let j = 0; j < smoothed.length - 1; j++) {
      const current = smoothed[j];
      const following = smoothed[j + 1];
      next.push([
        current[0] * 0.75 + following[0] * 0.25,
        current[1] * 0.75 + following[1] * 0.25,
      ]);
      next.push([
        current[0] * 0.25 + following[0] * 0.75,
        current[1] * 0.25 + following[1] * 0.75,
      ]);
    }

    next.push(smoothed[smoothed.length - 1]);
    smoothed = next;
  }

  return smoothed;
};

const templateError = (points, bounds, template) => {
  const normalized = normalizePoints(points, bounds);
  const step = Math.max(1, Math.floor(normalized.length / 80));
  let total = 0;
  let count = 0;

  for (let i = 0; i < normalized.length; i += step) {
    const point = normalized[i];
    let nearest = Infinity;

    for (const templatePoint of template) {
      nearest = Math.min(nearest, distance(point, templatePoint));
    }

    total += nearest;
    count += 1;
  }

  return total / Math.max(count, 1);
};

const isHeartShape = (points, bounds) => {
  const aspect = bounds.width / (bounds.height || 1);
  if (aspect < 0.65 || aspect > 1.65) return false;
  if (ellipseError(points, bounds) < 0.16) return false;

  const normalized = normalizePoints(points, bounds);
  const hasLeftLobe = normalized.some(([x, y]) => x < 0.45 && y < 0.35);
  const hasRightLobe = normalized.some(([x, y]) => x > 0.55 && y < 0.35);
  const bottomPoint = normalized.reduce((lowest, point) => (point[1] > lowest[1] ? point : lowest), normalized[0]);
  const templateDistance = templateError(points, bounds, HEART_TEMPLATE);

  return (
    templateDistance < 0.105 &&
    hasLeftLobe &&
    hasRightLobe &&
    bottomPoint[0] > 0.32 &&
    bottomPoint[0] < 0.68 &&
    bottomPoint[1] > 0.82
  );
};

const isStarShape = (corners, bounds) => {
  if (corners.length < 8 || corners.length > 12) return false;

  const radii = corners.map((point) => distance(point, [bounds.centerX, bounds.centerY]));
  const minRadius = Math.min(...radii);
  const maxRadius = Math.max(...radii);
  if (maxRadius / Math.max(minRadius, 1) < 1.35) return false;

  const threshold = minRadius + (maxRadius - minRadius) * 0.55;
  const outerCount = radii.filter((radius) => radius >= threshold).length;
  const switches = radii.reduce((total, radius, index) => {
    const nextRadius = radii[(index + 1) % radii.length];
    return total + ((radius >= threshold) !== (nextRadius >= threshold) ? 1 : 0);
  }, 0);

  return outerCount >= 4 && outerCount <= 6 && switches >= corners.length - 2;
};

const polygonFitError = (points, corners, bounds) => {
  if (corners.length < 3 || bounds.diagonal < 1) return Infinity;

  const total = points.reduce((sum, point) => {
    let nearest = Infinity;
    for (let i = 0; i < corners.length; i++) {
      nearest = Math.min(nearest, distanceToSegment(point, corners[i], corners[(i + 1) % corners.length]));
    }
    return sum + nearest;
  }, 0);

  return total / points.length / bounds.diagonal;
};

const isHardCornerPath = (points, corners, bounds) =>
  polygonFitError(points, corners, bounds) < 0.025;

export function detectShapeType(points) {
  const clean = cleanPoints(points);
  if (clean.length < 3) return 'none';

  const bounds = getBounds(clean);
  if (Math.max(bounds.width, bounds.height) < MIN_SHAPE_SIZE) return 'none';

  const first = clean[0];
  const last = clean[clean.length - 1];
  const chord = distance(first, last);
  const length = pathLength(clean);
  if (length < MIN_SHAPE_SIZE) return 'none';

  const maxDeviation = maxLineDeviation(clean, first, last);
  const directness = chord / length;
  const closed = isClosedPath(clean, bounds);

  if (!closed) {
    if (chord > 30 && directness > 0.92 && maxDeviation <= Math.max(8, chord * 0.08)) {
      return 'line';
    }

    const curveRatio = length / Math.max(chord, 1);
    if (
      clean.length >= 5 &&
      chord > 20 &&
      curveRatio > 1.08 &&
      curveRatio < 2.8 &&
      maxDeviation > Math.max(10, Math.max(bounds.width, bounds.height) * 0.12)
    ) {
      return 'curve';
    }

    return 'freehand';
  }

  const corners = getClosedCorners(clean, bounds);
  const hardCornerPath = isHardCornerPath(clean, corners, bounds);

  if (hardCornerPath && isStarShape(corners, bounds)) return 'star';
  if (corners.length >= 5 && isHeartShape(clean, bounds)) return 'heart';

  if (hardCornerPath && corners.length === 3) return 'triangle';
  if (hardCornerPath && corners.length === 4) {
    return countCornersNearBox(corners, bounds) >= 3 ? 'rect' : 'diamond';
  }
  if (hardCornerPath && corners.length === 5) return 'pentagon';
  if (hardCornerPath && corners.length === 6) return 'hexagon';

  if (ellipseError(clean, bounds) < 0.18) {
    const aspect = Math.max(bounds.width, bounds.height) / (Math.min(bounds.width, bounds.height) || 1);
    return aspect < 1.35 ? 'circle' : 'ellipse';
  }

  if (hardCornerPath && corners.length >= 7 && corners.length <= 9) return 'polygon';

  return 'freehand';
}

export function buildSnappedPoints(points, shapeType) {
  const clean = cleanPoints(points);
  if (!clean.length) return [];

  const bounds = getBounds(clean);
  const first = clean[0];
  const last = clean[clean.length - 1];

  if (shapeType === 'line') return [first, last];

  if (shapeType === 'circle') {
    const radius = clean.reduce((sum, point) => (
      sum + distance(point, [bounds.centerX, bounds.centerY])
    ), 0) / clean.length;

    return buildEllipsePoints(bounds.centerX, bounds.centerY, radius, radius);
  }

  if (shapeType === 'ellipse') {
    return buildEllipsePoints(bounds.centerX, bounds.centerY, bounds.width / 2, bounds.height / 2);
  }

  if (shapeType === 'rect') {
    return [
      [bounds.minX, bounds.minY],
      [bounds.maxX, bounds.minY],
      [bounds.maxX, bounds.maxY],
      [bounds.minX, bounds.maxY],
      [bounds.minX, bounds.minY],
    ];
  }

  if (shapeType === 'diamond') {
    return buildDiamondPoints(bounds);
  }

  if (shapeType === 'triangle') {
    const corners = getClosedCorners(clean, bounds);
    return closePolygon(corners.slice(0, 3));
  }

  if (shapeType === 'pentagon') {
    return buildRegularPolygonPoints(bounds, 5);
  }

  if (shapeType === 'hexagon') {
    return buildRegularPolygonPoints(bounds, 6, -Math.PI / 6);
  }

  if (shapeType === 'polygon') {
    return closePolygon(getClosedCorners(clean, bounds));
  }

  if (shapeType === 'star') {
    return buildStarPoints(bounds);
  }

  if (shapeType === 'heart') {
    return buildHeartPoints(bounds);
  }

  if (shapeType === 'curve') {
    return smoothOpenPath(clean);
  }

  return clean;
}

export function isHardCornerShape(shapeType) {
  return HARD_CORNER_TYPES.has(shapeType);
}
