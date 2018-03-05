/* global Game */
Game.Map.BossCave = function bossCave() {
  // Call the Map constructor
  Game.Map.call(this, this.generateTiles(80, 24));
  // Create the giant zombie
  this.addEntityAtRandomPosition(Game.EntityRepository.create('giant zombie'), 0);
};
Game.Map.BossCave.extend(Game.Map);

Game.Map.BossCave.prototype.fillCircle = function fillCircle(tiles, centerX, centerY, radius, tile) {
  // Copied from the DrawFilledCircle algorithm
  // http://stackoverflow.com/questions/1201200/fast-algorithm-for-drawing-filled-circles
  let x = radius;
  let y = 0;
  let xChange = 1 - (radius << 1);
  let yChange = 0;
  let radiusError = 0;

  while (x >= y) {
    for (let i = centerX - x; i <= centerX + x; i++) {
      tiles[i][centerY + y] = tile;
      tiles[i][centerY - y] = tile;
    }
    for (let i = centerX - y; i <= centerX + y; i++) {
      tiles[i][centerY + x] = tile;
      tiles[i][centerY - x] = tile;
    }

    y++;
    radiusError += yChange;
    yChange += 2;
    if ((radiusError << 1) + xChange > 0) {
      x--;
      radiusError += xChange;
      xChange += 2;
    }
  }
};

Game.Map.BossCave.prototype.generateTiles = function generateTiles(width, height) {
  // First we create an array, filling it with empty tiles.
  const tiles = new Array(width);
  for (let x = 0; x < width; x++) {
    tiles[x] = new Array(height);
    for (let y = 0; y < height; y++) {
      tiles[x][y] = Game.Tile.wallTile;
    }
  }
  // Now we determine the radius of the cave to carve out.
  let radius = (Math.min(width, height) - 2) / 2;
  this.fillCircle(tiles, width / 2, height / 2, radius, Game.Tile.floorTile);

  // Now we randomly position lakes (3 - 6 lakes)
  const lakes = Math.round(Math.random() * 3) + 3;
  const maxRadius = 2;
  for (let i = 0; i < lakes; i++) {
    // Random position, taking into consideration the radius to make sure
    // we are within the bounds.
    let centerX = Math.floor(Math.random() * (width - maxRadius * 2));
    let centerY = Math.floor(Math.random() * (height - maxRadius * 2));
    centerX += maxRadius;
    centerY += maxRadius;
    // Random radius
    radius = Math.floor(Math.random() * maxRadius) + 1;
    // Position the lake!
    this.fillCircle(tiles, centerX, centerY, radius, Game.Tile.waterTile);
  }

  // Return the tiles in an array as we only have 1 depth level.
  return [tiles];
};

Game.Map.BossCave.prototype.addEntity = function addEntity(entity) {
  // Call super method.
  Game.Map.prototype.addEntity.call(this, entity);
  // If it's a player, place at random position
  if (this.getPlayer() === entity) {
    const position = this.getRandomFloorPosition(0);
    entity.setPosition(position.x, position.y, 0);
    // Start the engine!
    this.getEngine().start();
  }
};
