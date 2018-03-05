/* global Game vsprintf */

// Create our EntityMixins namespace
Game.EntityMixins = {};

// Main player's actor mixin
Game.EntityMixins.PlayerActor = {
  name: 'PlayerActor',
  groupName: 'Actor',
  act() {
    if (this.acting) {
      return;
    }
    this.acting = true;
    this.addTurnHunger();
    // Detect if the game is over
    if (!this.isAlive()) {
      Game.Screen.playScreen.setGameEnded(true);
      // Send a last message to the player
      Game.sendMessage(this, 'Press [Enter] to continue!');
    }
    // Re-render the screen
    Game.refresh();
    // Lock the engine and wait asynchronously
    // for the player to press a key.
    this.getMap()
      .getEngine()
      .lock();
    // Clear the message queue
    this.clearMessages();
    this.acting = false;
  }
};

Game.EntityMixins.FungusActor = {
  name: 'FungusActor',
  groupName: 'Actor',
  init() {
    this.growthsRemaining = 5;
  },
  act() {
    // Check if we are going to try growing this turn
    if (this.growthsRemaining > 0) {
      if (Math.random() <= 0.02) {
        // Generate the coordinates of a random adjacent square by
        // generating an offset between [-1, 0, 1] for both the x and
        // y directions. To do this, we generate a number from 0-2 and then
        // subtract 1.
        const xOffset = Math.floor(Math.random() * 3) - 1;
        const yOffset = Math.floor(Math.random() * 3) - 1;
        // Make sure we aren't trying to spawn on the same tile as us
        if (xOffset !== 0 || yOffset !== 0) {
          // Check if we can actually spawn at that location, and if so
          // then we grow!
          if (this.getMap().isEmptyFloor(this.getX() + xOffset, this.getY() + yOffset, this.getZ())) {
            const entity = Game.EntityRepository.create('fungus');
            entity.setPosition(this.getX() + xOffset, this.getY() + yOffset, this.getZ());
            this.getMap().addEntity(entity);
            this.growthsRemaining--;
            // Send a message nearby!
            Game.sendMessageNearby(
              this.getMap(),
              entity.getX(),
              entity.getY(),
              entity.getZ(),
              'The fungus is spreading!'
            );
          }
        }
      }
    }
  }
};

// This signifies our entity can attack basic destructible enities
Game.EntityMixins.Attacker = {
  name: 'Attacker',
  groupName: 'Attacker',
  init(template) {
    this.attackValue = template.attackValue || 1;
  },
  getAttackValue() {
    let modifier = 0;
    // If we can equip items, then have to take into
    // consideration weapon and armor
    if (this.hasMixin(Game.EntityMixins.Equipper)) {
      if (this.getWeapon()) {
        modifier += this.getWeapon().getAttackValue();
      }
      if (this.getArmor()) {
        modifier += this.getArmor().getAttackValue();
      }
    }
    return this.attackValue + modifier;
  },
  increaseAttackValue(value) {
    // If no value was passed, default to 2.
    value = value || 2;
    // Add to the attack value.
    this.attackValue += value;
    Game.sendMessage(this, 'You look stronger!');
  },
  attack(target) {
    // If the target is destructible, calculate the damage
    // based on attack and defense value
    if (target.hasMixin('Destructible')) {
      const attack = this.getAttackValue();
      const defense = target.getDefenseValue();
      const max = Math.max(0, attack - defense);
      const damage = 1 + Math.floor(Math.random() * max);

      Game.sendMessage(this, 'You strike the %s for %d damage!', [target.getName(), damage]);
      Game.sendMessage(target, 'The %s strikes you for %d damage!', [this.getName(), damage]);

      target.takeDamage(this, damage);
    }
  }
};

// This mixin signifies an entity can take damage and be destroyed
Game.EntityMixins.Destructible = {
  name: 'Destructible',
  init(template) {
    this.maxHp = template.maxHp || 10;
    // We allow taking in health from the template incase we want
    // the entity to start with a different amount of HP than the
    // max specified.
    this.hp = template.hp || this.maxHp;
    this.defenseValue = template.defenseValue || 0;
  },
  getDefenseValue() {
    let modifier = 0;
    // If we can equip items, then have to take into
    // consideration weapon and armor
    if (this.hasMixin(Game.EntityMixins.Equipper)) {
      if (this.getWeapon()) {
        modifier += this.getWeapon().getDefenseValue();
      }
      if (this.getArmor()) {
        modifier += this.getArmor().getDefenseValue();
      }
    }
    return this.defenseValue + modifier;
  },
  getHp() {
    return this.hp;
  },
  getMaxHp() {
    return this.maxHp;
  },
  setHp(hp) {
    this.hp = hp;
  },
  increaseDefenseValue(value) {
    // If no value was passed, default to 2.
    value = value || 2;
    // Add to the defense value.
    this.defenseValue += value;
    Game.sendMessage(this, 'You look tougher!');
  },
  increaseMaxHp(value) {
    // If no value was passed, default to 10.
    value = value || 10;
    // Add to both max HP and HP.
    this.maxHp += value;
    this.hp += value;
    Game.sendMessage(this, 'You look healthier!');
  },
  takeDamage(attacker, damage) {
    this.hp -= damage;
    // If have 0 or less HP, then remove ourseles from the map
    if (this.hp <= 0) {
      Game.sendMessage(attacker, 'You kill the %s!', [this.getName()]);
      // Raise events
      this.raiseEvent('onDeath', attacker);
      attacker.raiseEvent('onKill', this);
      this.kill();
    }
  },
  listeners: {
    onGainLevel() {
      // Heal the entity.
      this.setHp(this.getMaxHp());
    }
  }
};

Game.EntityMixins.MessageRecipient = {
  name: 'MessageRecipient',
  init(template) {
    this.messages = [];
  },
  receiveMessage(message) {
    this.messages.push(message);
  },
  getMessages() {
    return this.messages;
  },
  clearMessages() {
    this.messages = [];
  }
};

// This signifies our entity posseses a field of vision of a given radius.
Game.EntityMixins.Sight = {
  name: 'Sight',
  groupName: 'Sight',
  init(template) {
    this.sightRadius = template.sightRadius || 5;
  },
  getSightRadius() {
    return this.sightRadius;
  },
  increaseSightRadius(value) {
    // If no value was passed, default to 1.
    value = value || 1;
    // Add to sight radius.
    this.sightRadius += value;
    Game.sendMessage(this, 'You are more aware of your surroundings!');
  },
  canSee(entity) {
    // If not on the same map or on different floors, then exit early
    if (!entity || this.map !== entity.getMap() || this.z !== entity.getZ()) {
      return false;
    }

    const otherX = entity.getX();
    const otherY = entity.getY();

    // If we're not in a square field of view, then we won't be in a real
    // field of view either.
    if (
      (otherX - this.x) * (otherX - this.x) + (otherY - this.y) * (otherY - this.y) >
      this.sightRadius * this.sightRadius
    ) {
      return false;
    }

    // Compute the FOV and check if the coordinates are in there.
    let found = false;
    this.getMap()
      .getFov(this.getZ())
      .compute(this.getX(), this.getY(), this.getSightRadius(), (x, y, radius, visibility) => {
        if (x === otherX && y === otherY) {
          found = true;
        }
      });
    return found;
  }
};
// Message sending functions
Game.sendMessage = function sendMessage(recipient, message, args) {
  // Make sure the recipient can receive the message
  // before doing any work.
  if (recipient.hasMixin(Game.EntityMixins.MessageRecipient)) {
    // If args were passed, then we format the message, else
    // no formatting is necessary
    if (args) {
      message = vsprintf(message, args);
    }
    recipient.receiveMessage(message);
  }
};
Game.sendMessageNearby = function sendMessageNearby(map, centerX, centerY, centerZ, message, args) {
  // If args were passed, then we format the message, else
  // no formatting is necessary
  if (args) {
    message = vsprintf(message, args);
  }
  // Get the nearby entities
  const entities = map.getEntitiesWithinRadius(centerX, centerY, centerZ, 5);
  // Iterate through nearby entities, sending the message if
  // they can receive it.
  for (let i = 0; i < entities.length; i++) {
    if (entities[i].hasMixin(Game.EntityMixins.MessageRecipient)) {
      entities[i].receiveMessage(message);
    }
  }
};

Game.EntityMixins.InventoryHolder = {
  name: 'InventoryHolder',
  init(template) {
    // Default to 10 inventory slots.
    const inventorySlots = template.inventorySlots || 10;
    // Set up an empty inventory.
    this.items = new Array(inventorySlots);
  },
  getItems() {
    return this.items;
  },
  getItem(i) {
    return this.items[i];
  },
  addItem(item) {
    // Try to find a slot, returning true only if we could add the item.
    for (let i = 0; i < this.items.length; i++) {
      if (!this.items[i]) {
        this.items[i] = item;
        return true;
      }
    }
    return false;
  },
  removeItem(i) {
    // If we can equip items, then make sure we unequip the item we are removing.
    if (this.items[i] && this.hasMixin(Game.EntityMixins.Equipper)) {
      this.unequip(this.items[i]);
    }
    // Simply clear the inventory slot.
    this.items[i] = null;
  },
  canAddItem() {
    // Check if we have an empty slot.
    for (let i = 0; i < this.items.length; i++) {
      if (!this.items[i]) {
        return true;
      }
    }
    return false;
  },
  pickupItems(indices) {
    // Allows the user to pick up items from the map, where indices is
    // the indices for the array returned by map.getItemsAt
    const mapItems = this.map.getItemsAt(this.getX(), this.getY(), this.getZ());
    let added = 0;
    // Iterate through all indices.
    for (let i = 0; i < indices.length; i++) {
      // Try to add the item. If our inventory is not full, then splice the
      // item out of the list of items. In order to fetch the right item, we
      // have to offset the number of items already added.
      if (this.addItem(mapItems[indices[i] - added])) {
        mapItems.splice(indices[i] - added, 1);
        added++;
      } else {
        // Inventory is full
        break;
      }
    }
    // Update the map items
    this.map.setItemsAt(this.getX(), this.getY(), this.getZ(), mapItems);
    // Return true only if we added all items
    return added === indices.length;
  },
  dropItem(i) {
    // Drops an item to the current map tile
    if (this.items[i]) {
      if (this.map) {
        this.map.addItem(this.getX(), this.getY(), this.getZ(), this.items[i]);
      }
      this.removeItem(i);
    }
  }
};

Game.EntityMixins.FoodConsumer = {
  name: 'FoodConsumer',
  init(template) {
    this.maxFullness = template.maxFullness || 1000;
    // Start halfway to max fullness if no default value
    this.fullness = template.fullness || this.maxFullness / 2;
    // Number of points to decrease fullness by every turn.
    this.fullnessDepletionRate = template.fullnessDepletionRate || 1;
  },
  addTurnHunger() {
    // Remove the standard depletion points
    this.modifyFullnessBy(-this.fullnessDepletionRate);
  },
  modifyFullnessBy(points) {
    this.fullness = this.fullness + points;
    if (this.fullness <= 0) {
      this.kill('You have died of starvation!');
    } else if (this.fullness > this.maxFullness) {
      this.kill('You choke and die!');
    }
  },
  getHungerState() {
    // Fullness points per percent of max fullness
    const perPercent = this.maxFullness / 100;
    // 5% of max fullness or less = starving
    if (this.fullness <= perPercent * 5) {
      return 'Starving';
      // 25% of max fullness or less = hungry
    } else if (this.fullness <= perPercent * 25) {
      return 'Hungry';
      // 95% of max fullness or more = oversatiated
    } else if (this.fullness >= perPercent * 95) {
      return 'Oversatiated';
      // 75% of max fullness or more = full
    } else if (this.fullness >= perPercent * 75) {
      return 'Full';
      // Anything else = not hungry
    }
    return 'Not Hungry';
  }
};

Game.EntityMixins.CorpseDropper = {
  name: 'CorpseDropper',
  init(template) {
    // Chance of dropping a cropse (out of 100).
    this.corpseDropRate = template.corpseDropRate || 100;
  },
  listeners: {
    onDeath(attacker) {
      // Check if we should drop a corpse.
      if (Math.round(Math.random() * 100) <= this.corpseDropRate) {
        // Create a new corpse item and drop it.
        this.map.addItem(
          this.getX(),
          this.getY(),
          this.getZ(),
          Game.ItemRepository.create('corpse', {
            name: `${this.name} corpse`,
            foreground: this.foreground
          })
        );
      }
    }
  }
};

Game.EntityMixins.Equipper = {
  name: 'Equipper',
  init(template) {
    this.weapon = null;
    this.armor = null;
  },
  wield(item) {
    this.weapon = item;
  },
  unwield() {
    this.weapon = null;
  },
  wear(item) {
    this.armor = item;
  },
  takeOff() {
    this.armor = null;
  },
  getWeapon() {
    return this.weapon;
  },
  getArmor() {
    return this.armor;
  },
  unequip(item) {
    // Helper function to be called before getting rid of an item.
    if (this.weapon === item) {
      this.unwield();
    }
    if (this.armor === item) {
      this.takeOff();
    }
  }
};

Game.EntityMixins.TaskActor = {
  name: 'TaskActor',
  groupName: 'Actor',
  init(template) {
    // Load tasks
    this.tasks = template.tasks || ['wander'];
  },
  act() {
    // Iterate through all our tasks
    for (let i = 0; i < this.tasks.length; i++) {
      if (this.canDoTask(this.tasks[i])) {
        // If we can perform the task, execute the function for it.
        this[this.tasks[i]]();
        return;
      }
    }
  },
  canDoTask(task) {
    if (task === 'hunt') {
      return this.hasMixin('Sight') && this.canSee(this.getMap().getPlayer());
    } else if (task === 'wander') {
      return true;
    }
    throw new Error(`Tried to perform undefined task ${task}`);
  },
  hunt() {
    const player = this.getMap().getPlayer();

    // If we are adjacent to the player, then attack instead of hunting.
    const offsets = Math.abs(player.getX() - this.getX()) + Math.abs(player.getY() - this.getY());
    if (offsets === 1) {
      if (this.hasMixin('Attacker')) {
        this.attack(player);
        return;
      }
    }

    // Generate the path and move to the first tile.
    const source = this;
    const z = source.getZ();
    const path = new ROT.Path.AStar(
      player.getX(),
      player.getY(),
      (x, y) => {
        // If an entity is present at the tile, can't move there.
        const entity = source.getMap().getEntityAt(x, y, z);
        if (entity && entity !== player && entity !== source) {
          return false;
        }
        return source
          .getMap()
          .getTile(x, y, z)
          .isWalkable();
      },
      { topology: 4 }
    );
    // Once we've gotten the path, we want to move to the second cell that is
    // passed in the callback (the first is the entity's strting point)
    let count = 0;
    path.compute(source.getX(), source.getY(), (x, y) => {
      if (count === 1) {
        source.tryMove(x, y, z);
      }
      count++;
    });
  },
  wander() {
    // Flip coin to determine if moving by 1 in the positive or negative direction
    const moveOffset = Math.round(Math.random()) === 1 ? 1 : -1;
    // Flip coin to determine if moving in x direction or y direction
    if (Math.round(Math.random()) === 1) {
      this.tryMove(this.getX() + moveOffset, this.getY(), this.getZ());
    } else {
      this.tryMove(this.getX(), this.getY() + moveOffset, this.getZ());
    }
  }
};

Game.EntityMixins.ExperienceGainer = {
  name: 'ExperienceGainer',
  init(template) {
    this.level = template.level || 1;
    this.experience = template.experience || 0;
    this.statPointsPerLevel = template.statPointsPerLevel || 1;
    this.statPoints = 0;
    // Determine what stats can be levelled up.
    this.statOptions = [];
    if (this.hasMixin('Attacker')) {
      this.statOptions.push(['Increase attack value', this.increaseAttackValue]);
    }
    if (this.hasMixin('Destructible')) {
      this.statOptions.push(['Increase defense value', this.increaseDefenseValue]);
      this.statOptions.push(['Increase max health', this.increaseMaxHp]);
    }
    if (this.hasMixin('Sight')) {
      this.statOptions.push(['Increase sight range', this.increaseSightRadius]);
    }
  },
  getLevel() {
    return this.level;
  },
  getExperience() {
    return this.experience;
  },
  getNextLevelExperience() {
    return this.level * this.level * 10;
  },
  getStatPoints() {
    return this.statPoints;
  },
  setStatPoints(statPoints) {
    this.statPoints = statPoints;
  },
  getStatOptions() {
    return this.statOptions;
  },
  giveExperience(points) {
    let statPointsGained = 0;
    let levelsGained = 0;
    // Loop until we've allocated all points.
    while (points > 0) {
      // Check if adding in the points will surpass the level threshold.
      if (this.experience + points >= this.getNextLevelExperience()) {
        // Fill our experience till the next threshold.
        const usedPoints = this.getNextLevelExperience() - this.experience;
        points -= usedPoints;
        this.experience += usedPoints;
        // Level up our entity!
        this.level++;
        levelsGained++;
        this.statPoints += this.statPointsPerLevel;
        statPointsGained += this.statPointsPerLevel;
      } else {
        // Simple case - just give the experience.
        this.experience += points;
        points = 0;
      }
    }
    // Check if we gained at least one level.
    if (levelsGained > 0) {
      Game.sendMessage(this, 'You advance to level %d.', [this.level]);
      this.raiseEvent('onGainLevel');
    }
  },
  listeners: {
    onKill(victim) {
      let exp = victim.getMaxHp() + victim.getDefenseValue();
      if (victim.hasMixin('Attacker')) {
        exp += victim.getAttackValue();
      }
      // Account for level differences
      if (victim.hasMixin('ExperienceGainer')) {
        exp -= (this.getLevel() - victim.getLevel()) * 3;
      }
      // Only give experience if more than 0.
      if (exp > 0) {
        this.giveExperience(exp);
      }
    }
  }
};

Game.EntityMixins.RandomStatGainer = {
  name: 'RandomStatGainer',
  groupName: 'StatGainer',
  onGainLevel() {
    const statOptions = this.getStatOptions();
    // Randomly select a stat option and execute the callback for each
    // stat point.
    while (this.getStatPoints() > 0) {
      // Call the stat increasing function with this as the context.
      statOptions.random()[1].call(this);
      this.setStatPoints(this.getStatPoints() - 1);
    }
  }
};

Game.EntityMixins.PlayerStatGainer = {
  name: 'PlayerStatGainer',
  groupName: 'StatGainer',
  onGainLevel() {
    // Setup the gain stat screen and show it.
    Game.Screen.gainStatScreen.setup(this);
    Game.Screen.playScreen.setSubScreen(Game.Screen.gainStatScreen);
  }
};

Game.EntityMixins.RandomStatGainer = {
  name: 'RandomStatGainer',
  groupName: 'StatGainer',
  listeners: {
    onGainLevel() {
      const statOptions = this.getStatOptions();
      // Randomly select a stat option and execute the callback for each
      // stat point.
      while (this.getStatPoints() > 0) {
        // Call the stat increasing function with this as the context.
        statOptions.random()[1].call(this);
        this.setStatPoints(this.getStatPoints() - 1);
      }
    }
  }
};

Game.EntityMixins.PlayerStatGainer = {
  name: 'PlayerStatGainer',
  groupName: 'StatGainer',
  listeners: {
    onGainLevel() {
      // Setup the gain stat screen and show it.
      Game.Screen.gainStatScreen.setup(this);
      Game.Screen.playScreen.setSubScreen(Game.Screen.gainStatScreen);
    }
  }
};

Game.EntityMixins.GiantZombieActor = Game.extend(Game.EntityMixins.TaskActor, {
  init(template) {
    // Call the task actor init with the right tasks.
    Game.EntityMixins.TaskActor.init.call(
      this,
      Game.extend(template, {
        tasks: ['growArm', 'spawnSlime', 'hunt', 'wander']
      })
    );
    // We only want to grow the arm once.
    this.hasGrownArm = false;
  },
  canDoTask(task) {
    // If we haven't already grown arm and HP <= 20, then we can grow.
    if (task === 'growArm') {
      return this.getHp() <= 20 && !this.hasGrownArm;
      // Spawn a slime only a 10% of turns.
    } else if (task === 'spawnSlime') {
      return Math.round(Math.random() * 100) <= 10;
      // Call parent canDoTask
    }
    return Game.EntityMixins.TaskActor.canDoTask.call(this, task);
  },
  growArm() {
    this.hasGrownArm = true;
    this.increaseAttackValue(5);
    // Send a message saying the zombie grew an arm.
    Game.sendMessageNearby(
      this.getMap(),
      this.getX(),
      this.getY(),
      this.getZ(),
      'An extra arm appears on the giant zombie!'
    );
  },
  spawnSlime() {
    // Generate a random position nearby.
    const xOffset = Math.floor(Math.random() * 3) - 1;
    const yOffset = Math.floor(Math.random() * 3) - 1;

    // Check if we can spawn an entity at that position.
    if (!this.getMap().isEmptyFloor(this.getX() + xOffset, this.getY() + yOffset, this.getZ())) {
      // If we cant, do nothing
      return;
    }
    // Create the entity
    const slime = Game.EntityRepository.create('slime');
    slime.setX(this.getX() + xOffset);
    slime.setY(this.getY() + yOffset);
    slime.setZ(this.getZ());
    this.getMap().addEntity(slime);
  },
  listeners: {
    onDeath(attacker) {
      // Switch to win screen when killed!
      Game.switchScreen(Game.Screen.winScreen);
    }
  }
});
