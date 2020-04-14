'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    });
    keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};

    if (i % 2) {
      ownKeys(Object(source), true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }

  return target;
}

function scrollSnapToNext(element, direction, scrollToOptions = {
  behavior: 'smooth'
}) {
  // Pretend we're already this many pixels past the current scroll point in the direction we want to go.
  // Helps avoid rounding errors in element sizes.
  let scrollFuzz = 2;
  const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
  const sign = direction === 'right' || direction === 'down' ? '+' : '-';
  const maxScroll = axis === 'x' ? element.scrollWidth - element.offsetWidth : element.scrollHeight - element.offsetHeight;
  const scrollSnapPositions = getScrollSnapPositions(element)[axis];

  if (sign === '-') {
    scrollFuzz *= -1;
  }

  const currentScrollPosition = element[axis === 'x' ? 'scrollLeft' : 'scrollTop'] + scrollFuzz;
  const nextScrollPositions = scrollSnapPositions.filter(pos => {
    if (sign === '+') {
      return pos > currentScrollPosition;
    } else {
      return pos < currentScrollPosition;
    }
  }).sort((a, b) => sign === '+' ? a - b : b - a);
  let nextScrollPosition;

  if (nextScrollPositions.length > 0) {
    nextScrollPosition = nextScrollPositions[0];
  } else {
    if (sign === '+') {
      nextScrollPosition = maxScroll;
    } else {
      nextScrollPosition = 0;
    }
  } // scrollTo might return a promise in the future


  return element.scrollTo(_objectSpread2({}, scrollToOptions, {
    [axis === 'x' ? 'left' : 'top']: nextScrollPosition
  }));
}
function getScrollPadding(element) {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  let xBeforeRaw = style.getPropertyValue('scroll-padding-left').replace('auto', '0px');
  let yBeforeRaw = style.getPropertyValue('scroll-padding-top').replace('auto', '0px');
  let xAfterRaw = style.getPropertyValue('scroll-padding-right').replace('auto', '0px');
  let yAfterRaw = style.getPropertyValue('scroll-padding-bottom').replace('auto', '0px');
  /**
   * Convert a CSS length to a number.
   * @param raw CSS length value
   * @param size Parent size, used for percentage lengths
   */

  function convert(raw, size) {
    let n = parseFloat(raw);

    if (/%/.test(raw)) {
      n /= 100;
      n *= size;
    }

    return n;
  }
  let xBefore = convert(xBeforeRaw, rect.width);
  let yBefore = convert(yBeforeRaw, rect.height);
  let xAfter = convert(xAfterRaw, rect.width);
  let yAfter = convert(yAfterRaw, rect.height);
  return {
    x: {
      before: xBefore,
      after: xAfter
    },
    y: {
      before: yBefore,
      after: yAfter
    }
  };
}

function domRectIntersects(a, b, axis = 'both') {
  return axis === 'x' && a.right >= b.left && a.left <= b.right || axis === 'y' && a.bottom >= b.top && a.top <= b.bottom || axis === 'both' && a.right >= b.left && a.left <= b.right && a.bottom >= b.top && a.top <= b.bottom;
}

function getAllDescendants(parent) {
  let children = [];

  for (const child of parent.children) {
    children = children.concat(child, getAllDescendants(child));
  }

  return children;
}

function getSnapPositions(parent, excludeOffAxis = true) {
  const parentRect = parent.getBoundingClientRect();
  const positions = {
    x: {
      start: [],
      center: [],
      end: []
    },
    y: {
      start: [],
      center: [],
      end: []
    }
  };
  const descendants = getAllDescendants(parent);
  ['x', 'y'].forEach(axis => {
    const orthogonalAxis = axis === 'x' ? 'y' : 'x';
    const offsetStart = axis === 'x' ? 'offsetLeft' : 'offsetTop';
    const offsetSize = axis === 'x' ? 'offsetWidth' : 'offsetHeight';

    for (const child of descendants) {
      const childRect = child.getBoundingClientRect(); // Skip child if it doesn't intersect the parent's opposite axis (it can never be in view)

      if (excludeOffAxis && !domRectIntersects(parentRect, childRect, orthogonalAxis)) {
        continue;
      }

      const childStyle = window.getComputedStyle(child);
      let [childAlignY, childAlignX] = childStyle.getPropertyValue('scroll-snap-align').split(' ');

      if (typeof childAlignX === 'undefined') {
        childAlignX = childAlignY;
      }

      const childAlign = axis === 'x' ? childAlignX : childAlignY;

      switch (childAlign) {
        case 'none':
          break;

        case 'start':
          positions[axis].start.push(child[offsetStart]);
          break;

        case 'center':
          positions[axis].center.push(child[offsetStart] + child[offsetSize] / 2);
          break;

        case 'end':
          positions[axis].end.push(child[offsetStart] + child[offsetSize]);
          break;
      }
    }
  });
  return positions;
}
function getScrollSnapPositions(element) {
  const rect = element.getBoundingClientRect();
  const scrollPadding = getScrollPadding(element);
  const snapPositions = getSnapPositions(element);
  const maxScroll = {
    x: element.scrollWidth - element.offsetWidth,
    y: element.scrollHeight - element.offsetHeight
  };

  const filterMax = max => pos => pos >= 0 && pos <= max;

  return {
    x: [...snapPositions.x.start.map(v => v - scrollPadding.x.before), ...snapPositions.x.center.map(v => v - rect.width / 2), ...snapPositions.x.end.map(v => v - rect.width + scrollPadding.x.after)].filter(filterMax(maxScroll.x)),
    y: [...snapPositions.y.start.map(v => v - scrollPadding.y.before), ...snapPositions.y.center.map(v => v - rect.height / 2), ...snapPositions.y.end.map(v => v - rect.height + scrollPadding.y.after)].filter(filterMax(maxScroll.y))
  };
}

exports.getScrollPadding = getScrollPadding;
exports.getScrollSnapPositions = getScrollSnapPositions;
exports.getSnapPositions = getSnapPositions;
exports.scrollSnapToNext = scrollSnapToNext;
//# sourceMappingURL=index.js.map
