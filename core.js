/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true es5: true node: true devel: true */
/*globals document window */
define(function(require, exports, module) {
  'use strict';

  var Range = require("ace/range").Range
  var Editor = require("ace/editor").Editor
  var Renderer = require("ace/virtual_renderer").VirtualRenderer
  var UndoManager = require("ace/undomanager").UndoManager
  var EditSession = require("ace/edit_session").EditSession
  var theme = require('theme')
  var hub = require('plugin-hub/core'), meta = hub.meta, values = hub.values

  exports.name = 'ace-plug'
  exports.version = '0.0.1'
  exports.author = 'Irakli Gozalishvili <rfobic@gmail.com>'
  exports.description = 'Adapter plguin for Ace editor'
  exports.stability = 'unstable'

  var unbind = Function.call.bind(Function.bind, Function.call)
  var owns = unbind(Object.prototype.hasOwnProperty)

  var command = meta('Group command utilities', {})
  command.params = meta({
    description: 'Generates paramater signature'
  }, function params(signature) {
    var result = []

    if (Array.isArray(signature)) {
      result = signature.map(function(_, index) {
        var param = typeof(_) === 'string' ? { type: _ } : _
        param.name = String(index)
        return param
      })
    }

    if (typeof(signature) === 'number')
      while (signature) result.unshift({ name: signature -- })

    return result
  })
  command.make = meta({
    description: 'Makes a commonad from function'
  }, function make(env, name, f) {
    return {
      name: name,
      description: f.meta.description,
      params: command.params(f.meta.takes || f.length),
      exec: function execute(editor, params, context) {
        var args = []
        for (var index in params) args[index] = params[index]
        // TODO: Find a proper solution instead.
        if (~f.meta.takes.indexOf('editor'))
            args[f.meta.takes.indexOf('editor')] = editor
        if (~f.meta.takes.indexOf('env'))
            args[f.meta.takes.indexOf('env')] = env

        return f.apply(f, args)
      }
    }
  })
  command.plug = meta({
    description: 'Plugs in the command'
  }, function plug(env, name, f) {
    var commands = env.aceCommands
    if (f.meta) commands[name] = command.make(env, name, f)
    else commands[name] = Object.defineProperties(f, { name: { value: name }})
    return env.editor.commands.addCommand(commands[name])
  })
  command.unplug = meta({
    description: 'Unplugs given command'
  }, function unplug(env, name) {
    var command = env.aceCommands && env.aceCommands[name]
    return command && env.editor.commands.removeCommand(command)
  })

  function setup(window, container, editor) {
    var document = window.document
    function onResize() {
      container.style.width = (document.documentElement.clientWidth) + "px"
      container.style.height = (document.documentElement.clientHeight) + "px"
      editor.resize()
      editor.focus()
    }
    window.onresize = onResize
    onResize()
  }

  exports.onstartup = meta({
    description: 'Hook that registers all plugin commands & types'
  }, function onstartup(env, plugins) {
    var session = new EditSession('')
    var container = document.getElementById("editor")
    var editor = new Editor(new Renderer(container, theme))
    env.editor = editor
    env.aceCommands = Object.create(null)
    session.setUndoManager(new UndoManager())
    editor.setSession(session)

    setup(window, container, editor)

    editor.renderer.setHScrollBarAlwaysVisible(false)
    editor.setShowInvisibles(true)
    editor.renderer.setPadding(14)
    editor.session.setTabSize(2)
  })

  exports.onshutdown = meta({
    description: 'Hook that unregisters unplugged add-on commands & types'
  }, function onshutdown(env) {
    delete env.editor
  })

  exports['oncommand:plug'] = command.plug
  exports['oncommand:unplug'] = command.unplug

});
