/* global Game */

Game.DynamicGlyph = function dynamicGlyph(properties) {
  properties = properties || {};
  // Call the glyph's construtor with our set of properties
  Game.Glyph.call(this, properties);
  // Instantiate any properties from the passed object
  this.name = properties.name || '';
  // Create an object which will keep track what mixins we have
  // attached to this entity based on the name property
  this.attachedMixins = {};
  // Create a similar object for groups
  this.attachedMixinGroups = {};
  // Set up an object for listeners
  this.listeners = {};
  // Setup the object's mixins
  const mixins = properties.mixins || [];
  for (let i = 0; i < mixins.length; i++) {
    // Copy over all properties from each mixin as long
    // as it's not the name or the init property. We
    // also make sure not to override a property that
    // already exists on the entity.
    for (const key in mixins[i]) {
      if (key != 'init' && key != 'name' && !this.hasOwnProperty(key)) {
        this[key] = mixins[i][key];
      }
    }
    // Add the name of this mixin to our attached mixins
    this.attachedMixins[mixins[i].name] = true;
    // If a group name is present, add it
    if (mixins[i].groupName) {
      this.attachedMixinGroups[mixins[i].groupName] = true;
    }
    // Add all of our listeners
    if (mixins[i].listeners) {
      for (const key in mixins[i].listeners) {
        // If we don't already have a key for this event in our listeners
        // array, add it.
        if (!this.listeners[key]) {
          this.listeners[key] = [];
        }
        // Add the listener.
        this.listeners[key].push(mixins[i].listeners[key]);
      }
    }
    // Finally call the init function if there is one
    if (mixins[i].init) {
      mixins[i].init.call(this, properties);
    }
  }
};
// Make dynamic glyphs inherit all the functionality from glyphs
Game.DynamicGlyph.extend(Game.Glyph);

Game.DynamicGlyph.prototype.hasMixin = function hasMixin(obj) {
  // Allow passing the mixin itself or the name / group name as a string
  if (typeof obj === 'object') {
    return this.attachedMixins[obj.name];
  }
  return this.attachedMixins[obj] || this.attachedMixinGroups[obj];
};

Game.DynamicGlyph.prototype.setName = function setName(name) {
  this.name = name;
};

Game.DynamicGlyph.prototype.getName = function getName() {
  return this.name;
};

Game.DynamicGlyph.prototype.describe = function describe() {
  return this.name;
};
Game.DynamicGlyph.prototype.describeA = function describeA(capitalize) {
  // Optional parameter to capitalize the a/an.
  const prefixes = capitalize ? ['A', 'An'] : ['a', 'an'];
  const string = this.describe();
  const firstLetter = string.charAt(0).toLowerCase();
  // If word starts by a vowel, use an, else use a. Note that this is not perfect.
  const prefix = 'aeiou'.indexOf(firstLetter) >= 0 ? 1 : 0;

  return `${prefixes[prefix]} ${string}`;
};
Game.DynamicGlyph.prototype.describeThe = function describeThe(capitalize) {
  const prefix = capitalize ? 'The' : 'the';
  return `${prefix} ${this.describe()}`;
};

Game.DynamicGlyph.prototype.raiseEvent = function raiseEvent(event, ...args) {
  // Make sure we have at least one listener, or else exit
  if (!this.listeners[event]) {
    return;
  }
  // Extract any arguments passed, removing the event name
  //  const args = Array.prototype.slice.call(arguments, 1);
  // Invoke each listener, with this entity as the context and the arguments
  for (let i = 0; i < this.listeners[event].length; i++) {
    this.listeners[event][i].apply(this, args);
  }
};
