/* global Game */

Game.Map.Cave = function mapCave(tiles, player) {
  // Call the Map constructor
  Game.Map.call(this, tiles);
  // Add the player
  this.addEntityAtRandomPosition(player, 0);
  // Add random entities and items to each floor.
  for (let z = 0; z < this.depth; z++) {
    // 15 entities per floor
    for (let i = 0; i < 15; i++) {
      const entity = Game.EntityRepository.createRandom();
      // Add a random entity
      this.addEntityAtRandomPosition(entity, z);
      // Level up the entity based on the floor
      if (entity.hasMixin('ExperienceGainer')) {
        for (let level = 0; level < z; level++) {
          entity.giveExperience(entity.getNextLevelExperience() - entity.getExperience());
        }
      }
    }
    // 15 items per floor
    for (let i = 0; i < 15; i++) {
      // Add a random entity
      this.addItemAtRandomPosition(Game.ItemRepository.createRandom(), z);
    }
  }
  // Add weapons and armor to the map in random positions and floors
  const templates = ['dagger', 'sword', 'staff', 'tunic', 'chainmail', 'platemail'];
  for (let i = 0; i < templates.length; i++) {
    this.addItemAtRandomPosition(Game.ItemRepository.create(templates[i]), Math.floor(this.depth * Math.random()));
  }
  // Add a hole to the final cavern on the last level.
  const holePosition = this.getRandomFloorPosition(this.depth - 1);
  this.tiles[this.depth - 1][holePosition.x][holePosition.y] = Game.Tile.holeToCavernTile;
};
Game.Map.Cave.extend(Game.Map);
