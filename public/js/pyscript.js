const display = document.querySelector('#terminalDisplay');
const runButton = document.querySelector('#terminalRun');
const clearButton = document.querySelector('#terminalClear');
const killButton = document.querySelector('#terminalKill');

let scriptTag;
let resized = false;
let pyscriptLoaded = false;

document.addEventListener('py:ready', (event) => {
  terminalPanel.status.textContent = 'Running code...';
});

document.addEventListener('py:done', (event) => {
  terminalPanel.status.textContent = 'Execution completed.';
});

window.addEventListener('py:all-done', (event) => {
  pyscriptLoaded = true;

  if (main.configLoaded) {
    runButton.disabled = false;
  }
});

runButton.onclick = async () => {
  terminalPanel.status.textContent = 'Starting Python...';

  runButton.disabled = true;
  
  display.replaceChildren();

  filesManager.updateCurrentFile();

  const code = filesManager.files['main.py'];

  scriptTag = document.createElement('script');
  scriptTag.type = 'py';
  scriptTag.textContent = code;
  scriptTag.setAttribute('terminal', '');
  scriptTag.setAttribute('worker', '');

  // Load config
  let pyscriptConfig = {}
  if (main.config.pyscriptConfig) {
    pyscriptConfig = JSON.parse(JSON.stringify(main.config.pyscriptConfig));
  }

  if (pyscriptConfig.files == undefined) {
    pyscriptConfig.files = {};
  }

  // Add files from filesManager
  for (let filename in filesManager.files) {
    const blob = new Blob([filesManager.files[filename]]);
    const blobURL = URL.createObjectURL(blob);

    pyscriptConfig.files[blobURL] = filename;
  }

  // Add files from zip archives
  Object.assign(pyscriptConfig.files, main.zipFiles);

  // Load config
  scriptTag.setAttribute('config', JSON.stringify(pyscriptConfig));
  
  display.appendChild(scriptTag);
  resized = true;
  
  runButton.disabled = false;
};

function fitTerminal() {
  const terminalTag = document.querySelector('py-terminal');
  if (scriptTag == undefined) {
    return;
  }
  if (scriptTag.terminal == undefined) {
    return;
  }
  if (terminalTag == undefined) {
    return;
  }

  if (resized) {
    const fitAddon = new FitAddon.FitAddon();
    scriptTag.terminal.loadAddon(fitAddon);
    fitAddon.fit();
    resized = false;
  }
}

setInterval(fitTerminal, 100);
window.addEventListener('resize', () => {
  resized = true;
});
