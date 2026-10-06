var terminalPanel = new function() {
  var self = this;

  self.history = [];
  self.currentCmd = '';
  self.historyPos = -1;

  // Run on page load
  this.init = function() {
    self.display = document.getElementById('terminalDisplay');
    self.status = document.getElementById('terminalStatus');

    // self.term = new Terminal({
    //     cursorBlink: true,
    //     theme: { background: '#1e1e1e', foreground: '#f8f8f2' }
    // });
    // let fitAddon = new FitAddon.FitAddon();
    // self.term.loadAddon(fitAddon);
    // self.term.open(self.$display);
    // fitAddon.fit();
    // self.term.writeln('Loading Pyodide environment...');

    // self.needScrolling = false;
    // setInterval(self.scrollText, 100);

    // window.addEventListener("resize", () => {
    //   setTimeout(() => fitAddon.fit(), 50);
    // });

    // window.addEventListener("load", () => {
    //   setTimeout(() => fitAddon.fit(), 100);
    // });
  };


  // Runs when panel is made active
  this.onActive = function() {
  };

  // Run when panel is inactive
  this.onInActive = function() {
  };
}

// Init class
terminalPanel.init();