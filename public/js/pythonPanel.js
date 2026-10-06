var pythonPanel = new function() {
  var self = this;

  this.ignoreChange = 0;

  // Run on page load
  this.init = function() {
    self.$pythonCode = $('#monaco-editor');
    self.editor = window.editor

    self.loadPythonEditor();
  };

  // Increase font size
  this.zoomIn = function() {
    let currentSize = parseFloat(self.$pythonCode.css('font-size'));
    self.$pythonCode.css('font-size', currentSize * 1.25);
  };

  // Decrease font size
  this.zoomOut = function() {
    let currentSize = parseFloat(self.$pythonCode.css('font-size'));
    self.$pythonCode.css('font-size', currentSize * 0.8);
  };

  // Reset font size
  this.zoomReset = function() {
    self.$pythonCode.css('font-size', '120%');
  };

  // Runs when panel is made active
  this.onActive = function() {
    if (filesManager.modified == false) {
      self.loadPythonFromBlockly();
    }
    self.$pythonCode.removeClass('hide');
  };

  // Run when panel is inactive
  this.onInActive = function() {
    self.$pythonCode.addClass('hide');
  };

  // Load ace editor
  this.loadPythonEditor = function() {
    self.editor.onDidChangeModelContent(self.setModified);
  };

  // Update modified so that it gets saved
  this.setModified = function() {
    filesManager.unsaved = true;
  };

  this.clearEditor = function() {
    self.editor.setValue('');
  };
}

// Init class
pythonPanel.init();