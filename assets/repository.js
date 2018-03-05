/* global Game */

// A repository has a name and a constructor. The constructor is used to create
// items in the repository.
Game.Repository = function gameRepository(name, actor) {
  this.name = name;
  this.templates = {};
  this.actor = actor;
  this.randomTemplates = {};
};

// Define a new named template.
Game.Repository.prototype.define = function define(name, template, options) {
  this.templates[name] = template;
  // Apply any options
  const disableRandomCreation = options && options.disableRandomCreation;
  if (!disableRandomCreation) {
    this.randomTemplates[name] = template;
  }
};

// Create an object based on a template.
Game.Repository.prototype.create = function create(name) {
  // Make sure there is a template with the given name.
  const template = this.templates[name];

  if (!template) {
    throw new Error(`No template named '${name}' in repository '${this.name}'`);
  }

  // Create the object, passing the template as an argument
  return new this.actor(template);
};

// Create an object based on a random template
Game.Repository.prototype.createRandom = function createRandom() {
  // Pick a random key and create an object based off of it.
  return this.create(Object.keys(this.templates).random());
};
