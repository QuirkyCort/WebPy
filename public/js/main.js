var main = new function() {
  var self = this;

  const LOCALSTORAGE_SETTINGS = 'webPySettings';
  const LOCALSTORAGE_FS_MODIFIED = 'webPyModified';
  const LOCALSTORAGE_WHATS_NEW = 'webPyWhatsNew';
  const DEFAULT_CONFIG = {};

  this.settings;
  this.configLoaded = false;
  this.zipFiles = {};

  // Run on page load
  this.init = async function() {
    self.config = DEFAULT_CONFIG;
    self.$navs = $('nav li');
    self.$panels = $('.panels .panel');
    self.$fileMenu = $('.fileMenu');
    self.$viewMenu = $('.viewMenu');
    self.$helpMenu = $('.helpMenu');

    let settings = localStorage.getItem(LOCALSTORAGE_SETTINGS);
    if (settings) {
      self.settings = JSON.parse(settings);
    } else {
      self.settings = self.defaultSettings();
    }
    self.$navs.click(self.tabClicked);
    self.$fileMenu.click(self.toggleFileMenu);
    self.$viewMenu.click(self.toggleViewMenu);
    self.$helpMenu.click(self.toggleHelpMenu);

    self.loadConfigFromQuery();

    window.addEventListener('beforeunload', self.checkUnsaved);

    self.showWhatsNew();

    setInterval(self.saveSettingsToLocalStorage, 2 * 1000);
  };

  this.loadConfigFromQuery = async function() {
    const queryString = readGET('config');
    if (!queryString) {
      self.config = DEFAULT_CONFIG;
      self.configLoaded = true;
      return;
    }

    const configURL = decodeURIComponent(queryString);

    fetch(configURL)
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          toastMsg('Unable to fetch config file.')
        }
      })
      .then(data => {
        self.config = data;

        if (self.config.code) {
          self.fetchCode(self.config.code);
        }

        if (self.config.zipFiles) {
          self.fetchZipFiles(self.config.zipFiles);
        } else {
          self.configLoaded = true;
          if (pyscriptLoaded) {
            runButton.disabled = false;
          }
        }
      })
      .catch(error => {
        toastMsg('Error fetching config file: ' + error);
      });
  };

  this.fetchZipFiles = async function(urls) {
    try {
      for (let url of urls) {
        let response = await fetch(url);
        let zipBlob = await response.blob()
        let zip = await JSZip.loadAsync(zipBlob)

        for (let filename of Object.keys(zip.files)) {
          let file = zip.files[filename];
          if (!file.dir) {
            const fileBlob = await file.async('blob');
            const blobURL = URL.createObjectURL(fileBlob);
            self.zipFiles[blobURL] = filename;
          }
        };
      }
    } catch (error) {
      toastMsg('Error fetching zip files: ' + error);
    }

    self.configLoaded = true;
    if (pyscriptLoaded) {
      runButton.disabled = false;
    }

  };

  this.fetchCode = async function(url) {
    try {
        let response = await fetch(url);
        let zipBlob = await response.blob()
        await self.loadCodeFromComputerZip(zipBlob);
    } catch (error) {
      toastMsg('Error fetching code: ' + error);
    }
  };

  this.defaultSettings = function() {
    return {
    }
  };

  this.saveSettingsToLocalStorage = function() {
    localStorage.setItem(LOCALSTORAGE_SETTINGS, JSON.stringify(self.settings));
  };

  this.hiddenButtonDialog = function(title, body, reset) {
    let buttonsStr = '<button type="button" class="ok btn btn-success">OK</button>';
    if (typeof reset == 'function') {
      buttonsStr = '<button type="button" class="reset btn btn-warning">Reset Now</button>' + buttonsStr;
    }

    var $buttons = $(
      buttonsStr
    );

    let $dialog = dialog(title, body, $buttons);
    $dialog.$buttonsRow.addClass('hide');

    if (typeof reset == 'function') {
      $dialog.$buttonsRow.find('.reset').click(async function() {
        await reset();
        $dialog.close();
      });
    }
    $dialog.$buttonsRow.find('.ok').click(function() { $dialog.close(); });

    return $dialog;
  };

  // About page
  this.openAbout = function() {
    let $body = $(
      '<div class="about">' +
        '<div></div>' +
        '<h3>Credits</h3>' +
        '<p>Created by Cort @ <a href="https://aposteriori.com.sg" target="_blank">A Posteriori</a>.</p>' +
        '<p>This software would not have been possible without the great people behind:</p>' +
        '<ul>' +
          '<li><a href="https://github.com/microsoft/monaco-editor" target="_blank">Monaco Editor</a></li>' +
          '<li><a href="https://pyscript.net/" target="_blank">PyScript</a></li>' +
        '</ul>' +
        '<h3>Contact</h3>' +
        '<p>Please direct all complaints or requests to <a href="mailto:cort@aposteriori.com.sg">Cort</a>.</p>' +
        '<p>If you\'re in the market for STEM training, do consider <a href="https://aposteriori.com.sg" target="_blank">A Posteriori</a>.</p>' +
        '<h3>License</h3>' +
        '<p>GNU General Public License v3.0</p>' +
        '<p>WebPy is a Free and Open Source Software</p>' +
      '</div>'
    );

    let $buttons = $(
      '<button type="button" class="confirm btn-success">Ok</button>'
    );

    let $dialog = dialog('About', $body, $buttons);

    $buttons.click(function(){
      $dialog.close();
    });
  };

  // Open page in new tab
  this.openPage = function(url) {
    window.open(url, '_blank');
  };

  // Toggle view
  this.toggleViewMenu = function(e) {
    if ($('.viewMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      let menuItems = [
        {html: 'Loaded Packages', line: false, callback: self.loadedPackages},
        {html: 'Filesystem', line: true, callback: self.filesystemDisplay},
        {html: 'Zoom In (Ctrl + Scroll)', line: false, callback: self.zoomIn},
        {html: 'Zoom Out (Ctrl + Scroll)', line: false, callback: self.zoomOut},
        {html: 'Reset Zoom', line: false, callback: self.zoomReset},
      ];

      menuDropDown(self.$viewMenu, menuItems, {className: 'viewMenuDropDown'});
    }
  };

  this.loadedPackages = function(e) {
    let body = 'None';
    if (self.config.pyscriptConfig && self.config.pyscriptConfig.packages) {
      body = String(self.config.pyscriptConfig.packages);
    }

    acknowledgeDialog({
      title: 'Loaded Packages', 
      message: body
    });
  };

  this.filesystemDisplay = function(e) {
    let files = Object.keys(filesManager.files);
    files = files.concat(Object.values(main.zipFiles));
    if (main.config.pyscriptConfig && main.config.pyscriptConfig.files) {
      files = files.concat(Object.values(main.config.pyscriptConfig.files));
    }

    files.sort();

    let body = 'None';
    if (files.length > 0) {
      body = '<ul>';
      for (let f of files) {
        body += '<li>' + f + '</li>';
      }
      body += '</ul>';
    }

    acknowledgeDialog({
      title: 'Filesystem', 
      message: body
    });
  };

  this.zoomIn = function(e) {
    const action = editor.getAction("editor.action.fontZoomIn");
    if (action && action.isSupported()) {
        action.run();
    }
  };

  this.zoomOut = function(e) {
    const action = editor.getAction("editor.action.fontZoomOut");
    if (action && action.isSupported()) {
        action.run();
    }
  };

  this.zoomReset = function(e) {
    const action = editor.getAction("editor.action.fontZoomReset");
    if (action && action.isSupported()) {
        action.run();
    }
  };

  // Toggle help
  this.toggleHelpMenu = function(e) {
    if ($('.helpMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      let menuItems = [
        {html: 'Github', line: false, callback: function() { self.openPage('https://github.com/QuirkyCort/WebPy'); }},
        {html: 'URL Generator', line: false, callback: function() { self.openPage('genURL.html'); }},
        {html: 'What\'s New', line: false, callback: function() { self.showWhatsNew(true); }},
        {html: 'Privacy Policy', line: false, callback: function() { self.openPage('privacy.html'); }},
        {html: 'About', line: false, callback: self.openAbout },
      ];

      menuDropDown(self.$helpMenu, menuItems, {className: 'helpMenuDropDown'});
    }
  };

  // Toggle filemenu
  this.toggleFileMenu = function(e) {
    if ($('.fileMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      let menuItems = [
        {html: 'New', line: true, callback: self.newProgram},
        {html: 'Load code from your computer', line: false, callback: self.loadCodeFromComputer},
        {html: 'Save code to your computer', line: true, callback: self.saveCodeToComputer},
      ];

      menuDropDown(self.$fileMenu, menuItems, {className: 'fileMenuDropDown'});
    }
  };

  // New program
  this.newProgram = function() {
    confirmDialog('Starting a new program will cause all unsaved work to be lost.', function() {
      localStorage.setItem(LOCALSTORAGE_FS_MODIFIED, false);
      self.settings = self.defaultSettings();
      self.saveSettingsToLocalStorage();
      pythonPanel.clearEditor();
      filesManager.setToDefault();
    });
  };

  // Download to single file
  this.downloadFile = function(filename, content, mimetype) {
    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:' + mimetype + ';base64,' + content;
    hiddenElement.target = '_blank';
    hiddenElement.download = filename;
    hiddenElement.dispatchEvent(new MouseEvent('click'));
  }

  // Download to zip file
  this.downloadZipFile = function(filename, files) {
    var zip = new JSZip();
    for (let f in files) {
      zip.file(f, files[f]);
    }

    zip.generateAsync({
      type:'base64',
      compression: "DEFLATE"
    })
    .then(function(content) {
      self.downloadFile(filename + '.zip', content, 'application/zip');
    });
  }

  // save to computer
  this.saveCodeToComputer = async function() {
    self.saveSettingsToLocalStorage(); // filter project name and save settings
    filename = 'WebPy_Code';

    filesManager.updateCurrentFile();

    let files = {};
    for (let f in filesManager.files) {
      files[f] = filesManager.files[f];
    }
    files['settings.json'] = JSON.stringify(self.settings);

    self.downloadZipFile(filename, files);
  };

  // load from computer
  this.loadCodeFromComputer = function() {
    var hiddenElement = document.createElement('input');
    hiddenElement.type = 'file';
    hiddenElement.accept = 'application/zip,.zip';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
    hiddenElement.addEventListener('change', e => {self.loadCodeFromComputerZip(e.target.files[0])});
  };

  this.loadCodeFromComputerZip = function(blob) {
    async function loadFiles(zip) {
      filesManager.deleteAll();

      let filenames = [];
      zip.forEach(function(path, file) {
        filenames.push(path);
      });

      if (! filenames.includes('main.py')) {
        throw new Error('No main.py in zip archive');
      }

      self.settings = self.defaultSettings();

      for (let filename of filenames) {
        if (filename == 'settings.json') {
          await zip.file('settings.json').async('string')
            .then(function(content){
              self.settings = JSON.parse(content);
            });
        } else {
          await zip.file(filename).async('string')
            .then(function(content){
              filesManager.add(filename, content);
            });
        }
      }

      self.saveSettingsToLocalStorage();

      filesManager.unsaved = true;
      filesManager.saveLocalStorage();
      filesManager.select('main.py');
      self.tabClicked('navPython');
    }

    JSZip.loadAsync(blob)
      .then(loadFiles)
      .catch(error => showErrorModal('Invalid code file (Must be a zip file containing a "main.py")'));
  }

  // Check for unsaved changes
  this.checkUnsaved = function (event) {
    if (filesManager.unsaved) {
      event.preventDefault();
      event.returnValue = '';
    }
  };

  // Clicked on tab
  this.tabClicked = function(tabNav) {
    if (typeof tabNav == 'string') {
      var match = tabNav;
    } else {
      var match = $(this)[0].id;
    }

    function getPanelByNav(nav) {
      if (nav == 'navPython') {
        return pythonPanel;
      } else if (nav == 'navTerminal') {
        return terminalPanel;
      }
    };

    inActiveNav = self.$navs.siblings('.active').attr('id');
    inActive = getPanelByNav(inActiveNav);
    active = getPanelByNav(match);

    self.$navs.removeClass('active');
    $('#' + match).addClass('active');

    self.$panels.removeClass('active');
    self.$panels.siblings('[aria-labelledby="' + match + '"]').addClass('active');

    if ((inActive !== undefined) && (typeof inActive.onInActive == 'function')) {
      inActive.onInActive();
    }
    if (typeof active.onActive == 'function') {
      active.onActive();
    }
  };

  // Display what's new if not seen before
  this.showWhatsNew = function(forceShow=false) {
    let current = 20261001;
    let lastShown = localStorage.getItem(LOCALSTORAGE_WHATS_NEW);
    if (lastShown == null || parseInt(lastShown) < current || forceShow) {
      let options = {
        title: 'What\'s New',
        message:
        '<h3>6 Oct (Initial Release of WebPy)</h3>' +
        '<p>' +
          'Welcome new users!' +
        '</p>'
      }
      acknowledgeDialog(options, function(){
        localStorage.setItem(LOCALSTORAGE_WHATS_NEW, current);
      });
    }
  };

}

// Init class
main.init();
