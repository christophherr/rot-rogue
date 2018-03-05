/* global Game ROT vsprintf */

Game.Screen = {};

// Define our initial start screen
Game.Screen.startScreen = {
  enter() {
    console.log('Entered start screen.');
  },
  exit() {
    console.log('Exited start screen.');
  },
  render(display) {
    // Render our prompt to the screen
    display.drawText(1, 1, '%c{yellow}Roguelike Dungeon Crawler');
    display.drawText(1, 2, 'Press [Enter] to start!');
  },
  handleInput(inputType, inputData) {
    // When [Enter] is pressed, go to the play screen
    if (inputType === 'keydown') {
      if (inputData.keyCode === ROT.VK_RETURN) {
        Game.switchScreen(Game.Screen.playScreen);
      }
    }
  }
};

// Define our playing screen
Game.Screen.playScreen = {
  player: null,
  gameEnded: false,
  enter() {
    // Create a map based on our size parameters
    const width = 100;
    const height = 48;
    const depth = 6;
    // Create our map from the tiles and player
    this.player = new Game.Entity(Game.PlayerTemplate);
    const tiles = new Game.Builder(width, height, depth).getTiles();
    const map = new Game.Map.Cave(tiles, this.player);
    // Start the map's engine
    map.getEngine().start();
  },
  exit() {
    console.log('Exited play screen.');
  },
  render(display) {
    // Render subscreen if there is one
    if (this.subScreen) {
      this.subScreen.render(display);
      return;
    }
    const screenWidth = Game.getScreenWidth();
    const screenHeight = Game.getScreenHeight();
    // Make sure the x-axis doesn't go to the left of the left bound
    let topLeftX = Math.max(0, this.player.getX() - screenWidth / 2);
    // Make sure we still have enough space to fit an entire game screen
    topLeftX = Math.min(topLeftX, this.player.getMap().getWidth() - screenWidth);
    // Make sure the y-axis doesn't above the top bound
    let topLeftY = Math.max(0, this.player.getY() - screenHeight / 2);
    // Make sure we still have enough space to fit an entire game screen
    topLeftY = Math.min(topLeftY, this.player.getMap().getHeight() - screenHeight);
    // This object will keep track of all visible map cells
    const visibleCells = {};
    // Store this.player.getMap() and player's z to prevent losing it in callbacks
    const map = this.player.getMap();
    const currentDepth = this.player.getZ();
    // Find all visible cells and update the object
    map
      .getFov(currentDepth)
      .compute(this.player.getX(), this.player.getY(), this.player.getSightRadius(), (x, y, radius, visibility) => {
        visibleCells[`${x},${y}`] = true;
        // Mark cell as explored
        map.setExplored(x, y, currentDepth, true);
      });

    // Render the explored map cells
    for (let x = topLeftX; x < topLeftX + screenWidth; x++) {
      for (let y = topLeftY; y < topLeftY + screenHeight; y++) {
        if (map.isExplored(x, y, currentDepth)) {
          // Fetch the glyph for the tile and render it to the screen
          // at the offset position.
          let glyph = map.getTile(x, y, currentDepth);
          let foreground = glyph.getForeground();
          // If we are at a cell that is in the field of vision, we need
          // to check if there are items or entities.
          if (visibleCells[`${x},${y}`]) {
            // Check for items first, since we want to draw entities
            // over items.
            const items = map.getItemsAt(x, y, currentDepth);
            // If we have items, we want to render the top most item
            if (items) {
              glyph = items[items.length - 1];
            }
            // Check if we have an entity at the position
            if (map.getEntityAt(x, y, currentDepth)) {
              glyph = map.getEntityAt(x, y, currentDepth);
            }
            // Update the foreground color in case our glyph changed
            foreground = glyph.getForeground();
          } else {
            // Since the tile was previously explored but is not
            // visible, we want to change the foreground color to
            // dark gray.
            foreground = 'darkGray';
          }

          display.draw(x - topLeftX, y - topLeftY, glyph.getChar(), foreground, glyph.getBackground());
        }
      }
    }

    // Get the messages in the player's queue and render them
    const messages = this.player.getMessages();
    let messageY = 0;
    for (let i = 0; i < messages.length; i++) {
      // Draw each message, adding the number of lines
      messageY += display.drawText(0, messageY, `%c{white}%b{black}${messages[i]}`);
    }
    // Render player HP
    let stats = '%c{white}%b{black}';
    stats += vsprintf('HP: %d/%d L: %d XP: %d', [
      this.player.getHp(),
      this.player.getMaxHp(),
      this.player.getLevel(),
      this.player.getExperience()
    ]);
    display.drawText(0, screenHeight, stats);
    // Render the player hunger state
    const hungerState = this.player.getHungerState();
    display.drawText(screenWidth - hungerState.length, screenHeight, hungerState);
  },
  handleInput(inputType, inputData) {
    // Handle subscreen input if there is one
    if (this.subScreen) {
      this.subScreen.handleInput(inputType, inputData);
      return;
    }
    if (inputType === 'keydown') {
      // Movement
      if (inputData.keyCode === ROT.VK_LEFT) {
        this.move(-1, 0, 0);
      } else if (inputData.keyCode === ROT.VK_RIGHT) {
        this.move(1, 0, 0);
      } else if (inputData.keyCode === ROT.VK_UP) {
        this.move(0, -1, 0);
      } else if (inputData.keyCode === ROT.VK_DOWN) {
        this.move(0, 1, 0);
      } else if (inputData.keyCode === ROT.VK_I) {
        // Show the inventory screen
        this.showItemsSubScreen(Game.Screen.inventoryScreen, this.player.getItems(), 'You are not carrying anything.');
        return;
      } else if (inputData.keyCode === ROT.VK_D) {
        // Show the drop screen
        this.showItemsSubScreen(Game.Screen.dropScreen, this.player.getItems(), 'You have nothing to drop.');
        return;
      } else if (inputData.keyCode === ROT.VK_E) {
        // Show the drop screen
        this.showItemsSubScreen(Game.Screen.eatScreen, this.player.getItems(), 'You have nothing to eat.');
        return;
      } else if (inputData.keyCode === ROT.VK_W) {
        if (inputData.shiftKey) {
          // Show the wear screen
          this.showItemsSubScreen(Game.Screen.wearScreen, this.player.getItems(), 'You have nothing to wear.');
        } else {
          // Show the wield screen
          this.showItemsSubScreen(Game.Screen.wieldScreen, this.player.getItems(), 'You have nothing to wield.');
        }
        return;
      } else if (inputData.keyCode === ROT.VK_COMMA) {
        const items = this.player.getMap().getItemsAt(this.player.getX(), this.player.getY(), this.player.getZ());
        // If there is only one item, directly pick it up
        if (items && items.length === 1) {
          const item = items[0];
          if (this.player.pickupItems([0])) {
            Game.sendMessage(this.player, 'You pick up %s.', [item.describeA()]);
          } else {
            Game.sendMessage(this.player, 'Your inventory is full! Nothing was picked up.');
          }
        } else {
          this.showItemsSubScreen(Game.Screen.pickupScreen, items, 'There is nothing here to pick up.');
        }
      } else {
        // Not a valid key
        return;
      }
      // Unlock the engine
      this.player
        .getMap()
        .getEngine()
        .unlock();
    } else if (inputType === 'keypress') {
      const keyChar = String.fromCharCode(inputData.charCode);
      if (keyChar === '>') {
        this.move(0, 0, 1);
      } else if (keyChar === '<') {
        this.move(0, 0, -1);
      } else {
        // Not a valid key
        return;
      }
      // Unlock the engine
      this.player
        .getMap()
        .getEngine()
        .unlock();
    }
  },
  move(dX, dY, dZ) {
    const newX = this.player.getX() + dX;
    const newY = this.player.getY() + dY;
    const newZ = this.player.getZ() + dZ;
    // Try to move to the new cell
    this.player.tryMove(newX, newY, newZ, this.player.getMap());
  },
  setGameEnded(gameEnded) {
    this.gameEnded = gameEnded;
  },
  setSubScreen(subScreen) {
    this.subScreen = subScreen;
    // Refresh screen on changing the subscreen
    Game.refresh();
  },
  showItemsSubScreen(subScreen, items, emptyMessage) {
    if (items && subScreen.setup(this.player, items) > 0) {
      this.setSubScreen(subScreen);
    } else {
      Game.sendMessage(this.player, emptyMessage);
      Game.refresh();
    }
  }
};

// Define our winning screen
Game.Screen.winScreen = {
  enter() {
    console.log('Entered the win screen.');
  },
  exit() {
    console.log('Exited the win screen.');
  },
  render(display) {
    // Render our prompt to the screen
    for (let i = 0; i < 22; i++) {
      // Generate random background colors
      const r = Math.round(Math.random() * 255);
      const g = Math.round(Math.random() * 255);
      const b = Math.round(Math.random() * 255);
      const background = ROT.Color.toRGB([r, g, b]);
      display.drawText(2, i + 1, `%b{${background}}You win!`);
    }
  },
  handleInput(inputType, inputData) {
    // Nothing to do here
  }
};

// Define our winning screen
Game.Screen.loseScreen = {
  enter() {
    console.log('Entered lose screen.');
  },
  exit() {
    console.log('Exited lose screen.');
  },
  render(display) {
    // Render our prompt to the screen
    for (let i = 0; i < 22; i++) {
      display.drawText(2, i + 1, '%b{red}You lose! :(');
    }
  },
  handleInput(inputType, inputData) {
    // Nothing to do here
  }
};

Game.Screen.ItemListScreen = function itemListScreen(template) {
  // Set up based on the template
  this.caption = template.caption;
  this.okFunction = template.ok;
  // By default, we use the identity function
  this.isAcceptableFunction =
    template.isAcceptable ||
    function(x) {
      return x;
    };
  // Whether the user can select items at all.
  this.canSelectItem = template.canSelect;
  // Whether the user can select multiple items.
  this.canSelectMultipleItems = template.canSelectMultipleItems;
  // Whether a 'no item' option should appear.
  this.hasNoItemOption = template.hasNoItemOption;
};

Game.Screen.ItemListScreen.prototype.setup = function setup(player, items) {
  this.player = player;
  // Should be called before switching to the screen.
  let count = 0;
  // Iterate over each item, keeping only the aceptable ones and counting
  // the number of acceptable items.
  const that = this;
  this.items = items.map(item => {
    // Transform the item into null if it's not acceptable
    if (that.isAcceptableFunction(item)) {
      count++;
      return item;
    }
    return null;
  });
  // Clean set of selected indices
  this.selectedIndices = {};
  return count;
};

Game.Screen.ItemListScreen.prototype.render = function render(display) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  // Render the caption in the top row
  display.drawText(0, 0, this.caption);
  // Render the no item row if enabled
  if (this.hasNoItemOption) {
    display.drawText(0, 1, '0 - no item');
  }
  let row = 0;
  for (let i = 0; i < this.items.length; i++) {
    // If we have an item, we want to render it.
    if (this.items[i]) {
      // Get the letter matching the item's index
      const letter = letters.substring(i, i + 1);
      // If we have selected an item, show a +, else show a dash between
      // the letter and the item's name.
      const selectionState = this.canSelectItem && this.canSelectMultipleItems && this.selectedIndices[i] ? '+' : '-';
      // Check if the item is worn or wielded
      let suffix = '';
      if (this.items[i] === this.player.getArmor()) {
        suffix = ' (wearing)';
      } else if (this.items[i] === this.player.getWeapon()) {
        suffix = ' (wielding)';
      }
      // Render at the correct row and add 2.
      display.drawText(0, 2 + row, `${letter} ${selectionState} ${this.items[i].describe()} ${suffix}`);
      row++;
    }
  }
};

Game.Screen.ItemListScreen.prototype.executeOkFunction = function executeOkFunction() {
  // Gather the selected items.
  const selectedItems = {};
  for (const key in this.selectedIndices) {
    selectedItems[key] = this.items[key];
  }
  // Switch back to the play screen.
  Game.Screen.playScreen.setSubScreen(undefined);
  // Call the OK function and end the player's turn if it return true.
  if (this.okFunction(selectedItems)) {
    this.player
      .getMap()
      .getEngine()
      .unlock();
  }
};
Game.Screen.ItemListScreen.prototype.handleInput = function handleInput(inputType, inputData) {
  if (inputType === 'keydown') {
    // If the user hit escape, hit enter and can't select an item, or hit
    // enter without any items selected, simply cancel out
    if (
      inputData.keyCode === ROT.VK_ESCAPE ||
      (inputData.keyCode === ROT.VK_RETURN && (!this.canSelectItem || Object.keys(this.selectedIndices).length === 0))
    ) {
      Game.Screen.playScreen.setSubScreen(undefined);
      // Handle pressing return when items are selected
    } else if (inputData.keyCode === ROT.VK_RETURN) {
      this.executeOkFunction();
      // Handle pressing zero when 'no item' selection is enabled
    } else if (this.canSelectItem && this.hasNoItemOption && inputData.keyCode === ROT.VK_0) {
      this.selectedIndices = {};
      this.executeOkFunction();
      // Handle pressing a letter if we can select
    } else if (this.canSelectItem && inputData.keyCode >= ROT.VK_A && inputData.keyCode <= ROT.VK_Z) {
      // Check if it maps to a valid item by subtracting 'a' from the character
      // to know what letter of the alphabet we used.
      const index = inputData.keyCode - ROT.VK_A;
      if (this.items[index]) {
        // If multiple selection is allowed, toggle the selection status, else
        // select the item and exit the screen
        if (this.canSelectMultipleItems) {
          if (this.selectedIndices[index]) {
            delete this.selectedIndices[index];
          } else {
            this.selectedIndices[index] = true;
          }
          // Redraw screen
          Game.refresh();
        } else {
          this.selectedIndices[index] = true;
          this.executeOkFunction();
        }
      }
    }
  }
};

Game.Screen.inventoryScreen = new Game.Screen.ItemListScreen({
  caption: 'Inventory',
  canSelect: false
});

Game.Screen.pickupScreen = new Game.Screen.ItemListScreen({
  caption: 'Choose the items you wish to pickup',
  canSelect: true,
  canSelectMultipleItems: true,
  ok(selectedItems) {
    // Try to pick up all items, messaging the player if they couldn't all be
    // picked up.
    if (!this.player.pickupItems(Object.keys(selectedItems))) {
      Game.sendMessage(this.player, 'Your inventory is full! Not all items were picked up.');
    }
    return true;
  }
});

Game.Screen.dropScreen = new Game.Screen.ItemListScreen({
  caption: 'Choose the item you wish to drop',
  canSelect: true,
  canSelectMultipleItems: false,
  ok(selectedItems) {
    // Drop the selected item
    this.player.dropItem(Object.keys(selectedItems)[0]);
    return true;
  }
});

Game.Screen.eatScreen = new Game.Screen.ItemListScreen({
  caption: 'Choose the item you wish to eat',
  canSelect: true,
  canSelectMultipleItems: false,
  isAcceptable(item) {
    return item && item.hasMixin('Edible');
  },
  ok(selectedItems) {
    // Eat the item, removing it if there are no consumptions remaining.
    const key = Object.keys(selectedItems)[0];
    const item = selectedItems[key];
    Game.sendMessage(this.player, 'You eat %s.', [item.describeThe()]);
    item.eat(this.player);
    if (!item.hasRemainingConsumptions()) {
      this.player.removeItem(key);
    }
    return true;
  }
});

Game.Screen.wieldScreen = new Game.Screen.ItemListScreen({
  caption: 'Choose the item you wish to wield',
  canSelect: true,
  canSelectMultipleItems: false,
  hasNoItemOption: true,
  isAcceptable(item) {
    return item && item.hasMixin('Equippable') && item.isWieldable();
  },
  ok(selectedItems) {
    // Check if we selected 'no item'
    const keys = Object.keys(selectedItems);
    if (keys.length === 0) {
      this.player.unwield();
      Game.sendMessage(this.player, 'You are empty handed.');
    } else {
      // Make sure to unequip the item first in case it is the armor.
      const item = selectedItems[keys[0]];
      this.player.unequip(item);
      this.player.wield(item);
      Game.sendMessage(this.player, 'You are wielding %s.', [item.describeA()]);
    }
    return true;
  }
});

Game.Screen.wearScreen = new Game.Screen.ItemListScreen({
  caption: 'Choose the item you wish to wear',
  canSelect: true,
  canSelectMultipleItems: false,
  hasNoItemOption: true,
  isAcceptable(item) {
    return item && item.hasMixin('Equippable') && item.isWearable();
  },
  ok(selectedItems) {
    // Check if we selected 'no item'
    const keys = Object.keys(selectedItems);
    if (keys.length === 0) {
      this.player.unwield();
      Game.sendMessage(this.player, 'You are not wearing anthing.');
    } else {
      // Make sure to unequip the item first in case it is the weapon.
      const item = selectedItems[keys[0]];
      this.player.unequip(item);
      this.player.wear(item);
      Game.sendMessage(this.player, 'You are wearing %s.', [item.describeA()]);
    }
    return true;
  }
});

Game.Screen.gainStatScreen = {
  setup(entity) {
    // Must be called before rendering.
    this.entity = entity;
    this.options = entity.getStatOptions();
  },
  render(display) {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    display.drawText(0, 0, 'Choose a stat to increase: ');

    // Iterate through each of our options
    for (let i = 0; i < this.options.length; i++) {
      display.drawText(0, 2 + i, `${letters.substring(i, i + 1)} - ${this.options[i][0]}`);
    }

    // Render remaining stat points
    display.drawText(0, 4 + this.options.length, `Remaining points: ${this.entity.getStatPoints()}`);
  },
  handleInput(inputType, inputData) {
    if (inputType === 'keydown') {
      // If a letter was pressed, check if it matches to a valid option.
      if (inputData.keyCode >= ROT.VK_A && inputData.keyCode <= ROT.VK_Z) {
        // Check if it maps to a valid item by subtracting 'a' from the character
        // to know what letter of the alphabet we used.
        const index = inputData.keyCode - ROT.VK_A;
        if (this.options[index]) {
          // Call the stat increasing function
          this.options[index][1].call(this.entity);
          // Decrease stat points
          this.entity.setStatPoints(this.entity.getStatPoints() - 1);
          // If we have no stat points left, exit the screen, else refresh
          if (this.entity.getStatPoints() == 0) {
            Game.Screen.playScreen.setSubScreen(undefined);
          } else {
            Game.refresh();
          }
        }
      }
    }
  }
};
