/* global Game */

Game.Entity = function gameEntity(properties) {
  properties = properties || {};
  // Call the dynamic glyph's construtor with our set of properties
  Game.DynamicGlyph.call(this, properties);
  // Instantiate any properties from the passed object
  this.x = properties.x || 0;
  this.y = properties.y || 0;
  this.z = properties.z || 0;
  this.map = null;
  this.alive = true;
  // Acting speed
  this.speed = properties.speed || 1000;
};

// Make entities inherit all the functionality from dynamic glyphs
Game.Entity.extend(Game.DynamicGlyph);

Game.Entity.prototype.setX = function setX(x) {
  this.x = x;
};
Game.Entity.prototype.setY = function setY(y) {
  this.y = y;
};
Game.Entity.prototype.setZ = function setZ(z) {
  this.z = z;
};
Game.Entity.prototype.setMap = function setMap(map) {
  this.map = map;
};
Game.Entity.prototype.setPosition = function setPosition(x, y, z) {
  const oldX = this.x;
  const oldY = this.y;
  const oldZ = this.z;
  // Update position
  this.x = x;
  this.y = y;
  this.z = z;
  // If the entity is on a map, notify the map that the entity has moved.
  if (this.map) {
    this.map.updateEntityPosition(this, oldX, oldY, oldZ);
  }
};
Game.Entity.prototype.setSpeed = function setSpeed(speed) {
  this.speed = speed;
};

Game.Entity.prototype.getX = function getX() {
  return this.x;
};
Game.Entity.prototype.getY = function getY() {
  return this.y;
};
Game.Entity.prototype.getZ = function getZ() {
  return this.z;
};
Game.Entity.prototype.getMap = function getMap() {
  return this.map;
};
Game.Entity.prototype.getSpeed = function getSpeed() {
  return this.speed;
};

Game.Entity.prototype.tryMove = function tryMove(x, y, z, map) {
  map = this.getMap();
  // Must use starting z
  const tile = map.getTile(x, y, this.getZ());
  const target = map.getEntityAt(x, y, this.getZ());
  // If our z level changed, check if we are on stair
  if (z < this.getZ()) {
    if (tile !== Game.Tile.stairsUpTile) {
      Game.sendMessage(this, "You can't go up here!");
    } else {
      Game.sendMessage(this, 'You ascend to level %d!', [z + 1]);
      this.setPosition(x, y, z);
    }
  } else if (z > this.getZ()) {
    if (tile === Game.Tile.holeToCavernTile && this.hasMixin(Game.EntityMixins.PlayerActor)) {
      // Switch the entity to a boss cavern!
      this.switchMap(new Game.Map.BossCavern());
    } else if (tile !== Game.Tile.stairsDownTile) {
      Game.sendMessage(this, "You can't go down here!");
    } else {
      this.setPosition(x, y, z);
      Game.sendMessage(this, 'You descend to level %d!', [z + 1]);
    }
    // If an entity was present at the tile
  } else if (target) {
    // An entity can only attack if the entity has the Attacker mixin and
    // either the entity or the target is the player.
    if (
      this.hasMixin('Attacker') &&
      (this.hasMixin(Game.EntityMixins.PlayerActor) || target.hasMixin(Game.EntityMixins.PlayerActor))
    ) {
      this.attack(target);
      return true;
    }
    // If not nothing we can do, but we can't
    // move to the tile
    return false;
    // Check if we can walk on the tile
    // and if so simply walk onto it
  } else if (tile.isWalkable()) {
    // Update the entity's position
    this.setPosition(x, y, z);
    // Notify the entity that there are items at this position
    const items = this.getMap().getItemsAt(x, y, z);
    if (items) {
      if (items.length === 1) {
        Game.sendMessage(this, 'You see %s.', [items[0].describeA()]);
      } else {
        Game.sendMessage(this, 'There are several objects here.');
      }
    }
    return true;
    // Check if the tile is diggable
  } else if (tile.isDiggable()) {
    // Only dig if the the entity is the player
    if (this.hasMixin(Game.EntityMixins.PlayerActor)) {
      map.dig(x, y, z);
      return true;
    }
    // If not nothing we can do, but we can't
    // move to the tile
    return false;
  }
  return false;
};
Game.Entity.prototype.isAlive = function isAlive() {
  return this.alive;
};
Game.Entity.prototype.kill = function kill(message) {
  // Only kill once!
  if (!this.alive) {
    return;
  }
  this.alive = false;
  if (message) {
    Game.sendMessage(this, message);
  } else {
    Game.sendMessage(this, 'You have died!');
  }

  // Check if the player died, and if so call their act method to prompt the user.
  if (this.hasMixin(Game.EntityMixins.PlayerActor)) {
    this.act();
  } else {
    this.getMap().removeEntity(this);
  }
};

Game.Entity.prototype.switchMap = function switchMap(newMap) {
  // If it's the same map, nothing to do!
  if (newMap === this.getMap()) {
    return;
  }
  this.getMap().removeEntity(this);
  // Clear the position
  this.x = 0;
  this.y = 0;
  this.z = 0;
  // Add to the new map
  newMap.addEntity(this);
};
