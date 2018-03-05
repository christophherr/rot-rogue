/* global Game ROT */

Game.Map = function gameMap(tiles) {
  this.tiles = tiles;
  // Cache dimensions
  this.depth = tiles.length;
  this.width = tiles[0].length;
  this.height = tiles[0][0].length;
  // Setup the field of visions
  this.fov = [];
  this.setupFov();
  // Create a table which will hold the entities
  this.entities = {};
  // Create a table which will hold the items
  this.items = {};
  // Create the engine and scheduler
  this.scheduler = new ROT.Scheduler.Speed();
  this.engine = new ROT.Engine(this.scheduler);
  // Setup the explored array
  this.explored = new Array(this.depth);
  this.setupExploredArray();
};

Game.Map.prototype.setupExploredArray = function setupExploredArray() {
  for (let z = 0; z < this.depth; z++) {
    this.explored[z] = new Array(this.width);
    for (let x = 0; x < this.width; x++) {
      this.explored[z][x] = new Array(this.height);
      for (let y = 0; y < this.height; y++) {
        this.explored[z][x][y] = false;
      }
    }
  }
};

Game.Map.prototype.setExplored = function setExplored(x, y, z, state) {
  // Only update if the tile is within bounds
  if (this.getTile(x, y, z) !== Game.Tile.nullTile) {
    this.explored[z][x][y] = state;
  }
};

Game.Map.prototype.isExplored = function isExplored(x, y, z) {
  // Only return the value if within bounds
  if (this.getTile(x, y, z) !== Game.Tile.nullTile) {
    return this.explored[z][x][y];
  }
  return false;
};

Game.Map.prototype.getDepth = function getDepth() {
  return this.depth;
};

// Standard getters
Game.Map.prototype.getWidth = function getWidth() {
  return this.width;
};
Game.Map.prototype.getHeight = function getHeight() {
  return this.height;
};

// Gets the tile for a given coordinate set
Game.Map.prototype.getTile = function getTile(x, y, z) {
  // Make sure we are inside the bounds. If we aren't, return
  // null tile.
  if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) {
    return Game.Tile.nullTile;
  }
  return this.tiles[z][x][y] || Game.Tile.nullTile;
};

Game.Map.prototype.dig = function dig(x, y, z) {
  // If he tile is diggable, update it to a floor
  if (this.getTile(x, y, z).isDiggable()) {
    this.tiles[z][x][y] = Game.Tile.floorTile;
  }
};
Game.Map.prototype.getRandomFloorPosition = function getRandomFloorPosition(z) {
  // Randomly generate a tile which is a floor
  let x;
  let y;
  do {
    x = Math.floor(Math.random() * this.width);
    y = Math.floor(Math.random() * this.height);
  } while (!this.isEmptyFloor(x, y, z));
  return { x, y, z };
};
Game.Map.prototype.getEngine = function getEngine() {
  return this.engine;
};
Game.Map.prototype.getEntities = function getEntities() {
  return this.entities;
};
Game.Map.prototype.getEntityAt = function getEntityAt(x, y, z) {
  // Get the entity based on position key
  return this.entities[`${x},${y},${z}`];
};

Game.Map.prototype.addEntity = function addEntity(entity) {
  // Update the entity's map
  entity.setMap(this);
  // Update the map with the entity's position
  this.updateEntityPosition(entity);
  // Check if this entity is an actor, and if so add
  // them to the scheduler
  if (entity.hasMixin('Actor')) {
    this.scheduler.add(entity, true);
  }
  // If the entity is the player, set the player.
  if (entity.hasMixin(Game.EntityMixins.PlayerActor)) {
    this.player = entity;
  }
};

Game.Map.prototype.addEntityAtRandomPosition = function addEntityAtRandomPosition(entity, z) {
  const position = this.getRandomFloorPosition(z);
  entity.setX(position.x);
  entity.setY(position.y);
  entity.setZ(position.z);
  this.addEntity(entity);
};

Game.Map.prototype.removeEntity = function removeEntity(entity) {
  // Remove the entity from the map
  const key = `${entity.getX()},${entity.getY()},${entity.getZ()}`;
  if (this.entities[key] === entity) {
    delete this.entities[key];
  }
  // If the entity is an actor, remove them from the scheduler
  if (entity.hasMixin('Actor')) {
    this.scheduler.remove(entity);
  }
  // If the entity is the player, update the player field.
  if (entity.hasMixin(Game.EntityMixins.PlayerActor)) {
    this.player = undefined;
  }
};

Game.Map.prototype.isEmptyFloor = function isEmptyFloor(x, y, z) {
  // Check if the tile is floor and also has no entity
  return this.getTile(x, y, z) == Game.Tile.floorTile && !this.getEntityAt(x, y, z);
};

Game.Map.prototype.getEntitiesWithinRadius = function getEntitiesWithinRadius(centerX, centerY, centerZ, radius) {
  const results = [];
  // Determine our bounds
  const leftX = centerX - radius;
  const rightX = centerX + radius;
  const topY = centerY - radius;
  const bottomY = centerY + radius;
  // Iterate through our entities, adding any which are within the bounds
  const entitiesValue = Object.values(this.entities);
  entitiesValue.forEach(entity => {
    if (
      entity.getX() >= leftX &&
      entity.getX() <= rightX &&
      entity.getY() >= topY &&
      entity.getY() <= bottomY &&
      entity.getZ() === centerZ
    ) {
      results.push(entity);
    }
  });
  return results;
};

Game.Map.prototype.updateEntityPosition = function updateEntityPosition(entity, oldX, oldY, oldZ) {
  // Delete the old key if it is the same entity and we have old positions.
  if (typeof oldX === 'number') {
    const oldKey = `${oldX},${oldY},${oldZ}`;
    if (this.entities[oldKey] === entity) {
      delete this.entities[oldKey];
    }
  }
  // Make sure the entity's position is within bounds
  if (
    entity.getX() < 0 ||
    entity.getX() >= this.width ||
    entity.getY() < 0 ||
    entity.getY() >= this.height ||
    entity.getZ() < 0 ||
    entity.getZ() >= this.depth
  ) {
    throw new Error("Entity's position is out of bounds.");
  }
  // Sanity check to make sure there is no entity at the new position.
  const key = `${entity.getX()},${entity.getY()},${entity.getZ()}`;
  if (this.entities[key]) {
    throw new Error('Tried to add an entity at an occupied position.');
  }
  // Add the entity to the table of entities
  this.entities[key] = entity;
};

Game.Map.prototype.setupFov = function setupFov() {
  // Keep this in 'map' variable so that we don't lose it.
  const map = this;
  // Iterate through each depth level, setting up the field of vision
  for (let z = 0; z < this.depth; z++) {
    // We have to put the following code in it's own scope to prevent the
    // depth variable from being hoisted out of the loop.
    (function depthLevel() {
      // For each depth, we need to create a callback which figures out
      // if light can pass through a given tile.
      const depth = z;
      map.fov.push(
        new ROT.FOV.DiscreteShadowcasting((x, y) => !map.getTile(x, y, depth).isBlockingLight(), { topology: 4 })
      );
    })();
  }
};

Game.Map.prototype.getFov = function getFov(depth) {
  return this.fov[depth];
};

Game.Map.prototype.getItemsAt = function getItemsAt(x, y, z) {
  return this.items[`${x},${y},${z}`];
};

Game.Map.prototype.setItemsAt = function setItemsAt(x, y, z, items) {
  // If our items array is empty, then delete the key from the table.
  const key = `${x},${y},${z}`;
  if (items.length === 0) {
    if (this.items[key]) {
      delete this.items[key];
    }
  } else {
    // Simply update the items at that key
    this.items[key] = items;
  }
};

Game.Map.prototype.addItem = function addItem(x, y, z, item) {
  // If we already have items at that position, simply append the item to the
  // list of items.
  const key = `${x},${y},${z}`;
  if (this.items[key]) {
    this.items[key].push(item);
  } else {
    this.items[key] = [item];
  }
};

Game.Map.prototype.addItemAtRandomPosition = function addItemAtRandomPosition(item, z) {
  const position = this.getRandomFloorPosition(z);
  this.addItem(position.x, position.y, position.z, item);
};

Game.Map.prototype.getPlayer = function getPlayer() {
  return this.player;
};
