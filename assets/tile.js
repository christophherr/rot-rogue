/* global Game */

Game.Tile = function gameTile(properties) {
  properties = properties || {};
  // Call the Glyph constructor with our properties
  Game.Glyph.call(this, properties);
  // Set up the properties.
  this.walkable = properties.walkable || false;
  this.diggable = properties.diggable || false;
  this.blocksLight = properties.blocksLight !== undefined ? properties.blocksLight : true;
};

Game.getNeighborPositions = function getNeighborPositions(x, y) {
  const tiles = [];
  // Generate all possible offsets
  for (let dX = -1; dX < 2; dX++) {
    for (let dY = -1; dY < 2; dY++) {
      // Make sure it isn't the same tile
      if (dX === 0 && dY === 0) {
        continue;
      }
      tiles.push({ x: x + dX, y: y + dY });
    }
  }
  return tiles.randomize();
};
// Make tiles inherit all the functionality from glyphs
Game.Tile.extend(Game.Glyph);

// Standard getters
Game.Tile.prototype.isWalkable = function isWalkable() {
  return this.walkable;
};
Game.Tile.prototype.isDiggable = function isDiggable() {
  return this.diggable;
};
Game.Tile.prototype.isBlockingLight = function isBlockingLight() {
  return this.blocksLight;
};

Game.Tile.nullTile = new Game.Tile();
Game.Tile.floorTile = new Game.Tile({
  character: '.',
  walkable: true,
  blocksLight: false
});
Game.Tile.wallTile = new Game.Tile({
  character: '#',
  foreground: 'aqua',
  diggable: true
});
Game.Tile.stairsUpTile = new Game.Tile({
  character: '<',
  foreground: 'white',
  walkable: true,
  blocksLight: false
});
Game.Tile.stairsDownTile = new Game.Tile({
  character: '>',
  foreground: 'white',
  walkable: true,
  blocksLight: false
});
Game.Tile.holeToCavernTile = new Game.Tile({
  character: 'O',
  foreground: 'white',
  walkable: true,
  blocksLight: false
});
Game.Tile.waterTile = new Game.Tile({
  character: '~',
  foreground: 'blue',
  walkable: false,
  blocksLight: false
});
