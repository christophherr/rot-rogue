/* global ROT */

const Game = {
  display: null,
  currentScreen: null,
  screenWidth: 80,
  screenHeight: 24,
  init() {
    // Any necessary initialization will go here.
    this.display = new ROT.Display({
      width: this.screenWidth,
      height: this.screenHeight + 1
    });
    // Create a helper function for binding to an event
    // and making it send it to the screen
    const game = this; // So that we don't lose this
    const bindEventToScreen = function bindEventToScreen(event) {
      window.addEventListener(event, (e) => {
        // When an event is received, send it to the
        // screen if there is one
        if (game.currentScreen !== null) {
          // Send the event type and data to the screen
          game.currentScreen.handleInput(event, e);
        }
      });
    };
    // Bind keyboard input events
    bindEventToScreen('keydown');
    // bindEventToScreen('keyup');
    bindEventToScreen('keypress');
  },
  getDisplay() {
    return this.display;
  },
  getScreenWidth() {
    return this.screenWidth;
  },
  getScreenHeight() {
    return this.screenHeight;
  },
  refresh() {
    // Clear the screen
    this.display.clear();
    // Render the screen
    this.currentScreen.render(this.display);
  },
  switchScreen(screen) {
    // If we had a screen before, notify it that we exited
    if (this.currentScreen !== null) {
      this.currentScreen.exit();
    }
    // Clear the display
    this.getDisplay().clear();
    // Update our current screen, notify it we entered
    // and then render it
    this.currentScreen = screen;
    if (!this.currentScreen !== null) {
      this.currentScreen.enter();
      this.refresh();
    }
  }
};

window.onload = function onload() {
  // Check if rot.js can work on this browser
  if (!ROT.isSupported()) {
    alert("The rot.js library isn't supported by your browser.");
  } else {
    // Initialize the game
    Game.init();
    // Add the container to our HTML page
    document.body.appendChild(Game.getDisplay().getContainer());
    // Load the start screen
    Game.switchScreen(Game.Screen.startScreen);
  }
};
