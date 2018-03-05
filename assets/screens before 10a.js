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
  map: null,
  player: null,
  gameEnded: false,
  enter() {
    // Create a map based on our size parameters
    const width = 100;
    const height = 48;
    const depth = 6;
    // Create our map from the tiles and player
    const tiles = new Game.Builder(width, height, depth).getTiles();
    this.player = new Game.Entity(Game.PlayerTemplate);
    this.map = new Game.Map(tiles, this.player);
    // this.map = new Game.Map(map, this.player);
    // Start the map's engine
    this.map.getEngine().start();
  },
  exit() {
    console.log('Exited play screen.');
  },
  render(display) {
    const screenWidth = Game.getScreenWidth();
    const screenHeight = Game.getScreenHeight();
    // Make sure the x-axis doesn't go to the left of the left bound
    let topLeftX = Math.max(0, this.player.getX() - screenWidth / 2);
    // Make sure we still have enough space to fit an entire game screen
    topLeftX = Math.min(topLeftX, this.map.getWidth() - screenWidth);
    // Make sure the y-axis doesn't above the top bound
    let topLeftY = Math.max(0, this.player.getY() - screenHeight / 2);
    // Make sure we still have enough space to fit an entire game screen
    topLeftY = Math.min(topLeftY, this.map.getHeight() - screenHeight);
    // This object will keep track of all visible map cells
    const visibleCells = {};
    // Store this.map and player's z to prevent losing it in callbacks
    const map = this.map;
    const currentDepth = this.player.getZ();
    // Find all visible cells and update the object
    map
      .getFov(currentDepth)
      .compute(
        this.player.getX(),
        this.player.getY(),
        this.player.getSightRadius(),
        (x, y, radius, visibility) => {
          visibleCells[`${x},${y}`] = true;
          // Mark cell as explored
          map.setExplored(x, y, currentDepth, true);
        }
      );
    // Iterate through all visible map cells
    for (let x = topLeftX; x < topLeftX + screenWidth; x++) {
      for (let y = topLeftY; y < topLeftY + screenHeight; y++) {
        if (visibleCells[`${x},${y}`]) {
          // Fetch the glyph for the tile and render it to the screen
          // at the offset position.
          const tile = this.map.getTile(x, y, this.player.getZ());
          display.draw(
            x - topLeftX,
            y - topLeftY,
            tile.getChar(),
            tile.getForeground(),
            tile.getBackground()
          );
        }
      }
    }
    // Render the explored map cells
    for (let x = topLeftX; x < topLeftX + screenWidth; x++) {
      for (let y = topLeftY; y < topLeftY + screenHeight; y++) {
        if (map.isExplored(x, y, currentDepth)) {
          // Fetch the glyph for the tile and render it to the screen
          // at the offset position.
          const tile = this.map.getTile(x, y, currentDepth);
          // The foreground color becomes dark gray if the tile has been
          // explored but is not visible
          const foreground = visibleCells[`${x},${y}`]
            ? tile.getForeground()
            : 'darkGray';
          display.draw(
            x - topLeftX,
            y - topLeftY,
            tile.getChar(),
            foreground,
            tile.getBackground()
          );
        }
      }
    }
    // Render the entities
    const entitiesValue = Object.values(this.map.getEntities());
    entitiesValue.forEach((entity) => {
      if (
        entity.getX() >= topLeftX &&
        entity.getY() >= topLeftY &&
        entity.getX() < topLeftX + screenWidth &&
        entity.getY() < topLeftY + screenHeight &&
        entity.getZ() === this.player.getZ()
      ) {
        if (visibleCells[`${entity.getX()},${entity.getY()}`]) {
          display.draw(
            entity.getX() - topLeftX,
            entity.getY() - topLeftY,
            entity.getChar(),
            entity.getForeground(),
            entity.getBackground()
          );
        }
      }
    });

    // Get the messages in the player's queue and render them
    const messages = this.player.getMessages();
    let messageY = 0;
    for (let i = 0; i < messages.length; i++) {
      // Draw each message, adding the number of lines
      messageY += display.drawText(
        0,
        messageY,
        '%c{white}%b{black}' + messages[i]
      );
    }
    // Render player HP
    let stats = '%c{white}%b{black}';
    stats += vsprintf('HP: %d/%d ', [
      this.player.getHp(),
      this.player.getMaxHp()
    ]);
    display.drawText(0, screenHeight, stats);
  },
  handleInput(inputType, inputData) {
    // If the game is over, enter will bring the user to the losing screen.
    if (this.gameEnded) {
      if (inputType === 'keydown' && inputData.keyCode === ROT.VK_RETURN) {
        Game.switchScreen(Game.Screen.loseScreen);
      }
      // Return to make sure the user can't still play
      return;
    }
    if (inputType === 'keydown') {
      // If enter is pressed, go to the win screen
      // If escape is pressed, go to lose screen
      if (inputData.keyCode === ROT.VK_RETURN) {
        Game.switchScreen(Game.Screen.winScreen);
      } else if (inputData.keyCode === ROT.VK_ESCAPE) {
        Game.switchScreen(Game.Screen.loseScreen);
      } else {
        // Movement
        if (inputData.keyCode === ROT.VK_LEFT) {
          this.move(-1, 0, 0);
        } else if (inputData.keyCode === ROT.VK_RIGHT) {
          this.move(1, 0, 0);
        } else if (inputData.keyCode === ROT.VK_UP) {
          this.move(0, -1, 0);
        } else if (inputData.keyCode === ROT.VK_DOWN) {
          this.move(0, 1, 0);
        } else {
          // Not a valid key
          return;
        }
        // Unlock the engine
        this.map.getEngine().unlock();
      }
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
      this.map.getEngine().unlock();
    }
  },
  move(dX, dY, dZ) {
    const newX = this.player.getX() + dX;
    const newY = this.player.getY() + dY;
    const newZ = this.player.getZ() + dZ;
    // Try to move to the new cell
    this.player.tryMove(newX, newY, newZ, this.map);
  },
  setGameEnded(gameEnded) {
    this.gameEnded = gameEnded;
  }
};

// Define our winning screen
Game.Screen.winScreen = {
  enter() {
    console.log('Entered win screen.');
  },
  exit() {
    console.log('Exited win screen.');
  },
  render(display) {
    // Render our prompt to the screen
    for (let i = 0; i < 22; i++) {
      // Generate random background colors
      const r = Math.round(Math.random() * 255);
      const g = Math.round(Math.random() * 255);
      const b = Math.round(Math.random() * 255);
      const background = ROT.Color.toRGB([r, g, b]);
      display.drawText(2, i + 1, '%b{' + background + '}You win!');
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
