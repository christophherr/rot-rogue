Game.extend = function extend(src, dest) {
  // Create a copy of the source.
  const result = {};
  for (const key in src) {
    result[key] = src[key];
  }
  // Copy over all keys from dest
  for (const key in dest) {
    result[key] = dest[key];
  }
  return result;
};
